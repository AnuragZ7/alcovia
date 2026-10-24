import { Task } from '../models/Task';
import { TaskStatus, TASK_STATUS_PRIORITY } from '../types';
import { VersionVector } from '../types';
import { isNewerOrEqual, isStrictlyNewer, mergeVectors } from '../utils/versionVector';

export interface SubjectWithProgress {
  subjectId: string;
  name: string;
  progress: number;
  chapters: ChapterWithProgress[];
}

export interface ChapterWithProgress {
  chapterId: string;
  name: string;
  progress: number;
  tasks: TaskDto[];
}

export interface TaskDto {
  taskId: string;
  chapterId: string;
  subjectId: string;
  title: string;
  status: TaskStatus;
}

const SUBJECT_NAMES: Record<string, string> = {
  'sub-math': 'Mathematics',
  'sub-physics': 'Physics',
  'sub-cs': 'Computer Science',
};

const CHAPTER_NAMES: Record<string, string> = {
  'ch-algebra': 'Algebra',
  'ch-calculus': 'Calculus',
  'ch-mechanics': 'Mechanics',
  'ch-thermo': 'Thermodynamics',
  'ch-dsa': 'Data Structures',
  'ch-networks': 'Networks',
};

export async function getTasksGrouped(studentId: string): Promise<SubjectWithProgress[]> {
  const tasks = await Task.find({ studentId, deleted: false }).lean();

  const bySubject = new Map<string, Map<string, TaskDto[]>>();

  for (const task of tasks) {
    if (!bySubject.has(task.subjectId)) {
      bySubject.set(task.subjectId, new Map());
    }
    const chapters = bySubject.get(task.subjectId)!;
    if (!chapters.has(task.chapterId)) {
      chapters.set(task.chapterId, []);
    }
    chapters.get(task.chapterId)!.push({
      taskId: task.taskId,
      chapterId: task.chapterId,
      subjectId: task.subjectId,
      title: task.title,
      status: task.status,
    });
  }

  const result: SubjectWithProgress[] = [];

  for (const [subjectId, chapters] of bySubject) {
    const chapterList: ChapterWithProgress[] = [];
    let subjectTotal = 0;
    let subjectDone = 0;

    for (const [chapterId, taskList] of chapters) {
      const done = taskList.filter((t) => t.status === 'DONE').length;
      const total = taskList.length;
      subjectTotal += total;
      subjectDone += done;

      chapterList.push({
        chapterId,
        name: CHAPTER_NAMES[chapterId] || chapterId,
        progress: total === 0 ? 0 : Math.round((done / total) * 100),
        tasks: taskList,
      });
    }

    result.push({
      subjectId,
      name: SUBJECT_NAMES[subjectId] || subjectId,
      progress: subjectTotal === 0 ? 0 : Math.round((subjectDone / subjectTotal) * 100),
      chapters: chapterList,
    });
  }

  return result;
}

export async function updateTaskStatus(
  taskId: string,
  studentId: string,
  status: TaskStatus,
  versionVector: VersionVector
) {
  const task = await Task.findOne({ taskId, studentId });
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  if (task.deleted) return task;

  const incomingDominates = isNewerOrEqual(versionVector, task.versionVector) &&
    isStrictlyNewer(versionVector, task.versionVector);
  const existingDominates = isNewerOrEqual(task.versionVector, versionVector) &&
    isStrictlyNewer(task.versionVector, versionVector);
  const concurrent = !incomingDominates && !existingDominates &&
    JSON.stringify(versionVector) !== JSON.stringify(task.versionVector);
  const incomingPriority = TASK_STATUS_PRIORITY[status];
  const existingPriority = TASK_STATUS_PRIORITY[task.status];

  if (incomingDominates || (concurrent && incomingPriority > existingPriority)) {
    task.status = status;
  }
  // Merge the causal knowledge even when the current status wins the tie-break.
  // This makes a later replay of either concurrent event deterministic.
  task.versionVector = mergeVectors(task.versionVector, versionVector);
  await task.save();

  return task;
}

export async function applyTaskDelete(
  taskId: string,
  studentId: string,
  versionVector: VersionVector
) {
  const task = await Task.findOne({ taskId, studentId });
  if (!task) return null;

  task.deleted = true;
  task.versionVector = mergeVectors(task.versionVector, versionVector);
  await task.save();
  return task;
}

export async function applyTaskStatusFromEvent(
  taskId: string,
  studentId: string,
  status: TaskStatus,
  versionVector: VersionVector,
  subjectId: string,
  chapterId: string,
  title?: string
) {
  let task = await Task.findOne({ taskId, studentId });

  if (!task) {
    task = await Task.create({
      taskId,
      studentId,
      subjectId,
      chapterId,
      title: title || taskId,
      status,
      versionVector,
      deleted: false,
    });
    return task;
  }

  if (task.deleted) return task;

  const incomingDominates = isNewerOrEqual(versionVector, task.versionVector) &&
    isStrictlyNewer(versionVector, task.versionVector);
  const existingDominates = isNewerOrEqual(task.versionVector, versionVector) &&
    isStrictlyNewer(task.versionVector, versionVector);
  const concurrent = !incomingDominates && !existingDominates &&
    JSON.stringify(versionVector) !== JSON.stringify(task.versionVector);
  const incomingPriority = TASK_STATUS_PRIORITY[status];
  const existingPriority = TASK_STATUS_PRIORITY[task.status];

  if (incomingDominates || (concurrent && incomingPriority > existingPriority)) {
    task.status = status;
  }
  task.versionVector = mergeVectors(task.versionVector, versionVector);
  await task.save();

  return task;
}
