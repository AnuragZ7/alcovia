import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusSession } from '../types';
import {
  getElapsedMs, getRemainingMs, canCompleteSession, getProgressPercent, formatTimer,
} from '../utils/focusTimer';

interface UseFocusTimerOptions {
  session: FocusSession | undefined;
  onTimeUp: (sessionId: string) => void;
  onFail?: (sessionId: string, reason: 'app_switch') => void;
}

const BACKGROUND_FAILURE_MS = 5000;

export function useFocusTimer({ session, onTimeUp, onFail }: UseFocusTimerOptions) {
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => { firedRef.current = false; }, [session?.sessionId]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session?.sessionId, session?.status]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hiddenAtRef.current === null) hiddenAtRef.current = Date.now();
        return;
      }
      if (hiddenAtRef.current !== null) {
        const awayFor = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (awayFor > BACKGROUND_FAILURE_MS && !firedRef.current) {
          firedRef.current = true;
          onFail?.(session.sessionId, 'app_switch');
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [session?.sessionId, session?.status, onFail]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING' || firedRef.current) return;
    if (canCompleteSession(session, now)) {
      firedRef.current = true;
      onTimeUp(session.sessionId);
    }
  }, [session, now, onTimeUp]);

  const getTimerState = useCallback(() => {
    if (!session || session.status !== 'RUNNING') return null;
    const elapsed = getElapsedMs(session, now);
    const remaining = getRemainingMs(session, now);
    return {
      elapsed, remaining, elapsedLabel: formatTimer(elapsed),
      remainingLabel: formatTimer(remaining),
      progress: getProgressPercent(session, now),
      canComplete: canCompleteSession(session, now),
    };
  }, [session, now]);

  return { timer: getTimerState(), now };
}
