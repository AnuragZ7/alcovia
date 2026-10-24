import mongoose, { Schema, Document } from 'mongoose';
import { FocusSuccessWebhookPayload } from '../integrations/n8n/types';

export type OutboxStatus = 'PENDING' | 'SENDING' | 'SENT';

export interface INotificationOutbox extends Document {
  sessionId: string;
  studentId: string;
  payload: FocusSuccessWebhookPayload;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationOutboxSchema = new Schema<INotificationOutbox>(
  {
    sessionId: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['PENDING', 'SENDING', 'SENT'], default: 'PENDING' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true, collection: 'notificationoutbox' }
);

notificationOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
export const NotificationOutbox = mongoose.model<INotificationOutbox>(
  'NotificationOutbox',
  notificationOutboxSchema
);
