import mongoose, { Schema, Document } from 'mongoose';
import { SessionStatus } from '../types';

export interface IFocusSession extends Document {
  sessionId: string;
  studentId: string;
  targetMinutes: number;
  status: SessionStatus;
  startedAt?: Date;
  completedAt?: Date;
  failureReason?: 'give_up' | 'app_switch';
  versionVector: Record<string, number>;
}

const focusSessionSchema = new Schema<IFocusSession>(
  {
    sessionId: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    targetMinutes: { type: Number, required: true },
    status: {
      type: String,
      enum: ['RUNNING', 'SUCCESS', 'FAILED'],
      default: 'RUNNING',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    failureReason: { type: String, enum: ['give_up', 'app_switch'] },
    versionVector: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

focusSessionSchema.index({ studentId: 1 });

export const FocusSession = mongoose.model<IFocusSession>('FocusSession', focusSessionSchema);
