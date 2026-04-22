import { useState, useEffect, useRef } from 'react';
import { UserPlus, Trash2, Mail, X, Droplets, AlertTriangle, Heart, Eye, Download, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

const RELATIONS    = ['Spouse','Parent','Child','Sibling','Grandparent','Grandchild','Friend','Caregiver','Other'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const emptyForm    = { name:'', relation:'', age:'', email:'', caregiverName:'', bloodGroup:'', allergies:'', medicalConditions:'' };

export default function FamilyMembers() {
  const [members, setMembers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [viewMember, setViewMember]   = useState(null);   // member shown in info modal
  const [reportLoading, setReportLoading] = useState(null); // memberId currently generating
  const overlayRef = useRef(null);
  const viewOverlayRef = useRef(null);

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try { const res = await api.get('/family'); setMembers(res.data); }
    catch { toast.error('Could not load family members.'); }
    finally { setLoading(false); }
  };

  // -- Edit modal --
  const openModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setForm({ name:member.name||'', relation:member.relation||'', age:member.age||'',
                email:member.email||'', caregiverName:member.caregiverName||'',
                bloodGroup:member.bloodGroup||'',
                allergies:member.allergies||'', medicalConditions:member.medicalConditions||'' });
    } else {
      setEditingMember(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingMember(null); };

  const handleSubmit = async () => {
    if (!form.name.trim())  { toast.warn('Name is required.'); return; }
    if (!form.relation)     { toast.warn('Please select a relation.'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), relation: form.relation,
      age: form.age ? parseInt(form.age, 10) : null,
      email: form.email.trim() || null,
      caregiverName: form.caregiverName.trim() || null,
      bloodGroup: form.bloodGroup || null,
      allergies: form.allergies || null,
      medicalConditions: form.medicalConditions || null,
    };
    try {
      if (editingMember) {
        await api.put(`/family/${editingMember.id}`, payload);
        toast.success(`${form.name} updated!`);
      } else {
        await api.post('/family', payload);
        toast.success(`${form.name} added to your family!`);
      }
      closeModal(); fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save family member.');
    } finally { setSaving(false); }
  };

  const deleteMember = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your family group?`)) return;
    try { await api.delete(`/family/${id}`); toast.success(`${name} removed.`); fetchMembers(); }
    catch { toast.error('Failed to remove family member.'); }
  };

  // -- Family member report download --
  const downloadFamilyReport = async (member) => {
    if (reportLoading) return;
    setReportLoading(member.id);
    const toastId = toast.loading(`📄 Generating report for ${member.name}…`, {
      position: 'bottom-right',
      style: { background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(99,102,241,0.4)' },
    });
    try {
      const res = await api.get(`/reports/family/${member.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `MedSafe-${member.name.replace(/\s+/g,'-')}-Report-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.update(toastId, { render: `✅ Report for ${member.name} downloaded!`, type: 'success', isLoading: false, autoClose: 3500 });
    } catch {
      toast.update(toastId, {
        render: `❌ No medicines found for ${member.name}. Add medicines first.`,
        type: 'error', isLoading: false, autoClose: 4000,
      });
    } finally { setReportLoading(null); }
  };

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const avatarColors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6'];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ marginBottom:'4px' }}>Family Members</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
            Manage family members. Click the eye icon to view details, or download their individual health report.
          </p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <UserPlus size={17} /> Add Member
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>Loading…</div>
      ) : members.length === 0 ? (
        <div className="glass-panel" style={{ padding:'60px', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'12px' }}>👨‍👩‍👧‍👦</div>
          <p style={{ fontWeight:600, marginBottom:'8px' }}>No family members yet</p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'20px' }}>
            Add family members to track their medicines and receive missed-dose caregiver alerts.
          </p>
          <button className="btn-primary" onClick={() => openModal()}><UserPlus size={16} /> Add First Member</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'16px' }}>
          {members.map((m, idx) => (
            <div key={m.id} className="glass-panel" style={{ padding:'22px' }}>
              {/* Card top row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{
                    width:'48px', height:'48px', borderRadius:'50%', flexShrink:0,
                    background: avatarColors[idx % avatarColors.length],
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'1.2rem', fontWeight:700, color:'white',
                  }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'1rem' }}>{m.name}</div>
                    <div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>
                      {m.relation}{m.age ? ` · ${m.age} yrs` : ''}
                    </div>
                  </div>
                </div>

                {/* Action icons */}
                <div style={{ display:'flex', gap:'2px' }}>
                  {/* View info */}
                  <button
                    onClick={() => setViewMember(m)}
                    title="View profile"
                    style={{ background:'none', border:'none', color:'var(--primary)', cursor:'pointer', padding:'5px', borderRadius:'6px' }}
                  >
                    <Eye size={15} />
                  </button>
                  {/* Download report */}
                  <button
                    onClick={() => downloadFamilyReport(m)}
                    disabled={reportLoading === m.id}
                    title="Download health report"
                    style={{ background:'none', border:'none', color:'var(--success)', cursor:'pointer', padding:'5px', borderRadius:'6px', opacity: reportLoading === m.id ? 0.6 : 1 }}
                  >
                    {reportLoading === m.id
                      ? <Loader size={15} style={{ animation:'spin 1s linear infinite' }} />
                      : <Download size={15} />}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openModal(m)}
                    title="Edit"
                    style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'5px', borderRadius:'6px' }}
                  >
                    ✏️
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => deleteMember(m.id, m.name)}
                    title="Remove"
                    style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'5px', borderRadius:'6px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'10px' }}>
                <span style={{ fontSize:'0.7rem', padding:'3px 10px', borderRadius:'9999px', background:'rgba(99,102,241,0.12)', color:'var(--primary)', border:'1px solid rgba(99,102,241,0.25)', fontWeight:600 }}>
                  {m.relation}
                </span>
                {m.bloodGroup && (
                  <span style={{ fontSize:'0.7rem', padding:'3px 10px', borderRadius:'9999px', background:'rgba(239,68,68,0.1)', color:'var(--error)', border:'1px solid rgba(239,68,68,0.25)', fontWeight:600, display:'flex', alignItems:'center', gap:'3px' }}>
                    <Droplets size={10} /> {m.bloodGroup}
                  </span>
                )}
              </div>

              {m.allergies && (
                <div style={{ fontSize:'0.78rem', color:'var(--warning)', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', padding:'6px 10px', marginBottom:'6px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <AlertTriangle size={12} /> {m.allergies}
                </div>
              )}

              {m.email && (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.8rem', color:'var(--text-muted)', padding:'8px 10px', borderRadius:'8px', background:'rgba(255,255,255,0.04)' }}>
                  <Mail size={13} />
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info View Modal */}
      {viewMember && (
        <div
          ref={viewOverlayRef}
          onClick={e => e.target === viewOverlayRef.current && setViewMember(null)}
          style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.75)',
                   backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
                   justifyContent:'center', padding:'24px' }}
        >
          <div style={{
            background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:'20px', width:'100%', maxWidth:'460px',
            boxShadow:'0 25px 60px rgba(0,0,0,0.6)',
            overflow:'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding:'20px 24px 16px',
              borderBottom:'1px solid var(--surface-border)',
              background:'rgba(99,102,241,0.06)',
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{
                  width:'44px', height:'44px', borderRadius:'50%', flexShrink:0,
                  background:`linear-gradient(135deg, #6366f1, #ec4899)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'1.2rem', fontWeight:700, color:'white',
                }}>
                  {viewMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'1.1rem' }}>{viewMember.name}</div>
                  <div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>
                    {viewMember.relation}{viewMember.age ? ` · ${viewMember.age} years` : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewMember(null)}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body — read-only info rows */}
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <InfoRow icon={<Droplets size={14} color="var(--error)" />} label="Blood Group" value={viewMember.bloodGroup} />
              <InfoRow icon={<Mail size={14} color="var(--primary)" />} label="Caregiver Email" value={viewMember.email} />
              <InfoRow
                icon={<AlertTriangle size={14} color="var(--warning)" />}
                label="Known Allergies"
                value={viewMember.allergies}
                highlight="warning"
              />
              <InfoRow
                icon={<Heart size={14} color="var(--error)" />}
                label="Medical Conditions"
                value={viewMember.medicalConditions}
              />
            </div>

            {/* Modal footer actions */}
            <div style={{
              padding:'14px 24px 20px',
              borderTop:'1px solid var(--surface-border)',
              display:'flex', gap:'10px', justifyContent:'flex-end',
            }}>
              <button
                className="btn-secondary"
                onClick={() => { setViewMember(null); openModal(viewMember); }}
                style={{ fontSize:'0.85rem', padding:'8px 18px' }}
              >
                ✏️ Edit
              </button>
              <button
                className="btn-primary"
                onClick={() => { downloadFamilyReport(viewMember); setViewMember(null); }}
                disabled={reportLoading === viewMember.id}
                style={{ fontSize:'0.85rem', padding:'8px 18px', display:'flex', alignItems:'center', gap:'6px' }}
              >
                <Download size={14} /> Download Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {showModal && (
        <div
          ref={overlayRef}
          onClick={e => e.target === overlayRef.current && closeModal()}
          style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)',
                   backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start',
                   justifyContent:'center', padding:'40px 16px 24px', overflowY:'auto' }}
        >
          <div style={{
            background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:'20px', width:'100%', maxWidth:'520px',
            boxShadow:'0 25px 60px rgba(0,0,0,0.5)', margin:'auto 0',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'22px 24px 16px', borderBottom:'1px solid var(--surface-border)' }}>
              <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:'8px' }}>
                <UserPlus size={18} color="var(--primary)" />
                {editingMember ? 'Edit Member' : 'Add Family Member'}
              </h3>
              <button onClick={closeModal} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'16px', maxHeight:'65vh', overflowY:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Full Name *</label>
                  <input className="form-control" placeholder="Aarav Sharma" value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Relation *</label>
                  <select className="form-control" value={form.relation} onChange={e => setField('relation', e.target.value)}>
                    <option value="">Select…</option>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Age (optional)</label>
                  <input className="form-control" type="number" placeholder="e.g. 65" min="1" max="120" value={form.age} onChange={e => setField('age', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'5px' }}><Droplets size={12} color="var(--error)" /> Blood Group</label>
                  <select className="form-control" value={form.bloodGroup} onChange={e => setField('bloodGroup', e.target.value)}>
                    <option value="">Select…</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Caregiver Name (optional)</label>
                  <input className="form-control" placeholder="e.g. Dr. Sharma" value={form.caregiverName} onChange={e => setField('caregiverName', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Caregiver Email (optional)</label>
                  <input className="form-control" type="email" placeholder="caregiver@email.com" value={form.email} onChange={e => setField('email', e.target.value)} />
                </div>
              </div>
              <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'-8px', display:'block' }}>
                The caregiver gets missed-dose alerts AND can view this person's dose history.
              </span>

              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ display:'flex', alignItems:'center', gap:'5px' }}><AlertTriangle size={12} color="var(--warning)" /> Allergies</label>
                <input className="form-control" placeholder="e.g. Penicillin, Sulfa drugs, Nuts…" value={form.allergies} onChange={e => setField('allergies', e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ display:'flex', alignItems:'center', gap:'5px' }}><Heart size={12} color="var(--error)" /> Medical Conditions</label>
                <input className="form-control" placeholder="e.g. Type 2 Diabetes, Hypertension…" value={form.medicalConditions} onChange={e => setField('medicalConditions', e.target.value)} />
              </div>
            </div>

            <div style={{ padding:'16px 24px 22px', borderTop:'1px solid var(--surface-border)', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : editingMember ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Read-only info row used inside the view modal ─────────────────────────────
function InfoRow({ icon, label, value, highlight }) {
  if (!value) return null;
  const bgMap = { warning: 'rgba(245,158,11,0.07)', default: 'rgba(255,255,255,0.03)' };
  const colorMap = { warning: 'var(--warning)', default: 'var(--text-muted)' };
  const key = highlight || 'default';
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:'10px',
      background: bgMap[key], borderRadius:'10px', padding:'10px 14px',
      border: `1px solid ${highlight ? 'rgba(245,158,11,0.2)' : 'var(--surface-border)'}`,
    }}>
      <div style={{ marginTop:'2px', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: colorMap[key], marginBottom:'2px' }}>
          {label}
        </div>
        <div style={{ fontSize:'0.88rem', color:'var(--text-main)', lineHeight:1.5 }}>{value}</div>
      </div>
    </div>
  );
}
