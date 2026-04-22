import { Shield, Pill, Activity, Users, Zap } from 'lucide-react';

export default function Dashboard({ onNav }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '4px' }}>Welcome to MedSafe</h2>
        <p style={{ color: 'var(--text-muted)' }}>Here is your health overview.</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <DashboardCard 
          icon={<Pill size={24} />} 
          title="My Medicines" 
          desc="Manage your prescriptions and medicine box" 
          onClick={() => onNav('medicines')} 
        />
        <DashboardCard 
          icon={<Activity size={24} />} 
          title="Dose Log" 
          desc="Track your medication adherence and timings" 
          onClick={() => onNav('doses')} 
        />
        <DashboardCard 
          icon={<Shield size={24} />} 
          title="Drug Checker" 
          desc="Check for severe medication interactions" 
          onClick={() => onNav('interactions')} 
        />
        <DashboardCard 
          icon={<Users size={24} />} 
          title="Family" 
          desc="Manage family member profiles and roles" 
          onClick={() => onNav('family')} 
        />
        <DashboardCard 
          icon={<Zap size={24} />} 
          title="AI Assistant" 
          desc="Ask smart questions about your health" 
          onClick={() => onNav('ai')} 
        />
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, desc, onClick }) {
  return (
    <div 
      className="glass-panel" 
      onClick={onClick}
      style={{ 
        padding: '24px', 
        cursor: 'pointer', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease'
      }}
    >
      <div style={{ color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '12px', borderRadius: '12px', width: 'max-content' }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{desc}</p>
      </div>
    </div>
  );
}
