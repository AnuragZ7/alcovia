import { TaskStatus, SessionStatus } from '../types';

const TASK_MAP: Record<TaskStatus, string> = {
  NOT_STARTED: 'badge-not-started',
  IN_PROGRESS: 'badge-in-progress',
  DONE: 'badge-done',
};

const SESSION_MAP: Record<SessionStatus, string> = {
  RUNNING: 'badge-running',
  SUCCESS: 'badge-success',
  FAILED: 'badge-failed',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge ${TASK_MAP[status]}`}>{status.replace('_', ' ')}</span>;
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <span className={`badge ${SESSION_MAP[status]}`}>{status}</span>;
}
