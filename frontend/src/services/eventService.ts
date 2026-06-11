import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/indexedDb';
import { incrementVersionVector } from './metaService';
import { EventType, SyncEvent } from '../types';

export async function createEvent(
  deviceId: string,
  studentId: string,
  entityId: string,
  eventType: EventType,
  payload: Record<string, unknown>
): Promise<SyncEvent> {
  const versionVector = await incrementVersionVector(deviceId);
  const event: SyncEvent = {
    eventId: uuidv4(),
    deviceId,
    entityId,
    eventType,
    payload,
    versionVector,
    createdAt: new Date().toISOString(),
    studentId,
    synced: false,
  };

  const db = await getDb();
  await db.put('events', event);
  return event;
}

export async function getUnsyncedEvents(): Promise<SyncEvent[]> {
  const db = await getDb();
  const all = await db.getAll('events');
  return all.filter((e) => !e.synced);
}

export async function getAllEventIds(): Promise<string[]> {
  const db = await getDb();
  const all = await db.getAll('events');
  return all.map((e) => e.eventId);
}

export async function markEventsSynced(eventIds: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('events', 'readwrite');
  for (const id of eventIds) {
    const event = await tx.store.get(id);
    if (event) {
      await tx.store.put({ ...event, synced: true });
    }
  }
  await tx.done;
}

export async function storeIncomingEvents(events: SyncEvent[]): Promise<void> {
  const db = await getDb();
  for (const event of events) {
    const existing = await db.get('events', event.eventId);
    if (!existing) {
      await db.put('events', { ...event, synced: true });
    }
  }
}

export async function getEventCount(): Promise<{ total: number; unsynced: number }> {
  const db = await getDb();
  const all = await db.getAll('events');
  return {
    total: all.length,
    unsynced: all.filter((e) => !e.synced).length,
  };
}
