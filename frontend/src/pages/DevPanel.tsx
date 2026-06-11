import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { resetAllData, generateConflict } from '../services/syncService';
import { DevStateOverview } from '../components/DevStateOverview';
import { RecentActivities } from '../components/RecentActivities';

export function DevPanel() {
  const {
    meta,
    studentState,
    eventCounts,
    logs,
    sessions,
    subjects,
    setOnline,
    selectDevice,
    triggerSync,
    refresh,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setBusy(true);
    setSyncMessage(null);
    const result = await triggerSync();
    setSyncMessage(result.success ? `✓ ${result.message}` : `✗ ${result.message}`);
    setBusy(false);
  };

  const handleReset = async () => {
    if (!meta || !confirm('Reset all local and server data?')) return;
    setBusy(true);
    await resetAllData(meta.studentId);
    await refresh();
    setBusy(false);
  };

  const handleConflict = async () => {
    if (!meta) return;
    setBusy(true);
    await generateConflict(meta.deviceId, meta.studentId);
    await refresh();
    setBusy(false);
  };

  return (
    <>
      <header className="page-header">
        <h1>Dev Panel</h1>
        <p>Simulate two devices, offline mode, and sync debugging</p>
      </header>

      <div className="dev-section">
        <h3>Device Selector</h3>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${meta?.deviceLabel === 'A' ? 'active' : ''}`}
            onClick={() => selectDevice('A')}
          >
            Device A
          </button>
          <button
            className={`toggle-btn ${meta?.deviceLabel === 'B' ? 'active' : ''}`}
            onClick={() => selectDevice('B')}
          >
            Device B
          </button>
        </div>
        <p className="dev-hint">Device ID: {meta?.deviceId}</p>
      </div>

      <div className="dev-section">
        <h3>Network</h3>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${meta?.isOnline ? 'active' : ''}`}
            onClick={() => setOnline(true)}
          >
            ONLINE
          </button>
          <button
            className={`toggle-btn ${!meta?.isOnline ? 'active' : ''}`}
            onClick={() => setOnline(false)}
          >
            OFFLINE
          </button>
        </div>
      </div>

      <div className="dev-section">
        <h3>Sync Status</h3>
        <div className="card-grid">
          <div className="card stat-card">
            <div className="stat-value">{eventCounts.unsynced}</div>
            <div className="stat-label">Unsynced Events</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{eventCounts.total}</div>
            <div className="stat-label">Total Events</div>
          </div>
        </div>
        <p className="dev-hint">
          Last sync:{' '}
          {meta?.lastSyncTime
            ? new Date(meta.lastSyncTime).toLocaleString()
            : 'Never'}
        </p>
        <p className="dev-hint">
          Auto-sync: every 12s when ONLINE (both Device A &amp; B)
        </p>
        {syncMessage && (
          <p
            className="dev-hint"
            style={{
              marginTop: '0.5rem',
              color: syncMessage.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {syncMessage}
          </p>
        )}
      </div>

      <div className="dev-section">
        <h3>Actions</h3>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleSync} disabled={busy}>
            Trigger Sync
          </button>
          <button className="btn btn-outline" onClick={handleConflict} disabled={busy}>
            Generate Conflict
          </button>
          <button className="btn btn-danger" onClick={handleReset} disabled={busy}>
            Reset Data
          </button>
        </div>
      </div>

      <div className="dev-section">
        <h3>Current State</h3>
        <DevStateOverview
          meta={meta}
          studentState={studentState}
          sessions={sessions}
          subjects={subjects}
          eventCounts={eventCounts}
        />
      </div>

      <div className="dev-section">
        <h3>Recent Activities</h3>
        <div className="card activity-card">
          <RecentActivities activities={logs} />
        </div>
      </div>
    </>
  );
}
