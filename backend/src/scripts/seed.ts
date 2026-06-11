import mongoose from 'mongoose';
import { Task } from '../models/Task';
import { StudentState } from '../models/StudentState';
import { env } from '../config/env';

const SEED_TASKS = [
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

export async function seedDatabase(studentId: string = env.defaultStudentId): Promise<void> {
  const existing = await Task.countDocuments({ studentId });
  if (existing > 0) return;

  await Task.insertMany(
    SEED_TASKS.map((t) => ({
      ...t,
      studentId,
      status: 'NOT_STARTED',
      deleted: false,
      versionVector: {},
    }))
  );

  await StudentState.findOneAndUpdate(
    { studentId },
    { studentId, coins: 0, streak: 0, todayFocusMinutes: 0, lastFocusDate: null },
    { upsert: true }
  );

  console.log(`Seeded ${SEED_TASKS.length} tasks for student ${studentId}`);
}

async function main() {
  await mongoose.connect(env.mongoUri);
  await seedDatabase();
  await mongoose.disconnect();
  console.log('Seed complete');
}

if (require.main === module) {
  main().catch(console.error);
}
