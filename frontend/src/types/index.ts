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
  synced?: boolean;
}

export interface StudentState {
  studentId: string;
  coins: number;
  streak: number;
  todayFocusMinutes: number;
  lastFocusDate: string | null;
}

export interface FocusSession {
  sessionId: string;
  studentId: string;
  targetMinutes: number;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  failureReason?: 'give_up' | 'app_switch';
}

export interface Task {
  taskId: string;
  chapterId: string;
  subjectId: string;
  title: string;
  status: TaskStatus;
  deleted?: boolean;
  versionVector: VersionVector;
}

export interface Chapter {
  chapterId: string;
  name: string;
  progress: number;
  tasks: Task[];
}

export interface Subject {
  subjectId: string;
  name: string;
  progress: number;
  chapters: Chapter[];
}

export interface AppMeta {
  key: string;
  deviceId: string;
  deviceLabel: 'A' | 'B';
  studentId: string;
  isOnline: boolean;
  lastSyncTime: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'sync';
  message: string;
}

export const TASK_STATUS_PRIORITY: Record<TaskStatus, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

export const FOCUS_REWARD_COINS = 50;

export const SUBJECT_NAMES: Record<string, string> = {
  'sub-math': 'Mathematics',
  'sub-physics': 'Physics',
  'sub-cs': 'Computer Science',
};

export const CHAPTER_NAMES: Record<string, string> = {
  'ch-algebra': 'Algebra',
  'ch-calculus': 'Calculus',
  'ch-mechanics': 'Mechanics',
  'ch-thermo': 'Thermodynamics',
  'ch-dsa': 'Data Structures',
  'ch-networks': 'Networks',
};
