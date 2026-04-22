import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

const EMPTY = {
  brandName: '', genericName: '', dosage: '', frequency: '',
  timeSlots: '', startDate: '', endDate: '', notes: '', familyMemberId: ''
};

export default function MedicineModal({ medicine, familyMembers = [], onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = !!medicine?.id;

  useEffect(() => {
    if (medicine) {
      setForm({
        brandName:      medicine.brandName      || '',
        genericName:    medicine.genericName    || '',
        dosage:         medicine.dosage         || '',
        frequency:      medicine.frequency      || '',
        timeSlots:      medicine.timeSlots      || '',
        startDate:      medicine.startDate      || '',
        endDate:        medicine.endDate        || '',
        notes:          medicine.notes          || '',
        familyMemberId: medicine.familyMemberId || '',
      });
    }
  }, [medicine]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brandName.trim()) return toast.error('Brand name is required.');
    setSaving(true);
    try {
      const payload = { ...form, familyMemberId: form.familyMemberId || null };
      if (isEdit) {
        await api.put(`/medicines/${medicine.id}`, payload);
        toast.success('Medicine updated!');
      } else {
        await api.post('/medicines', payload);
        toast.success('Medicine added!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save medicine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit Medicine' : 'Add Medicine'}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label>Brand Name *</label>
                <input className="input" placeholder="e.g. Crocin" value={form.brandName} onChange={set('brandName')} required />
              </div>
              <div className="form-group">
                <label>Generic Name</label>
                <input className="input" placeholder="e.g. Paracetamol" value={form.genericName} onChange={set('genericName')} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Dosage</label>
                <input className="input" placeholder="e.g. 500mg" value={form.dosage} onChange={set('dosage')} />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select className="select" value={form.frequency} onChange={set('frequency')}>
                  <option value="">Select...</option>
                  <option>Once daily</option>
                  <option>Twice daily</option>
                  <option>Three times daily</option>
                  <option>Four times daily</option>
                  <option>Every 4 hours</option>
                  <option>As needed</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Time Slots (comma-separated, 24h)</label>
              <input className="input" placeholder="e.g. 08:00,14:00,20:00" value={form.timeSlots} onChange={set('timeSlots')} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Start Date</label>
                <input className="input" type="date" value={form.startDate} onChange={set('startDate')} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
              </div>
            </div>

            {familyMembers.length > 0 && (
              <div className="form-group">
                <label>For Family Member (optional)</label>
                <select className="select" value={form.familyMemberId} onChange={set('familyMemberId')}>
                  <option value="">Myself</option>
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group mb-2">
              <label>Notes</label>
              <textarea className="textarea" placeholder="Any special instructions..." value={form.notes} onChange={set('notes')} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{width:16,height:16}} /> Saving…</> : (isEdit ? 'Save Changes' : 'Add Medicine')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
