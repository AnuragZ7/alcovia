import {
  getUnsyncedEvents,
  getAllEventIds,
  markEventsSynced,
  storeIncomingEvents,
} from './eventService';
import { getMeta, setMeta } from './metaService';
import { applyFocusEventFromSync } from './focusService';
import { applyTaskEventFromSync, applyTaskDeleteFromSync } from './taskService';
import { getDb } from '../db/indexedDb';
import { addLog } from './logger';
import { SyncEvent, StudentState } from '../types';

const API_BASE = '/api';

export function isNetworkAvailable(): boolean {
  return navigator.onLine;
}

export async function syncNow(): Promise<{ success: boolean; message: string }> {
  const meta = await getMeta();

  if (!meta.isOnline) {
    await addLog('Sync skipped — device is offline', 'warn');
    return { success: false, message: 'Device is offline' };
  }

  if (!isNetworkAvailable()) {
    await addLog('Sync skipped — no network', 'warn');
    return { success: false, message: 'No network connection' };
  }

  try {
    const unsynced = await getUnsyncedEvents();
    const knownEventIds = await getAllEventIds();

    await addLog(`Syncing ${unsynced.length} unsynced events...`, 'sync');

    const response = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: meta.deviceId,
        studentId: meta.studentId,
        events: unsynced.map(({ synced: _, ...e }) => e),
        knownEventIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      events: SyncEvent[];
      serverTime: string;
      studentState: StudentState;
    };

    await markEventsSynced(unsynced.map((e) => e.eventId));
    await storeIncomingEvents(data.events);

    for (const event of data.events) {
      await applyIncomingEvent(event);
    }

    if (data.studentState) {
      const db = await getDb();
      await db.put('studentState', data.studentState);
    }

    await setMeta({ lastSyncTime: data.serverTime });
    await addLog(
      `Sync complete — received ${data.events.length} events`,
      'sync'
    );

    return {
      success: true,
      message: `Synced ${unsynced.length} events, received ${data.events.length}`,
    };
  } catch (error) {
    let msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
      msg = 'Cannot reach backend — start backend (npm run dev) on port 3001';
    }
    await addLog(`Sync error: ${msg}`, 'error');
    return { success: false, message: msg };
  }
}

async function applyIncomingEvent(event: SyncEvent): Promise<void> {
  switch (event.eventType) {
    case 'FOCUS_SESSION_START':
      await applyFocusEventFromSync(event.eventType, event.payload, event.studentId);
      await addLog(
        `Focus session started (${event.payload.targetMinutes ?? '?'} min) — synced`,
        'sync'
      );
      break;
    case 'FOCUS_SESSION_COMPLETE':
      await applyFocusEventFromSync(event.eventType, event.payload, event.studentId);
      await addLog(
        `Focus session completed (${event.payload.targetMinutes ?? '?'} min) — synced`,
        'sync'
      );
      break;
    case 'FOCUS_SESSION_FAIL':
      await applyFocusEventFromSync(event.eventType, event.payload, event.studentId);
      await addLog(
        `Focus session failed (${event.payload.targetMinutes ?? '?'} min) — synced`,
        'sync'
      );
      break;
    case 'TASK_STATUS_UPDATE': {
      const taskId = event.payload.taskId as string;
      const status = event.payload.status as import('../types').TaskStatus;
      await applyTaskEventFromSync(
        taskId,
        status,
        event.versionVector,
        event.payload.subjectId as string,
        event.payload.chapterId as string
      );
      const { getTaskById } = await import('./taskService');
      const task = await getTaskById(taskId);
      const title = task?.title ?? 'Task';
      await addLog(
        `Task "${title}" marked as ${status.replace(/_/g, ' ').toLowerCase()} — synced`,
        'sync'
      );
      break;
    }
    case 'TASK_DELETE': {
      await applyTaskDeleteFromSync(event.entityId, event.versionVector);
      const { getTaskById } = await import('./taskService');
      const task = await getTaskById(event.entityId);
      const title = task?.title ?? 'Task';
      await addLog(`Task "${title}" removed — synced`, 'sync');
      break;
    }
  }
}

export async function resetAllData(studentId: string): Promise<void> {
  const meta = await getMeta();

  if (meta.isOnline && isNetworkAvailable()) {
    try {
      await fetch(`${API_BASE}/admin/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
    } catch {
      // continue with local reset
    }
  }

  const { clearAllData } = await import('../db/indexedDb');
  await clearAllData();
  const { seedLocalData } = await import('./seedService');
  await seedLocalData(studentId);
  await setMeta({ lastSyncTime: null });
  await addLog('All data reset', 'warn');
}

export async function generateConflict(deviceId: string, studentId: string): Promise<void> {
  const { getAllTasks } = await import('./taskService');
  const tasks = await getAllTasks();
  const inProgress = tasks.find((t) => t.status === 'IN_PROGRESS') || tasks[0];
  if (!inProgress) return;

  const { createEvent } = await import('./eventService');
  const { getDb } = await import('../db/indexedDb');

  await createEvent(deviceId, studentId, inProgress.taskId, 'TASK_STATUS_UPDATE', {
    taskId: inProgress.taskId,
    status: 'IN_PROGRESS',
    subjectId: inProgress.subjectId,
    chapterId: inProgress.chapterId,
  });

  const task = { ...inProgress, status: 'IN_PROGRESS' as const };
  const db = await getDb();
  await db.put('tasks', task);

  await addLog(
    `Conflict generated: ${inProgress.title} set to IN_PROGRESS locally`,
    'warn'
  );
}
