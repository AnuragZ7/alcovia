import mongoose, { Schema, Document } from 'mongoose';

export interface IProcessedSession extends Document {
  sessionId: string;
  studentId: string;
  processedAt: Date;
  coinsAwarded: number;
}

const processedSessionSchema = new Schema<IProcessedSession>(
  {
    sessionId: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    coinsAwarded: { type: Number, required: true },
  },
  { timestamps: false, collection: 'processedsessions' }
);

export const ProcessedSession = mongoose.model<IProcessedSession>(
  'ProcessedSession',
  processedSessionSchema
);
