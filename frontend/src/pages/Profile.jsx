import { useState, useEffect } from 'react';
import { User, Phone, Mail, Lock, Save, Eye, EyeOff, ShieldCheck, Droplets, AlertTriangle, Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function Profile() {
  const [profile, setProfile]   = useState({ name:'', email:'', phone:'', bloodGroup:'', allergies:'', medicalConditions:'' });
  const [pwd, setPwd]           = useState({ current:'', next:'', confirm:'' });
  const [showPwd, setShowPwd]   = useState({ current:false, next:false, confirm:false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd]         = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('medsafe_profile');
    if (stored) {
      try { setProfile(JSON.parse(stored)); } catch {}
    }
    // Try to fetch fresh data from backend
    api.get('/auth/me').then(res => {
      const d = res.data;
      setProfile(p => ({ ...p, name: d.name||p.name, email: d.email||p.email, phone: d.phone||'', bloodGroup: d.bloodGroup||'', allergies: d.allergies||'', medicalConditions: d.medicalConditions||'' }));
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    if (!profile.name.trim()) { toast.warn('Name cannot be empty.'); return; }
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', {
        name: profile.name,
        phone: profile.phone,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        medicalConditions: profile.medicalConditions,
      });
      localStorage.setItem('medsafe_profile', JSON.stringify(profile));
      toast.success('Profile saved successfully!');
    } catch { toast.error('Failed to save profile.'); }
    finally { setSavingProfile(false); }
  };

  const changePassword = async () => {
    if (!pwd.current)            { toast.warn('Enter your current password.'); return; }
    if (pwd.next.length < 8)     { toast.warn('New password must be at least 8 characters.'); return; }
    if (pwd.next !== pwd.confirm) { toast.warn('Passwords do not match.'); return; }
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Password changed successfully!');
      setPwd({ current:'', next:'', confirm:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally { setSavingPwd(false); }
  };

  const toggleShow = field => setShowPwd(p => ({ ...p, [field]: !p[field] }));

  /* Render a password input field inline (NOT as a component to avoid focus loss on re-render) */
  const renderPwdInput = (field, label, placeholder) => (
    <div key={field} className="form-group" style={{ marginBottom:0, position:'relative' }}>
      <label>{label}</label>
      <input type={showPwd[field] ? 'text' : 'password'} className="form-control" placeholder={placeholder}
        value={pwd[field]} onChange={e => setPwd(p => ({ ...p, [field]: e.target.value }))}
        style={{ paddingRight:'44px' }} />
      <button type="button" onClick={() => toggleShow(field)}
        style={{ position:'absolute', right:'12px', top:'34px', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px' }}>
        {showPwd[field] ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'28px', maxWidth:'600px' }}>
      <div>
        <h2 style={{ marginBottom:'4px' }}>My Profile</h2>
        <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>Manage your personal information, health details, and account settings</p>
      </div>

      {/* Avatar */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--secondary))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', fontWeight:700, color:'white', flexShrink:0 }}>
          {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:'1.1rem' }}>{profile.name || 'Your Name'}</div>
          <div style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{profile.email}</div>
          {profile.bloodGroup && (
            <div style={{ marginTop:'4px', display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', color:'var(--error)', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', padding:'2px 8px', borderRadius:'9999px' }}>
              <Droplets size={11} /> {profile.bloodGroup}
            </div>
          )}
          <div style={{ marginTop:'4px', display:'flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', color:'var(--success)' }}>
            <ShieldCheck size={13} /> Verified Patient Account
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="glass-panel" style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>
        <h4 style={{ margin:0, display:'flex', alignItems:'center', gap:'8px' }}>
          <User size={17} color="var(--primary)" /> Personal Information
        </h4>

        <div className="form-group" style={{ marginBottom:0 }}>
          <label>Full Name</label>
          <input className="form-control" placeholder="Aarav Sharma" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
        </div>

        <div className="form-group" style={{ marginBottom:0, position:'relative' }}>
          <label>Email Address</label>
          <input className="form-control" type="email" value={profile.email} readOnly style={{ opacity:0.65, cursor:'not-allowed', paddingLeft:'38px' }} />
          <Mail size={15} style={{ position:'absolute', left:'12px', top:'36px', color:'var(--text-muted)' }} />
          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'4px', display:'block' }}>Email cannot be changed.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
          <div className="form-group" style={{ marginBottom:0, position:'relative' }}>
            <label>Phone Number (optional)</label>
            <input className="form-control" type="tel" placeholder="+91 98765 43210" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} style={{ paddingLeft:'38px' }} />
            <Phone size={15} style={{ position:'absolute', left:'12px', top:'36px', color:'var(--text-muted)' }} />
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <Droplets size={13} color="var(--error)" /> Blood Group
            </label>
            <select className="form-control" value={profile.bloodGroup} onChange={e => setProfile(p => ({ ...p, bloodGroup: e.target.value }))}>
              <option value="">Select…</option>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Allergies & Medical Conditions */}
      <div className="glass-panel" style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>
        <h4 style={{ margin:0, display:'flex', alignItems:'center', gap:'8px' }}>
          <Heart size={17} color="var(--error)" /> Health Details
        </h4>
        <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', margin:0 }}>
          Your personal allergies and medical conditions. This information is used in your health reports and AI assistant.
        </p>

        <div className="form-group" style={{ marginBottom:0 }}>
          <label style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <AlertTriangle size={13} color="var(--warning)" /> Known Allergies
          </label>
          <input
            className="form-control"
            placeholder="e.g. Penicillin, Sulfa drugs, Nuts, Dust…"
            value={profile.allergies}
            onChange={e => setProfile(p => ({ ...p, allergies: e.target.value }))}
          />
          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'2px', display:'block' }}>
            Separate multiple allergies with commas.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom:0 }}>
          <label style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <Heart size={13} color="var(--error)" /> Medical Conditions
          </label>
          <input
            className="form-control"
            placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma…"
            value={profile.medicalConditions}
            onChange={e => setProfile(p => ({ ...p, medicalConditions: e.target.value }))}
          />
          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'2px', display:'block' }}>
            Chronic or ongoing conditions you'd like tracked.
          </span>
        </div>

        {/* Preview badges */}
        {(profile.allergies || profile.medicalConditions) && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', padding:'12px', background:'rgba(255,255,255,0.03)', borderRadius:'12px', border:'1px solid var(--surface-border)' }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>Preview</div>
            {profile.allergies && (
              <div style={{ fontSize:'0.78rem', color:'var(--warning)', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', padding:'6px 10px', display:'flex', alignItems:'center', gap:'6px' }}>
                <AlertTriangle size={12} /> {profile.allergies}
              </div>
            )}
            {profile.medicalConditions && (
              <div style={{ fontSize:'0.78rem', color:'var(--error)', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', padding:'6px 10px', display:'flex', alignItems:'center', gap:'6px' }}>
                <Heart size={12} /> {profile.medicalConditions}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Single save button for both sections */}
      <button className="btn-primary" onClick={saveProfile} disabled={savingProfile} style={{ alignSelf:'flex-start', display:'flex', alignItems:'center', gap:'8px' }}>
        <Save size={16} /> {savingProfile ? 'Saving…' : 'Save Profile'}
      </button>

      {/* Change password */}
      <div className="glass-panel" style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>
        <h4 style={{ margin:0, display:'flex', alignItems:'center', gap:'8px' }}>
          <Lock size={17} color="var(--primary)" /> Change Password
        </h4>
        {renderPwdInput('current', 'Current Password', '••••••••')}
        {renderPwdInput('next', 'New Password', 'Min 8 characters')}
        {renderPwdInput('confirm', 'Confirm New Password', 'Repeat new password')}
        {pwd.next && pwd.confirm && pwd.next !== pwd.confirm && (
          <div style={{ color:'var(--error)', fontSize:'0.8rem' }}>⚠ Passwords do not match.</div>
        )}
        {pwd.next.length > 0 && pwd.next.length < 8 && (
          <div style={{ color:'var(--warning)', fontSize:'0.8rem' }}>Password must be at least 8 characters.</div>
        )}
        {pwd.next && (
          <div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'6px' }}>
              Strength: {pwd.next.length >= 12 ? '💪 Strong' : pwd.next.length >= 8 ? '👍 Medium' : '⚠️ Weak'}
            </div>
            <div style={{ height:'4px', background:'rgba(255,255,255,0.1)', borderRadius:'9999px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min(100,(pwd.next.length/16)*100)}%`, background: pwd.next.length>=12?'var(--success)':pwd.next.length>=8?'var(--warning)':'var(--error)', transition:'width 0.3s ease', borderRadius:'9999px' }} />
            </div>
          </div>
        )}
        <button className="btn-primary" onClick={changePassword} disabled={savingPwd||!pwd.current||pwd.next.length<8||pwd.next!==pwd.confirm} style={{ alignSelf:'flex-start', display:'flex', alignItems:'center', gap:'8px' }}>
          <Lock size={16} /> {savingPwd ? 'Updating…' : 'Change Password'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass-panel" style={{ padding:'20px', border:'1px solid rgba(239,68,68,0.25)' }}>
        <h4 style={{ margin:'0 0 8px', color:'var(--error)' }}>Danger Zone</h4>
        <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginBottom:'14px' }}>
          Signing out will clear your session. Your data remains safe on our servers.
        </p>
        <button onClick={() => { localStorage.removeItem('medsafe_token'); window.location.href = '/login'; }}
          style={{ padding:'8px 18px', borderRadius:'9999px', border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.08)', color:'var(--error)', cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
