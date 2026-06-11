import { FocusSession } from '../types';
import { SessionStatusBadge } from './StatusBadge';
import { useFocusTimer } from '../hooks/useFocusTimer';

interface FocusTimerDisplayProps {
  session: FocusSession;
  onTimeUp: (sessionId: string) => void;
  onFail?: (sessionId: string) => void;
  busy?: boolean;
  compact?: boolean;
}

export function FocusTimerDisplay({
  session,
  onTimeUp,
  onFail,
  busy = false,
  compact = false,
}: FocusTimerDisplayProps) {
  const { timer } = useFocusTimer({ session, onTimeUp });

  if (!timer) return null;

  if (compact) {
    return (
      <div className="focus-timer-compact">
        <SessionStatusBadge status="RUNNING" />
        <span className="focus-timer-digits">{timer.remainingLabel}</span>
        <span className="focus-timer-sub">remaining</span>
      </div>
    );
  }

  return (
    <div className="focus-timer-card">
      <div className="focus-timer-header">
        <SessionStatusBadge status="RUNNING" />
        <span className="focus-timer-target">{session.targetMinutes} min session</span>
      </div>

      <div className="focus-timer-digits focus-timer-countdown">{timer.remainingLabel}</div>
      <p className="focus-timer-sub">remaining · {timer.elapsedLabel} elapsed</p>

      <div className="progress-bar focus-timer-progress">
        <div className="progress-fill" style={{ width: `${timer.progress}%` }} />
      </div>

      <p className="focus-timer-hint">
        {timer.canComplete
          ? 'Target reached — marking complete…'
          : 'Stay focused until the timer ends to complete. Give up early to fail.'}
      </p>

      {onFail && (
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onFail(session.sessionId)}
          disabled={busy}
          style={{ marginTop: '1rem' }}
        >
          End Early (Fail)
        </button>
      )}
    </div>
  );
}
