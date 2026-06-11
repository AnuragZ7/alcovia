import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationsSent extends Document {
  sessionId: string;
  sentAt: Date;
}

const notificationsSentSchema = new Schema<INotificationsSent>(
  {
    sessionId: { type: String, required: true, unique: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'notificationssents' }
);

export const NotificationsSent = mongoose.model<INotificationsSent>(
  'NotificationsSent',
  notificationsSentSchema
);
