export type {
  SyncEvent,
  Task,
  FocusSession,
  StudentState,
  AppMeta,
  LogEntry,
  TaskStatus,
  SessionStatus,
  VersionVector,
} from '../types';

export interface ProcessedSessionLocal {
  sessionId: string;
  processedAt: string;
  coinsAwarded: number;
}
