import { LogEntry } from '../types';

const LEVEL_CONFIG: Record<
  LogEntry['level'],
  { icon: string; label: string; className: string }
> = {
  info: { icon: 'ℹ️', label: 'Info', className: 'activity-info' },
  warn: { icon: '⚠️', label: 'Warning', className: 'activity-warn' },
  error: { icon: '❌', label: 'Error', className: 'activity-error' },
  sync: { icon: '🔄', label: 'Sync', className: 'activity-sync' },
};

interface RecentActivitiesProps {
  activities: LogEntry[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  if (activities.length === 0) {
    return (
      <div className="activity-empty">
        <span className="activity-empty-icon">📋</span>
        <p>No recent activities yet</p>
        <span className="activity-empty-hint">Actions like sync, tasks, and focus sessions will appear here</span>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {activities.map((activity) => {
        const config = LEVEL_CONFIG[activity.level];
        const time = new Date(activity.timestamp);

        return (
          <div key={activity.id} className={`activity-item ${config.className}`}>
            <div className="activity-icon" aria-hidden>
              {config.icon}
            </div>
            <div className="activity-body">
              <div className="activity-meta">
                <span className={`activity-badge ${config.className}`}>{config.label}</span>
                <time className="activity-time" dateTime={activity.timestamp}>
                  {time.toLocaleDateString()} · {time.toLocaleTimeString()}
                </time>
              </div>
              <p className="activity-message">{activity.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
