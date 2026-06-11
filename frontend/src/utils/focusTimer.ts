import { FocusSession } from '../types';

export function getTargetMs(session: FocusSession): number {
  return session.targetMinutes * 60 * 1000;
}

export function getElapsedMs(session: FocusSession, now = Date.now()): number {
  return Math.max(0, now - new Date(session.startedAt).getTime());
}

export function getRemainingMs(session: FocusSession, now = Date.now()): number {
  return Math.max(0, getTargetMs(session) - getElapsedMs(session, now));
}

export function canCompleteSession(session: FocusSession, now = Date.now()): boolean {
  return session.status === 'RUNNING' && getElapsedMs(session, now) >= getTargetMs(session);
}

export function getProgressPercent(session: FocusSession, now = Date.now()): number {
  const target = getTargetMs(session);
  if (target === 0) return 100;
  return Math.min(100, (getElapsedMs(session, now) / target) * 100);
}

export function formatTimer(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
