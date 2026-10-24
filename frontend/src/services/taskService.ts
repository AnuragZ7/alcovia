import { getDb } from '../db/indexedDb';
import { createEvent } from './eventService';
import { addLog } from './logger';
import { requestAutoSync } from './autoSyncService';
import {
  Task,
  TaskStatus,
  Subject,
  Chapter,
  TASK_STATUS_PRIORITY,
  SUBJECT_NAMES,
  CHAPTER_NAMES,
  VersionVector,
} from '../types';

function isNewerOrEqual(incoming: VersionVector, existing: VersionVector): boolean {
  const devices = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  for (const d of devices) {
    if ((incoming[d] ?? 0) < (existing[d] ?? 0)) return false;
  }
  return true;
}

function mergeVectors(a: VersionVector, b: VersionVector): VersionVector {
  const merged = { ...a };
  for (const [k, v] of Object.entries(b)) {
    merged[k] = Math.max(merged[k] ?? 0, v);
  }
  return merged;
}

function isStrictlyNewer(incoming: VersionVector, existing: VersionVector): boolean {
  if (!isNewerOrEqual(incoming, existing)) return false;
  return JSON.stringify(incoming) !== JSON.stringify(existing);
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const tasks = await db.getAll('tasks');
  return tasks.filter((t) => !t.deleted);
}

export async function getSubjectsWithProgress(): Promise<Subject[]> {
  const tasks = await getAllTasks();
  const bySubject = new Map<string, Map<string, Task[]>>();

  for (const task of tasks) {
    if (!bySubject.has(task.subjectId)) bySubject.set(task.subjectId, new Map());
    const chapters = bySubject.get(task.subjectId)!;
    if (!chapters.has(task.chapterId)) chapters.set(task.chapterId, []);
    chapters.get(task.chapterId)!.push(task);
  }

  const subjects: Subject[] = [];

  for (const [subjectId, chapters] of bySubject) {
    const chapterList: Chapter[] = [];
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

    subjects.push({
      subjectId,
      name: SUBJECT_NAMES[subjectId] || subjectId,
      progress: subjectTotal === 0 ? 0 : Math.round((subjectDone / subjectTotal) * 100),
      chapters: chapterList,
    });
  }

  return subjects;
}

export async function updateTaskStatus(
  deviceId: string,
  studentId: string,
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  const db = await getDb();
  const task = await db.get('tasks', taskId);
  if (!task || task.deleted) throw new Error('Task not found');

  if (task.status === status) return task;

  task.status = status;
  const event = await createEvent(deviceId, studentId, taskId, 'TASK_STATUS_UPDATE', {
    taskId,
    status,
    subjectId: task.subjectId,
    chapterId: task.chapterId,
  });
  task.versionVector = mergeVectors(task.versionVector, event.versionVector);
  await db.put('tasks', task);
  const statusLabel = status.replace(/_/g, ' ').toLowerCase();
  await addLog(`Task "${task.title}" marked as ${statusLabel}`, 'info');
  requestAutoSync();

  return task;
}

export async function applyTaskEventFromSync(
  taskId: string,
  status: TaskStatus,
  versionVector: VersionVector,
  subjectId: string,
  chapterId: string,
  title?: string
): Promise<void> {
  const db = await getDb();
  let task = await db.get('tasks', taskId);

  if (!task) {
    task = {
      taskId,
      subjectId,
      chapterId,
      title: title || taskId,
      status,
      versionVector,
      deleted: false,
    };
    await db.put('tasks', task);
    return;
  }

  if (task.deleted) return;
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
  // Deterministic tie-break: concurrent DONE > IN_PROGRESS > NOT_STARTED.
  task.versionVector = mergeVectors(task.versionVector, versionVector);
  await db.put('tasks', task);
}

export async function applyTaskDeleteFromSync(
  taskId: string,
  versionVector: VersionVector
): Promise<void> {
  const db = await getDb();
  const task = await db.get('tasks', taskId);
  if (!task) return;
  task.deleted = true;
  task.versionVector = mergeVectors(task.versionVector, versionVector);
  await db.put('tasks', task);
}

export async function getTaskById(taskId: string): Promise<Task | undefined> {
  const db = await getDb();
  return db.get('tasks', taskId);
}
