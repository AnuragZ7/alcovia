import { getDb } from '../db/indexedDb';
import { EventType } from '../types';

async function taskTitle(taskId: string): Promise<string | null> {
  const db = await getDb();
  const task = await db.get('tasks', taskId);
  return task?.title ?? null;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}

async function formatEventCreated(eventType: string, entityId: string): Promise<string> {
  switch (eventType as EventType) {
    case 'TASK_STATUS_UPDATE': {
      const title = await taskTitle(entityId);
      return title ? `Task "${title}" updated` : 'Task status updated';
    }
    case 'TASK_DELETE': {
      const title = await taskTitle(entityId);
      return title ? `Task "${title}" removed` : 'Task removed';
    }
    case 'FOCUS_SESSION_START':
      return 'Focus session started';
    case 'FOCUS_SESSION_COMPLETE':
      return 'Focus session completed';
    case 'FOCUS_SESSION_FAIL':
      return 'Focus session failed';
    default:
      return 'Activity recorded';
  }
}

/**
 * Converts raw/internal log text into user-friendly Recent Activities copy.
 * Strips task IDs like [t-alg-2] and UUIDs from display.
 */
export async function sanitizeActivityMessage(message: string): Promise<string> {
  const eventCreated = message.match(/^Event created: (\w+) \[(.+)\]$/);
  if (eventCreated) {
    return formatEventCreated(eventCreated[1], eventCreated[2]);
  }

  const taskArrow = message.match(/^Task (.+) → (\w+)$/);
  if (taskArrow) {
    return `Task "${taskArrow[1]}" marked as ${formatStatus(taskArrow[2])}`;
  }

  const focusUuid = message.match(/^Focus session (completed|failed): [a-f0-9-]{36}$/i);
  if (focusUuid) {
    return `Focus session ${focusUuid[1]}`;
  }

  const bracketTaskId = message.match(/\[(t-[a-z0-9-]+)\]/i);
  if (bracketTaskId) {
    const title = await taskTitle(bracketTaskId[1]);
    if (title) {
      return message.replace(/\[(t-[a-z0-9-]+)\]/i, `"${title}"`);
    }
    return message.replace(/\s*\[(t-[a-z0-9-]+)\]\s*/i, ' ').trim();
  }

  return message;
}
