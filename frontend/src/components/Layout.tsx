import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/focus', label: 'Focus Sessions', icon: '🎯' },
  { to: '/subjects', label: 'Subjects', icon: '📚' },
  { to: '/tasks', label: 'Tasks', icon: '✅' },
  { to: '/dev', label: 'Dev Panel', icon: '🔧' },
];

export function Layout() {
  const { meta } = useApp();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Alcovia</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {meta && (
          <div style={{ marginTop: 'auto', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div>
              <span className={`status-dot ${meta.isOnline ? 'online' : 'offline'}`} />{' '}
              Device {meta.deviceLabel} · {meta.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        )}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
