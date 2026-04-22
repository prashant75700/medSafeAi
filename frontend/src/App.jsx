import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Menu } from 'lucide-react';

import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import DrugChecker from './pages/DrugChecker';
import DoseLog from './pages/DoseLog';
import FamilyMembers from './pages/FamilyMembers';
import Profile from './pages/Profile';
import AiAssistant from './pages/AiAssistant';
import api from './api';

const PAGE_TITLES = {
  dashboard:    'Overview',
  medicines:    'My Medicines',
  interactions: 'Drug Checker',
  doses:        'Dose Log',
  family:       'Family Members',
  profile:      'My Account',
  ai:           'AI Assistant',
};

export default function App() {
  const [page, setPage]             = useState('dashboard');
  const [reportLoading, setReportLoading] = useState(false);
  // Sidebar open/collapsed — desktop default: open; mobile: closed
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );

  const token = localStorage.getItem('medsafe_token');
  const profileJson = localStorage.getItem('medsafe_profile') || localStorage.getItem('medsafe_user');
  const user = profileJson ? (() => { try { return JSON.parse(profileJson); } catch { return null; } })() : null;

  const logout = () => {
    localStorage.removeItem('medsafe_token');
    localStorage.removeItem('medsafe_user');
    localStorage.removeItem('medsafe_profile');
    window.location.href = '/';
  };

  const downloadReport = async () => {
    if (reportLoading) return;
    setReportLoading(true);
    const toastId = toast.loading('📄 Generating your health report… please wait', {
      position: 'bottom-right',
      style: { background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(99,102,241,0.4)' },
    });
    try {
      const res = await api.get('/reports/my-report', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `MedSafe-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.update(toastId, { render: '✅ Report downloaded!', type: 'success', isLoading: false, autoClose: 3500 });
    } catch {
      toast.update(toastId, { render: '❌ Report generation failed. Make sure you have medicines added.', type: 'error', isLoading: false, autoClose: 4000 });
    } finally {
      setReportLoading(false);
    }
  };

  if (!token) return (
    <>
      <AuthPage />
      <ToastContainer position="bottom-right" theme="dark" autoClose={3500} />
    </>
  );

  const handleNav = (id) => {
    setPage(id);
    // On mobile, close sidebar after navigating
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard onNav={handleNav} />;
      case 'medicines':    return <Medicines />;
      case 'interactions': return <DrugChecker />;
      case 'doses':        return <DoseLog />;
      case 'family':       return <FamilyMembers />;
      case 'profile':      return <Profile />;
      case 'ai':           return <AiAssistant />;
      default:             return <Dashboard onNav={handleNav} />;
    }
  };

  return (
    <>
      <div className="app-shell">
        <Sidebar
          active={page}
          onNav={handleNav}
          userName={user?.name}
          userEmail={user?.email}
          onLogout={logout}
          onDownload={downloadReport}
          reportLoading={reportLoading}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
        />
        <div className="main-content">
          <header className="topbar">
            {/* Mobile hamburger — shown only on small screens */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="topbar-hamburger"
              aria-label="Toggle sidebar"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: '8px',
                padding: '7px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                marginRight: '12px',
              }}
            >
              <Menu size={18} />
            </button>

            <h1 className="topbar-title">{PAGE_TITLES[page] || 'MedSafe'}</h1>
            <div className="topbar-user">
              <div className="text-sm text-muted" style={{ display: 'none' }}
                // Hide on very small screens via CSS
              >{user?.email}</div>
              <div className="user-avatar" style={{ cursor: 'pointer' }} title="My Profile" onClick={() => handleNav('profile')}>
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </div>
            </div>
          </header>
          <main className="page-body">{renderPage()}</main>
        </div>
      </div>

      <style>{`
        /* Hide hamburger on desktop (sidebar has its own toggle) */
        @media (min-width: 769px) {
          .topbar-hamburger { display: none !important; }
        }
        /* Show email on desktop only */
        @media (min-width: 640px) {
          .topbar-user .text-sm { display: block !important; }
        }
      `}</style>

      <ToastContainer position="bottom-right" theme="dark" autoClose={3500} />
    </>
  );
}
