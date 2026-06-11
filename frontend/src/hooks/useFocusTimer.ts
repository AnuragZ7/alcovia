import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusSession } from '../types';
import {
  getElapsedMs,
  getRemainingMs,
  canCompleteSession,
  getProgressPercent,
  formatTimer,
} from '../utils/focusTimer';

interface UseFocusTimerOptions {
  session: FocusSession | undefined;
  onTimeUp: (sessionId: string) => void;
}

export function useFocusTimer({ session, onTimeUp }: UseFocusTimerOptions) {
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [session?.sessionId]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return;

    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session?.sessionId, session?.status]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING' || firedRef.current) return;

    if (canCompleteSession(session, now)) {
      firedRef.current = true;
      onTimeUp(session.sessionId);
    }
  }, [session, now, onTimeUp]);

  const getTimerState = useCallback(() => {
    if (!session || session.status !== 'RUNNING') {
      return null;
    }
    const elapsed = getElapsedMs(session, now);
    const remaining = getRemainingMs(session, now);
    return {
      elapsed,
      remaining,
      elapsedLabel: formatTimer(elapsed),
      remainingLabel: formatTimer(remaining),
      progress: getProgressPercent(session, now),
      canComplete: canCompleteSession(session, now),
    };
  }, [session, now]);

  return { timer: getTimerState(), now };
}
