import {
  HeartPulse, LayoutDashboard, Pill, Zap, Users, MessageSquare,
  Clock, Download, LogOut, UserCircle, Loader, ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'medicines',    label: 'My Medicines',  icon: Pill },
  { id: 'interactions', label: 'Drug Checker',  icon: Zap },
  { id: 'doses',        label: 'Dose Log',      icon: Clock },
  { id: 'family',       label: 'Family',        icon: Users },
  { id: 'ai',           label: 'AI Assistant',  icon: MessageSquare },
];

export default function Sidebar({ active, onNav, userName, userEmail, onLogout, onDownload, reportLoading, isOpen, onToggle }) {
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          }}
          className="sidebar-backdrop"
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}
        style={{ width: isOpen ? '220px' : '64px' }}
      >
        {/* Logo + toggle */}
        <div className="sidebar-logo" style={{ justifyContent: isOpen ? 'space-between' : 'center', padding: isOpen ? '0 16px 0 20px' : '0 8px' }}>
          {isOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/logo.png"
                alt="MedSafe AI"
                style={{ width: 34, height: 34, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
              />
              <span className="sidebar-logo-text">MedSafe AI</span>
            </div>
          )}
          {!isOpen && (
            <img
              src="/logo.png"
              alt="MedSafe AI"
              onClick={onToggle}
              title="Expand sidebar"
              style={{
                width: 32, height: 32, borderRadius: '9px',
                objectFit: 'cover', cursor: 'pointer', flexShrink: 0,
                display: 'block', margin: '0 auto',
              }}
            />
          )}
          {/* Collapse / expand toggle button — only show when open */}
          {isOpen && (
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '8px',
                padding: '6px 7px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav" style={{ padding: isOpen ? '0 12px' : '0 8px' }}>
          {isOpen && <span className="nav-section-label">Navigation</span>}

          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${active === id ? 'active' : ''}`}
              onClick={() => onNav(id)}
              title={!isOpen ? label : undefined}
              style={{ justifyContent: isOpen ? 'flex-start' : 'center', padding: isOpen ? '10px 12px' : '10px', gap: isOpen ? '12px' : 0 }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {isOpen && <span>{label}</span>}
            </button>
          ))}

          {isOpen && <span className="nav-section-label" style={{ marginTop: 8 }}>Account</span>}
          {!isOpen && <div style={{ height: '1px', background: 'var(--surface-border)', margin: '8px 4px' }} />}

          <button
            className={`nav-item ${active === 'profile' ? 'active' : ''}`}
            onClick={() => onNav('profile')}
            title={!isOpen ? 'My Profile' : undefined}
            style={{ justifyContent: isOpen ? 'flex-start' : 'center', padding: isOpen ? '10px 12px' : '10px', gap: isOpen ? '12px' : 0 }}
          >
            <UserCircle size={17} style={{ flexShrink: 0 }} />
            {isOpen && <span>My Profile</span>}
          </button>

          <button
            className="nav-item"
            onClick={onDownload}
            disabled={reportLoading}
            title={!isOpen ? (reportLoading ? 'Generating…' : 'Doctor Report') : undefined}
            style={{ opacity: reportLoading ? 0.7 : 1, cursor: reportLoading ? 'not-allowed' : 'pointer', justifyContent: isOpen ? 'flex-start' : 'center', padding: isOpen ? '10px 12px' : '10px', gap: isOpen ? '12px' : 0 }}
          >
            {reportLoading
              ? <Loader size={17} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              : <Download size={17} style={{ flexShrink: 0 }} />}
            {isOpen && <span>{reportLoading ? 'Generating…' : 'Doctor Report'}</span>}
          </button>

          <button
            className="nav-item"
            onClick={onLogout}
            title={!isOpen ? 'Sign Out' : undefined}
            style={{ color: '#ff3b5c', justifyContent: isOpen ? 'flex-start' : 'center', padding: isOpen ? '10px 12px' : '10px', gap: isOpen ? '12px' : 0 }}
          >
            <LogOut size={17} style={{ flexShrink: 0 }} />
            {isOpen && <span>Sign Out</span>}
          </button>
        </nav>

        {/* User footer (expanded only) */}
        {isOpen && (
          <div className="sidebar-footer">
            <div className="nav-item" style={{ cursor: 'pointer', paddingLeft: 8 }} onClick={() => onNav('profile')}>
              <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '0.72rem', minWidth: 30 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName || 'User'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail || 'Patient'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed footer: just avatar */}
        {!isOpen && (
          <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'center' }}>
            <div
              className="user-avatar"
              style={{ width: 32, height: 32, fontSize: '0.72rem', cursor: 'pointer' }}
              onClick={() => onNav('profile')}
              title={userName || 'Profile'}
            >
              {initials}
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }

          .sidebar {
            transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
            overflow: hidden;
          }
          .sidebar .sidebar-logo {
            margin-bottom: 24px;
            min-height: 52px;
            display: flex;
            align-items: center;
            padding-top: 8px;
          }
          .sidebar .sidebar-logo-text {
            white-space: nowrap;
            overflow: hidden;
          }
          .nav-item span {
            white-space: nowrap;
            overflow: hidden;
          }

          /* Mobile: sidebar slides in from left */
          @media (max-width: 768px) {
            .sidebar {
              position: fixed !important;
              top: 0; left: 0; height: 100vh;
              z-index: 100;
              transform: translateX(-100%);
              transition: transform 0.25s ease, width 0.25s ease;
              width: 240px !important;
            }
            .sidebar--open {
              transform: translateX(0) !important;
            }
            .sidebar-backdrop {
              display: block !important;
            }
          }

          /* Desktop: icon-only collapsed */
          @media (min-width: 769px) {
            .sidebar--closed .nav-section-label { display: none; }
            .sidebar-backdrop { display: none !important; }
          }
        `}</style>
      </aside>
    </>
  );
}
