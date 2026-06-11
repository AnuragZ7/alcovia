import { EventStore } from '../models/EventStore';
import { SyncEvent, SyncRequest, SyncResponse } from '../types';
import { applyEvent, storeEventIfNew } from './eventApplyService';
import { getStudentState } from './focusService';

export async function processSync(request: SyncRequest): Promise<SyncResponse> {
  const {
    deviceId,
    studentId,
    events = [],
    knownEventIds = [],
  } = request;

  const sortedIncoming = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const event of sortedIncoming) {
    const isNew = await storeEventIfNew(event);
    if (isNew) {
      await applyEvent(event);
    }
  }

  const knownSet = new Set(knownEventIds);
  for (const event of sortedIncoming) {
    knownSet.add(event.eventId);
  }

  const allServerEvents = await EventStore.find({ studentId })
    .sort({ createdAt: 1 })
    .lean();

  const missingEvents: SyncEvent[] = allServerEvents
    .filter((e) => !knownSet.has(e.eventId))
    .map((e) => ({
      eventId: e.eventId,
      deviceId: e.deviceId,
      entityId: e.entityId,
      eventType: e.eventType as SyncEvent['eventType'],
      payload: e.payload,
      versionVector: e.versionVector,
      createdAt: e.createdAt.toISOString(),
      studentId: e.studentId,
    }));

  const studentState = await getStudentState(studentId);

  return {
    events: missingEvents,
    serverTime: new Date().toISOString(),
    studentState,
  };
}

export async function getAllEventsForStudent(studentId: string): Promise<SyncEvent[]> {
  const events = await EventStore.find({ studentId }).sort({ createdAt: 1 }).lean();
  return events.map((e) => ({
    eventId: e.eventId,
    deviceId: e.deviceId,
    entityId: e.entityId,
    eventType: e.eventType as SyncEvent['eventType'],
    payload: e.payload,
    versionVector: e.versionVector,
    createdAt: e.createdAt.toISOString(),
    studentId: e.studentId,
  }));
}
