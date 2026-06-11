import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationLog extends Document {
  sessionId: string;
  studentId?: string;
  message: string;
  createdAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    sessionId: { type: String, required: true, index: true },
    studentId: { type: String },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'notificationlogs' }
);

notificationLogSchema.index({ createdAt: -1 });

export const NotificationLog = mongoose.model<INotificationLog>(
  'NotificationLog',
  notificationLogSchema
);
