export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
export type SessionStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export type EventType =
  | 'FOCUS_SESSION_START'
  | 'FOCUS_SESSION_COMPLETE'
  | 'FOCUS_SESSION_FAIL'
  | 'TASK_STATUS_UPDATE'
  | 'TASK_DELETE'
  | 'STUDENT_STATE_UPDATE';

export interface VersionVector {
  [deviceId: string]: number;
}

export interface SyncEvent {
  eventId: string;
  deviceId: string;
  entityId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  versionVector: VersionVector;
  createdAt: string;
  studentId: string;
}

export interface SyncRequest {
  deviceId: string;
  studentId: string;
  events: SyncEvent[];
  knownEventIds?: string[];
}

export interface SyncResponse {
  events: SyncEvent[];
  serverTime: string;
  studentState: StudentState;
}

export interface StudentState {
  studentId: string;
  coins: number;
  streak: number;
  todayFocusMinutes: number;
  lastFocusDate: string | null;
}

export interface FocusSessionPayload {
  sessionId: string;
  studentId: string;
  targetMinutes: number;
  status: SessionStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskStatusPayload {
  taskId: string;
  status: TaskStatus;
  subjectId: string;
  chapterId: string;
}

export const TASK_STATUS_PRIORITY: Record<TaskStatus, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

export const FOCUS_REWARD_COINS = 50;
