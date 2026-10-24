import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusSession } from '../types';
import { getElapsedMs, getRemainingMs, canCompleteSession, getProgressPercent, formatTimer } from '../utils/focusTimer';

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
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => { firedRef.current = false; }, [session?.sessionId]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [session?.sessionId, session?.status]);

  useEffect(() => {
    if (!session || session.status !== 'RUNNING') return;
    const clearBackgroundTimer = () => {
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hiddenAtRef.current !== null) return;
        hiddenAtRef.current = Date.now();
        backgroundTimerRef.current = setTimeout(() => {
          if (!firedRef.current) {
            firedRef.current = true;
            onFailRef.current?.(session.sessionId, 'app_switch');
          }
        }, BACKGROUND_FAILURE_MS + 1);
        return;
      }
      const awayFor = hiddenAtRef.current === null ? 0 : Date.now() - hiddenAtRef.current;
      hiddenAtRef.current = null;
      clearBackgroundTimer();
      // Fallback for throttled timers that run only after the tab is visible.
      if (awayFor > BACKGROUND_FAILURE_MS && !firedRef.current) {
        firedRef.current = true;
        onFailRef.current?.(session.sessionId, 'app_switch');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearBackgroundTimer();
      hiddenAtRef.current = null;
    };
  }, [session?.sessionId, session?.status]);

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
