import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Clock, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import TimePicker from '../components/TimePicker';
import DatePicker from '../components/DatePicker';

const FREQUENCIES = [
  'Once daily','Twice daily','Three times daily','Four times daily',
  'Every 8 hours','Every 6 hours','As needed','Weekly','Alternate days'
];

const DOSAGE_UNITS = ['mg','ml','g','mcg','tablet','capsule','drop','unit'];

/** Parse a dosage string like "500mg" into { amount: "500", unit: "mg" } */
function parseDosage(str) {
  if (!str) return { amount: '', unit: 'mg' };
  const match = str.trim().match(/^(\d*\.?\d*)\s*([a-zA-Z]*)$/);
  if (match) {
    const unit = DOSAGE_UNITS.includes(match[2]) ? match[2] : (match[2] || 'mg');
    return { amount: match[1] || '', unit };
  }
  return { amount: str, unit: 'mg' };
}

const emptyForm = {
  familyMemberId: '', brandName: '', genericName: '',
  dosageAmount: '', dosageUnit: 'mg',
  frequency: '', timeSlots: '', startDate: '', endDate: '', notes: '',
};

export default function Medicines() {
  const [medicines, setMedicines]         = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [editId, setEditId]               = useState(null);
  const [form, setForm]                   = useState(emptyForm);
  const [saving, setSaving]               = useState(false);
  const [noDateConfirm, setNoDateConfirm] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => { fetchMedicines(); fetchFamily(); }, []);

  const fetchMedicines = async () => {
    try { const res = await api.get('/medicines'); setMedicines(res.data); }
    catch { toast.error('Failed to load medicines.'); }
  };
  const fetchFamily = async () => {
    try { const res = await api.get('/family'); setFamilyMembers(res.data); } catch {}
  };

  const openModal = (med = null) => {
    if (med) {
      const { amount, unit } = parseDosage(med.dosage);
      setEditId(med.id);
      setForm({
        familyMemberId: med.familyMemberId || '',
        brandName:      med.brandName      || '',
        genericName:    med.genericName    || '',
        dosageAmount:   amount,
        dosageUnit:     unit,
        frequency:      med.frequency      || '',
        timeSlots:      med.timeSlots      || '',
        startDate:      med.startDate      || '',
        endDate:        med.endDate        || '',
        notes:          med.notes          || '',
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setNoDateConfirm(false);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditId(null); };

  const handleSubmit = async () => {
    if (!form.brandName.trim()) { toast.warn('Brand name is required.'); return; }
    if (!form.dosageAmount.trim()) { toast.warn('Dosage amount is required.'); return; }
    if (!form.frequency)        { toast.warn('Please select a frequency.'); return; }
    if (!form.timeSlots)        { toast.warn('Please select at least one dose time.'); return; }
    const hasStart = !!form.startDate;
    const hasEnd   = !!form.endDate;
    if ((!hasStart || !hasEnd) && !noDateConfirm) {
      toast.warn('Please provide start and end dates, or check the box to confirm no dates.');
      return;
    }
    if (hasStart && hasEnd && new Date(form.endDate) < new Date(form.startDate)) {
      toast.warn('End date cannot be before start date.'); return;
    }

    // Combine dosageAmount + dosageUnit into the single "dosage" field the API expects
    const dosageCombined = form.dosageAmount.trim()
      ? `${form.dosageAmount.trim()}${form.dosageUnit}`
      : '';

    const payload = {
      familyMemberId: form.familyMemberId || null,
      brandName:      form.brandName,
      genericName:    form.genericName,
      dosage:         dosageCombined,
      frequency:      form.frequency,
      timeSlots:      form.timeSlots,
      startDate:      form.startDate || null,
      endDate:        form.endDate   || null,
      notes:          form.notes,
    };

    setSaving(true);
    try {
      if (editId) { await api.put(`/medicines/${editId}`, payload); toast.success('Medicine updated!'); }
      else        { await api.post('/medicines', payload);           toast.success('Medicine added!'); }
      closeModal(); fetchMedicines();
    } catch { toast.error('Failed to save medicine.'); }
    finally { setSaving(false); }
  };

  const deleteMedicine = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your cabinet?`)) return;
    try { await api.delete(`/medicines/${id}`); toast.success('Medicine removed.'); fetchMedicines(); }
    catch { toast.error('Failed to remove medicine.'); }
  };

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const memberName = id => familyMembers.find(m => m.id === id)?.name;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ marginBottom:'4px' }}>Medicine Cabinet</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>
            {medicines.length} medicine{medicines.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <Plus size={18} /> Add Medicine
        </button>
      </div>

      {/* Cards */}
      {medicines.length === 0 ? (
        <div className="glass-panel" style={{ padding:'50px', textAlign:'center' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>💊</div>
          <p style={{ fontWeight:600, marginBottom:'6px' }}>No medicines yet</p>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:'20px' }}>
            Add your first medicine to start tracking doses.
          </p>
          <button className="btn-primary" onClick={() => openModal()}>+ Add Medicine</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'16px' }}>
          {medicines.map(med => (
            <div key={med.id} className="glass-panel" style={{ padding:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div>
                  <h3 style={{ marginBottom:'2px' }}>{med.brandName}</h3>
                  <p style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{med.genericName || '—'}</p>
                </div>
                {med.familyMemberId && (
                  <span style={{ fontSize:'0.7rem', background:'rgba(99,102,241,0.15)', color:'var(--primary)', padding:'3px 8px', borderRadius:'9999px' }}>
                    {memberName(med.familyMemberId) || 'Family'}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'12px' }}>
                {med.dosage    && <span style={chipStyle}>{med.dosage}</span>}
                {med.frequency && <span style={chipStyle}>{med.frequency}</span>}
                {med.timeSlots && (
                  <span style={{ ...chipStyle, color:'var(--warning)', borderColor:'rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.08)' }}>
                    <Clock size={11} style={{ marginRight:'3px', verticalAlign:'middle' }} />{med.timeSlots}
                  </span>
                )}
              </div>
              {(med.startDate || med.endDate) && (
                <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'10px' }}>
                  📅 {med.startDate || '?'} → {med.endDate || '?'}
                </p>
              )}
              {med.notes && (
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontStyle:'italic', marginBottom:'12px' }}>{med.notes}</p>
              )}
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => openModal(med)} style={{ flex:1, padding:'7px', borderRadius:'8px', border:'1px solid var(--surface-border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', fontSize:'0.8rem' }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => deleteMedicine(med.id, med.brandName)} style={{ padding:'7px 14px', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.07)', color:'var(--error)', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', fontSize:'0.8rem' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          ref={overlayRef}
          onClick={e => e.target === overlayRef.current && closeModal()}
          style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px 24px', overflowY:'auto' }}
        >
          <div style={{ background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', width:'100%', maxWidth:'560px', boxShadow:'0 25px 60px rgba(0,0,0,0.5)', display:'flex', flexDirection:'column', margin:'auto 0' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'22px 24px 16px', borderBottom:'1px solid var(--surface-border)' }}>
              <h3 style={{ margin:0 }}>{editId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
              <button onClick={closeModal} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px' }}><X size={20} /></button>
            </div>

            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:'18px', overflowY:'auto', maxHeight:'65vh' }}>
              {familyMembers.length > 0 && (
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>For (optional)</label>
                  <select className="form-control" value={form.familyMemberId} onChange={e => setField('familyMemberId', e.target.value)}>
                    <option value="">Myself</option>
                    {familyMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>)}
                  </select>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Brand Name *</label>
                  <input className="form-control" placeholder="e.g. Crocin" value={form.brandName} onChange={e => setField('brandName', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Generic Name</label>
                  <input className="form-control" placeholder="e.g. Paracetamol" value={form.genericName} onChange={e => setField('genericName', e.target.value)} />
                </div>
              </div>

              {/* Dosage: amount + unit picker */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Dosage Amount *</label>
                  <div style={{ display:'flex', gap:'8px', alignItems:'stretch' }}>
                    {/* Numeric amount */}
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 500"
                      value={form.dosageAmount}
                      onChange={e => setField('dosageAmount', e.target.value)}
                      style={{ flex:1, minWidth:0 }}
                    />
                    {/* Unit dropdown */}
                    <select
                      value={form.dosageUnit}
                      onChange={e => setField('dosageUnit', e.target.value)}
                      style={{
                        background:  'rgba(30,41,59,0.95)',
                        color:       '#f8fafc',
                        border:      '1px solid rgba(255,255,255,0.12)',
                        borderRadius:'10px',
                        padding:     '0 10px',
                        fontSize:    '0.88rem',
                        fontWeight:  600,
                        cursor:      'pointer',
                        minWidth:    '72px',
                        outline:     'none',
                        transition:  'border-color 0.2s',
                        colorScheme: 'dark',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.18)'; }}
                      onBlur={e =>  { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                    >
                      {DOSAGE_UNITS.map(u => (
                        <option key={u} value={u}
                          style={{ background:'#1e293b', color:'#f8fafc' }}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Preview */}
                  {form.dosageAmount && (
                    <span style={{ fontSize:'0.72rem', color:'var(--success)', marginTop:'4px', display:'block' }}>
                      Will save as: {form.dosageAmount}{form.dosageUnit}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom:0 }}>
                  <label>Frequency *</label>
                  <select className="form-control" value={form.frequency} onChange={e => setField('frequency', e.target.value)}>
                    <option value="">Select…</option>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>


              <div style={{ background:'rgba(30,41,59,0.5)', borderRadius:'12px', padding:'16px', border:'1px solid var(--surface-border)' }}>
                <TimePicker value={form.timeSlots} onChange={v => setField('timeSlots', v)} label="Dose Time Slots *" />
              </div>

              {/* Date pickers */}
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'10px' }}>
                  <DatePicker label="Start Date" value={form.startDate} onChange={v => setField('startDate', v)} />
                  <DatePicker label="End Date"   value={form.endDate}   min={form.startDate} onChange={v => setField('endDate', v)} />
                </div>

                {(!form.startDate || !form.endDate) && (
                  <label style={{ display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', padding:'10px 12px', borderRadius:'10px', background: noDateConfirm ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border:`1px solid ${noDateConfirm ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.2)'}` }}>
                    <input type="checkbox" checked={noDateConfirm} onChange={e => setNoDateConfirm(e.target.checked)} style={{ marginTop:'2px', flexShrink:0, accentColor:'var(--warning)' }} />
                    <span style={{ fontSize:'0.82rem', color:'var(--warning)', lineHeight:1.5 }}>
                      <AlertCircle size={12} style={{ verticalAlign:'middle', marginRight:'4px' }} />
                      I understand this is an ongoing/indefinite prescription with no fixed end date.
                    </span>
                  </label>
                )}
              </div>

              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Notes</label>
                <textarea className="form-control" placeholder="Any special instructions…" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ resize:'vertical' }} />
              </div>
            </div>

            <div style={{ padding:'16px 24px 22px', borderTop:'1px solid var(--surface-border)', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Update Medicine' : 'Add Medicine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force dark color-scheme for all native selects inside the app */}
      <style>{`
        select { color-scheme: dark; }
        select option { background: #1e293b !important; color: #f8fafc !important; }
      `}</style>
    </div>
  );
}

const chipStyle = {
  fontSize:'0.75rem', padding:'4px 10px', borderRadius:'9999px',
  border:'1px solid var(--surface-border)',
  background:'rgba(255,255,255,0.04)', color:'var(--text-muted)'
};
