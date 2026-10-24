import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentState extends Document {
  studentId: string;
  coins: number;
  streak: number;
  todayFocusMinutes: number;
  lastFocusDate: string | null;
  appliedRewardSessions: string[];
}

const studentStateSchema = new Schema<IStudentState>(
  {
    studentId: { type: String, required: true, unique: true },
    coins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    todayFocusMinutes: { type: Number, default: 0 },
    lastFocusDate: { type: String, default: null },
    // This per-session ledger makes reward application idempotent even if the
    // process crashes after updating StudentState but before marking a session complete.
    appliedRewardSessions: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const StudentState = mongoose.model<IStudentState>('StudentState', studentStateSchema);
