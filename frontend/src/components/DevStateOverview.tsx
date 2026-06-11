import { AppMeta, StudentState, FocusSession, Subject } from '../types';

interface DevStateOverviewProps {
  meta: AppMeta | null;
  studentState: StudentState | null;
  sessions: FocusSession[];
  subjects: Subject[];
  eventCounts: { total: number; unsynced: number };
}

export function DevStateOverview({
  meta,
  studentState,
  sessions,
  subjects,
  eventCounts,
}: DevStateOverviewProps) {
  const running = sessions.filter((s) => s.status === 'RUNNING').length;
  const success = sessions.filter((s) => s.status === 'SUCCESS').length;
  const failed = sessions.filter((s) => s.status === 'FAILED').length;

  return (
    <div className="dev-state-grid">
      <div className="dev-state-card">
        <h4 className="dev-state-card-title">Device</h4>
        <dl className="dev-state-list">
          <div className="dev-state-row">
            <dt>Label</dt>
            <dd>Device {meta?.deviceLabel ?? '—'}</dd>
          </div>
          <div className="dev-state-row">
            <dt>Device ID</dt>
            <dd className="dev-state-mono">{meta?.deviceId ?? '—'}</dd>
          </div>
          <div className="dev-state-row">
            <dt>Student ID</dt>
            <dd className="dev-state-mono">{meta?.studentId ?? '—'}</dd>
          </div>
          <div className="dev-state-row">
            <dt>Network</dt>
            <dd>
              <span className={`status-dot ${meta?.isOnline ? 'online' : 'offline'}`} />
              {meta?.isOnline ? ' Online' : ' Offline'}
            </dd>
          </div>
          <div className="dev-state-row">
            <dt>Last sync</dt>
            <dd>
              {meta?.lastSyncTime
                ? new Date(meta.lastSyncTime).toLocaleString()
                : 'Never'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="dev-state-card">
        <h4 className="dev-state-card-title">Student</h4>
        <div className="dev-state-stats">
          <div className="dev-state-stat">
            <span className="dev-state-stat-value">{studentState?.coins ?? 0}</span>
            <span className="dev-state-stat-label">Coins</span>
          </div>
          <div className="dev-state-stat">
            <span className="dev-state-stat-value">{studentState?.streak ?? 0}</span>
            <span className="dev-state-stat-label">Streak</span>
          </div>
          <div className="dev-state-stat">
            <span className="dev-state-stat-value">{studentState?.todayFocusMinutes ?? 0}</span>
            <span className="dev-state-stat-label">Focus min</span>
          </div>
        </div>
      </div>

      <div className="dev-state-card">
        <h4 className="dev-state-card-title">Focus Sessions</h4>
        <dl className="dev-state-list">
          <div className="dev-state-row">
            <dt>Total</dt>
            <dd>{sessions.length}</dd>
          </div>
          <div className="dev-state-row">
            <dt>Running</dt>
            <dd><span className="badge badge-running">{running}</span></dd>
          </div>
          <div className="dev-state-row">
            <dt>Success</dt>
            <dd><span className="badge badge-success">{success}</span></dd>
          </div>
          <div className="dev-state-row">
            <dt>Failed</dt>
            <dd><span className="badge badge-failed">{failed}</span></dd>
          </div>
        </dl>
      </div>

      <div className="dev-state-card">
        <h4 className="dev-state-card-title">Sync Events</h4>
        <dl className="dev-state-list">
          <div className="dev-state-row">
            <dt>Total events</dt>
            <dd>{eventCounts.total}</dd>
          </div>
          <div className="dev-state-row">
            <dt>Unsynced</dt>
            <dd>
              <span className={eventCounts.unsynced > 0 ? 'dev-state-highlight' : ''}>
                {eventCounts.unsynced}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {subjects.length > 0 && (
        <div className="dev-state-card dev-state-card-wide">
          <h4 className="dev-state-card-title">Subject Progress</h4>
          <div className="dev-subject-list">
            {subjects.map((s) => (
              <div key={s.subjectId} className="dev-subject-row">
                <div className="dev-subject-header">
                  <span>{s.name}</span>
                  <span>{s.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${s.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
