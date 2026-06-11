import mongoose, { Schema, Document } from 'mongoose';
import { EventType, VersionVector } from '../types';

export interface IEventStore extends Document {
  eventId: string;
  deviceId: string;
  entityId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  versionVector: VersionVector;
  createdAt: Date;
  studentId: string;
}

const eventStoreSchema = new Schema<IEventStore>(
  {
    eventId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true },
    entityId: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    versionVector: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, required: true },
    studentId: { type: String, required: true },
  },
  { timestamps: false }
);

eventStoreSchema.index({ studentId: 1, createdAt: 1 });

export const EventStore = mongoose.model<IEventStore>('EventStore', eventStoreSchema);
