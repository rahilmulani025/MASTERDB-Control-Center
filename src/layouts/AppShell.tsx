import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getHealth } from '../api/health';

interface NavItem {
  label: string;
  path: string;
  end?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'CONTROL PLANE',
    items: [
      { label: 'Overview', path: '/dashboard', end: true },
      { label: 'Dataset Explorer', path: '/datasets' },
      { label: 'Observability', path: '/observability' },
      { label: 'System & Admin', path: '/admin' },
    ],
  },
  {
    title: 'DATASET GOVERNANCE',
    items: [
      { label: 'Governance Overview', path: '/governance', end: true },
      { label: 'Validation', path: '/governance/validation' },
      { label: 'Certification', path: '/governance/certification' },
      { label: 'Lineage & Provenance', path: '/lineage' },
      { label: 'Retrieval Readiness', path: '/governance/retrieval' },
      { label: 'Audit & Replay', path: '/audit' },
    ],
  },
  {
    title: 'SYSTEM OPERATIONS',
    items: [
      { label: 'Controlled Ingestion', path: '/ingestion', end: true },
      { label: 'Ingestion Jobs', path: '/ingestion/jobs' },
      { label: 'Shared Data', path: '/admin/shared-data' },
    ],
  },
];

export function AppShell() {
  const location = useLocation();
  const [connected, setConnected] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    getHealth()
      .then((h) => {
        if (active) setConnected(h?.status === 'ok');
      })
      .catch(() => {
        if (active) setConnected(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Compute breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; path?: string }[] = [{ label: 'MASTERDB', path: '/dashboard' }];

  if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
    breadcrumbs.push({ label: 'Overview' });
  } else if (pathSegments[0] === 'datasets') {
    breadcrumbs.push({ label: 'Dataset Explorer', path: pathSegments.length > 1 ? '/datasets' : undefined });
    if (pathSegments.length > 1) {
      breadcrumbs.push({ label: pathSegments[1] });
    }
  } else if (pathSegments[0] === 'observability') {
    breadcrumbs.push({ label: 'Observability Telemetry' });
  } else if (pathSegments[0] === 'admin') {
    if (pathSegments[1] === 'shared-data') {
      breadcrumbs.push({ label: 'Shared Data Registry' });
    } else {
      breadcrumbs.push({ label: 'System & Administration' });
    }
  } else if (pathSegments[0] === 'governance') {
    breadcrumbs.push({ label: 'Governance', path: pathSegments.length > 1 ? '/governance' : undefined });
    if (pathSegments[1] === 'validation') {
      breadcrumbs.push({ label: 'Validation' });
    } else if (pathSegments[1] === 'certification') {
      breadcrumbs.push({ label: 'Certification' });
    } else if (pathSegments[1] === 'retrieval') {
      breadcrumbs.push({ label: 'Retrieval Readiness' });
    }
  } else if (pathSegments[0] === 'lineage') {
    breadcrumbs.push({ label: 'Lineage & Provenance' });
  } else if (pathSegments[0] === 'audit') {
    breadcrumbs.push({ label: 'Audit & Replay' });
  } else if (pathSegments[0] === 'ingestion') {
    breadcrumbs.push({ label: 'Controlled Ingestion', path: pathSegments.length > 1 ? '/ingestion' : undefined });
    if (pathSegments.length > 1 && pathSegments[1] === 'jobs') {
      breadcrumbs.push({ label: 'Ingestion Jobs' });
    }
  } else {
    breadcrumbs.push({ label: pathSegments[0].replace('-', ' ') });
  }

  return (
    <div className="shell">
      <aside>
        <div className="brand-container">
          <Link className="brand" to="/dashboard">
            <div className="brand-title">
              <span>▦</span> MASTERDB
            </div>
            <div className="brand-subtitle">Control Center</div>
          </Link>
        </div>

        <nav aria-label="Main navigation">
          {navGroups.map((group, i) => (
            <div className="nav-group" key={i}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-bullet" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-status-row">
            <span>Backend Runtime</span>
            <span className={`status-dot-text ${connected ? 'connected' : 'disconnected'}`}>
              <span className="status-indicator-dot" />
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="sidebar-status-row" style={{ color: '#475569', fontSize: '10px' }}>
            <span>Sovereign Node</span>
            <span style={{ fontFamily: 'monospace' }}>v1.3.0</span>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <nav aria-label="Breadcrumbs" className="breadcrumbs">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="breadcrumb-sep">/</span>}
                {crumb.path ? (
                  <Link to={crumb.path} className="breadcrumb-root">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-current">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="topbar-right">
            <span className={`pill-badge ${connected ? 'connected' : 'disconnected'}`}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: connected ? '#16845B' : '#C0392B',
                }}
              />
              {connected ? 'Backend Connected' : 'Backend Offline'}
            </span>
            <span className="pill-badge version">MASTERDB v1.3.0</span>
            <span className="pill-badge session">Session Active</span>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
