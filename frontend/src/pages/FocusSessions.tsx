import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { startFocusSession, completeFocusSession, failFocusSession } from '../services/focusService';
import { SessionStatusBadge } from '../components/StatusBadge';
import { FocusTimerDisplay } from '../components/FocusTimerDisplay';
import { formatTimer, getRemainingMs } from '../utils/focusTimer';

export function FocusSessions() {
  const { meta, sessions, refresh, loading } = useApp();
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [busy, setBusy] = useState(false);
  const running = sessions.find((s) => s.status === 'RUNNING');

  const handleStart = async () => {
    if (!meta || busy) return;
    if (!Number.isInteger(targetMinutes) || targetMinutes < 25 || targetMinutes > 120) {
      window.alert('Choose a focus duration between 25 and 120 minutes.');
      return;
    }
    setBusy(true);
    try { await startFocusSession(meta.deviceId, meta.studentId, targetMinutes); await refresh(); }
    finally { setBusy(false); }
  };

  const handleComplete = useCallback(async (sessionId: string) => {
    if (!meta || busy) return;
    setBusy(true);
    try { await completeFocusSession(meta.deviceId, sessionId, meta.studentId); await refresh(); }
    catch (err) { console.error(err); }
    finally { setBusy(false); }
  }, [meta, busy, refresh]);

  const handleFail = useCallback(async (sessionId: string, reason: 'give_up' | 'app_switch' = 'give_up') => {
    if (!meta || busy) return;
    setBusy(true);
    try { await failFocusSession(meta.deviceId, sessionId, meta.studentId, reason); await refresh(); }
    catch (err) { console.error(err); }
    finally { setBusy(false); }
  }, [meta, busy, refresh]);

  if (loading) return <div className="empty-state">Loading...</div>;
  return (
    <>
      <header className="page-header">
        <h1>Focus Sessions</h1>
        <p>Complete the full target to earn rewards. Leaving the app for more than 5 seconds fails the session.</p>
      </header>
      {running && <div style={{ marginBottom: '2rem' }}>
        <FocusTimerDisplay session={running} onTimeUp={handleComplete} onFail={handleFail} busy={busy} />
      </div>}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Start New Session</h3>
        <div className="form-row">
          <label htmlFor="target">Target (minutes)</label>
          <input id="target" type="number" className="input" value={targetMinutes}
            onChange={(e) => setTargetMinutes(Number(e.target.value))} min={25} max={120} step={5} disabled={!!running} />
          <button className="btn btn-primary" onClick={handleStart} disabled={!!running || busy}>Start Session</button>
        </div>
        {running && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>A session is running. Wait for the timer or give up early.</p>}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>All Sessions</h3>
        {sessions.length === 0 ? <p className="empty-state">No focus sessions yet</p> : sessions.map((s) => (
          <div key={s.sessionId} className="session-item">
            <div>
              <div style={{ fontWeight: 600 }}>{s.targetMinutes} min session</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {new Date(s.startedAt).toLocaleString()}
                {s.completedAt && ` → ${new Date(s.completedAt).toLocaleString()}`}
                {s.status === 'RUNNING' && <> · {formatTimer(getRemainingMs(s))} left</>}
                {s.failureReason && <> · Reason: {s.failureReason}</>}
              </div>
            </div>
            <div className="btn-group">
              <SessionStatusBadge status={s.status} />
              {s.status === 'RUNNING' && <button className="btn btn-danger btn-sm"
                onClick={() => handleFail(s.sessionId, 'give_up')} disabled={busy}>Give up</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
