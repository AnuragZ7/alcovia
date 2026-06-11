import mongoose, { Schema, Document } from 'mongoose';
import { TaskStatus } from '../types';

export interface ITask extends Document {
  taskId: string;
  chapterId: string;
  subjectId: string;
  title: string;
  status: TaskStatus;
  deleted: boolean;
  versionVector: Record<string, number>;
  studentId: string;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    taskId: { type: String, required: true, unique: true },
    chapterId: { type: String, required: true },
    subjectId: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'],
      default: 'NOT_STARTED',
    },
    deleted: { type: Boolean, default: false },
    versionVector: { type: Schema.Types.Mixed, default: {} },
    studentId: { type: String, required: true },
  },
  { timestamps: true }
);

taskSchema.index({ studentId: 1, subjectId: 1 });
taskSchema.index({ studentId: 1, chapterId: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
