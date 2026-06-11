import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  SyncEvent,
  Task,
  FocusSession,
  StudentState,
  AppMeta,
  LogEntry,
} from '../types';
import { ProcessedSessionLocal } from './schema';

export interface StudyAppDB extends DBSchema {
  events: {
    key: string;
    value: SyncEvent;
    indexes: { 'by-synced': number; 'by-created': string };
  };
  tasks: {
    key: string;
    value: Task;
  };
  focusSessions: {
    key: string;
    value: FocusSession;
  };
  studentState: {
    key: string;
    value: StudentState;
  };
  meta: {
    key: string;
    value: AppMeta | { key: string; vector: Record<string, number> };
  };
  logs: {
    key: string;
    value: LogEntry;
    indexes: { 'by-timestamp': string };
  };
  processedSessions: {
    key: string;
    value: ProcessedSessionLocal;
  };
}

let dbPromise: Promise<IDBPDatabase<StudyAppDB>> | null = null;
let currentDbName = '';

export function getDeviceLabel(): 'A' | 'B' {
  const stored = sessionStorage.getItem('study-app-device-label');
  return stored === 'B' ? 'B' : 'A';
}

export function setDeviceLabel(label: 'A' | 'B'): void {
  sessionStorage.setItem('study-app-device-label', label);
  dbPromise = null;
}

function getDbName(): string {
  return `study-app-device-${getDeviceLabel().toLowerCase()}`;
}

export function getDb(): Promise<IDBPDatabase<StudyAppDB>> {
  const dbName = getDbName();
  if (!dbPromise || currentDbName !== dbName) {
    currentDbName = dbName;
    dbPromise = openDB<StudyAppDB>(dbName, 1, {
      upgrade(db) {
        const events = db.createObjectStore('events', { keyPath: 'eventId' });
        events.createIndex('by-synced', 'synced');
        events.createIndex('by-created', 'createdAt');

        db.createObjectStore('tasks', { keyPath: 'taskId' });
        db.createObjectStore('focusSessions', { keyPath: 'sessionId' });
        db.createObjectStore('studentState', { keyPath: 'studentId' });
        db.createObjectStore('meta', { keyPath: 'key' });
        db.createObjectStore('processedSessions', { keyPath: 'sessionId' });

        const logs = db.createObjectStore('logs', { keyPath: 'id' });
        logs.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const stores = [
    'events',
    'tasks',
    'focusSessions',
    'studentState',
    'logs',
    'processedSessions',
  ] as const;
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  await tx.done;
}
