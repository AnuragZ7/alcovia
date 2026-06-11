import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/indexedDb';
import { LogEntry } from '../types';
import { sanitizeActivityMessage } from '../utils/activityMessage';

const listeners = new Set<() => void>();

export function subscribeLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export async function addLog(
  message: string,
  level: LogEntry['level'] = 'info'
): Promise<void> {
  const db = await getDb();
  const entry: LogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  await db.put('logs', entry);
  notify();
}

export async function getLogs(limit = 100): Promise<LogEntry[]> {
  const db = await getDb();
  const all = await db.getAll('logs');
  const sorted = all
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);

  return Promise.all(
    sorted.map(async (entry) => ({
      ...entry,
      message: await sanitizeActivityMessage(entry.message),
    }))
  );
}
