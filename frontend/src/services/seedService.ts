import { getDb } from '../db/indexedDb';
import { Task } from '../types';

const SEED_TASKS: Omit<Task, 'status' | 'versionVector'>[] = [
  { taskId: 't-alg-1', chapterId: 'ch-algebra', subjectId: 'sub-math', title: 'Linear Equations' },
  { taskId: 't-alg-2', chapterId: 'ch-algebra', subjectId: 'sub-math', title: 'Quadratic Equations' },
  { taskId: 't-alg-3', chapterId: 'ch-algebra', subjectId: 'sub-math', title: 'Polynomials' },
  { taskId: 't-cal-1', chapterId: 'ch-calculus', subjectId: 'sub-math', title: 'Limits' },
  { taskId: 't-cal-2', chapterId: 'ch-calculus', subjectId: 'sub-math', title: 'Derivatives' },
  { taskId: 't-mec-1', chapterId: 'ch-mechanics', subjectId: 'sub-physics', title: 'Newton Laws' },
  { taskId: 't-mec-2', chapterId: 'ch-mechanics', subjectId: 'sub-physics', title: 'Work & Energy' },
  { taskId: 't-thm-1', chapterId: 'ch-thermo', subjectId: 'sub-physics', title: 'Heat Transfer' },
  { taskId: 't-dsa-1', chapterId: 'ch-dsa', subjectId: 'sub-cs', title: 'Arrays & Linked Lists' },
  { taskId: 't-dsa-2', chapterId: 'ch-dsa', subjectId: 'sub-cs', title: 'Trees & Graphs' },
  { taskId: 't-net-1', chapterId: 'ch-networks', subjectId: 'sub-cs', title: 'OSI Model' },
  { taskId: 't-net-2', chapterId: 'ch-networks', subjectId: 'sub-cs', title: 'TCP/IP' },
];

export async function seedLocalData(studentId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.count('tasks');
  if (existing > 0) return;

  const tx = db.transaction(['tasks', 'studentState'], 'readwrite');
  for (const t of SEED_TASKS) {
    await tx.objectStore('tasks').put({
      ...t,
      status: 'NOT_STARTED',
      versionVector: {},
      deleted: false,
    });
  }
  await tx.objectStore('studentState').put({
    studentId,
    coins: 0,
    streak: 0,
    todayFocusMinutes: 0,
    lastFocusDate: null,
  });
  await tx.done;
}
