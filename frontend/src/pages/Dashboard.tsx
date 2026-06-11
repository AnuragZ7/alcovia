import { useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FocusTimerDisplay } from '../components/FocusTimerDisplay';
import { completeFocusSession, failFocusSession } from '../services/focusService';

export function Dashboard() {
  const { studentState, subjects, sessions, eventCounts, meta, loading, refresh } = useApp();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="empty-state">Loading...</div>;

  const runningSession = sessions.find((s) => s.status === 'RUNNING');
  const recentSessions = sessions.slice(0, 5);

  const handleTimeUp = useCallback(
    async (sessionId: string) => {
      if (!meta || busy) return;
      setBusy(true);
      await completeFocusSession(meta.deviceId, sessionId, meta.studentId);
      await refresh();
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

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Your offline-first learning companion</p>
      </header>

      <div className="card-grid">
        <div className="card stat-card">
          <div className="stat-value">{studentState?.coins ?? 0}</div>
          <div className="stat-label">Coins</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{studentState?.streak ?? 0}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{studentState?.todayFocusMinutes ?? 0}</div>
          <div className="stat-label">Focus Min Today</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{eventCounts.unsynced}</div>
          <div className="stat-label">Unsynced Events</div>
        </div>
      </div>

      {runningSession && (
        <div style={{ marginBottom: '2rem' }}>
          <FocusTimerDisplay
            session={runningSession}
            onTimeUp={handleTimeUp}
            onFail={handleFail}
            busy={busy}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Subject Progress</h3>
          {subjects.map((s) => (
            <div key={s.subjectId} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.name}</span>
                <span>{s.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${s.progress}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Recent Sessions</h3>
          {recentSessions.length === 0 ? (
            <p className="empty-state">No sessions yet</p>
          ) : (
            recentSessions.map((s) => (
              <div key={s.sessionId} className="session-item">
                <span>{s.targetMinutes} min</span>
                <span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {meta?.lastSyncTime && (
        <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Last sync: {new Date(meta.lastSyncTime).toLocaleString()}
        </p>
      )}
    </>
  );
}
