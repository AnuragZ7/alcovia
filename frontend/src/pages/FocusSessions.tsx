import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  startFocusSession,
  completeFocusSession,
  failFocusSession,
} from '../services/focusService';
import { SessionStatusBadge } from '../components/StatusBadge';
import { FocusTimerDisplay } from '../components/FocusTimerDisplay';
import { formatTimer, getRemainingMs } from '../utils/focusTimer';

export function FocusSessions() {
  const { meta, sessions, refresh, loading } = useApp();
  const [targetMinutes, setTargetMinutes] = useState(5);
  const [busy, setBusy] = useState(false);

  const running = sessions.find((s) => s.status === 'RUNNING');

  const handleStart = async () => {
    if (!meta || busy) return;
    setBusy(true);
    await startFocusSession(meta.deviceId, meta.studentId, targetMinutes);
    await refresh();
    setBusy(false);
  };

  const handleComplete = useCallback(
    async (sessionId: string) => {
      if (!meta || busy) return;
      setBusy(true);
      try {
        await completeFocusSession(meta.deviceId, sessionId, meta.studentId);
        await refresh();
      } catch (err) {
        console.error(err);
      }
      setBusy(false);
    },
    [meta, busy, refresh]
  );

  const handleFail = useCallback(
    async (sessionId: string) => {
      if (!meta || busy) return;
      setBusy(true);
      await failFocusSession(meta.deviceId, sessionId, meta.studentId);
      await refresh();
      setBusy(false);
    },
    [meta, busy, refresh]
  );

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <>
      <header className="page-header">
        <h1>Focus Sessions</h1>
        <p>Timer runs while focused — complete only after target time, or fail early</p>
      </header>

      {running && (
        <div style={{ marginBottom: '2rem' }}>
          <FocusTimerDisplay
            session={running}
            onTimeUp={handleComplete}
            onFail={handleFail}
            busy={busy}
          />
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Start New Session</h3>
        <div className="form-row">
          <label htmlFor="target">Target (minutes)</label>
          <input
            id="target"
            type="number"
            className="input"
            value={targetMinutes}
            onChange={(e) => setTargetMinutes(Number(e.target.value))}
            min={1}
            max={120}
            disabled={!!running}
          />
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={!!running || busy}
          >
            Start Session
          </button>
        </div>
        {running && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            A session is running. Wait for the timer or end early to start a new one.
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>All Sessions</h3>
        {sessions.length === 0 ? (
          <p className="empty-state">No focus sessions yet</p>
        ) : (
          sessions.map((s) => (
            <div key={s.sessionId} className="session-item">
              <div>
                <div style={{ fontWeight: 600 }}>{s.targetMinutes} min session</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(s.startedAt).toLocaleString()}
                  {s.completedAt && ` → ${new Date(s.completedAt).toLocaleString()}`}
                  {s.status === 'RUNNING' && (
                    <> · {formatTimer(getRemainingMs(s))} left</>
                  )}
                </div>
              </div>
              <div className="btn-group">
                <SessionStatusBadge status={s.status} />
                {s.status === 'RUNNING' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleFail(s.sessionId)}
                    disabled={busy}
                  >
                    End Early (Fail)
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
