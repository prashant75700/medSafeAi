import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, Trash2, ChevronDown, ChevronUp,
  Users, Eye, Calendar, BarChart2, ChevronLeft, ChevronRight, List,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import DatePicker from '../components/DatePicker';

const STATUS = {
  TAKEN:   { color: 'var(--success)', bg: 'rgba(16,185,129,0.12)',  icon: <CheckCircle size={14} />, dot: '#10b981' },
  MISSED:  { color: 'var(--error)',   bg: 'rgba(239,68,68,0.12)',   icon: <XCircle size={14} />,     dot: '#ef4444' },
  PENDING: { color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)',  icon: <Clock size={14} />,       dot: '#f59e0b' },
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function dateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function formatTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DoseLog() {
  const [medicines, setMedicines]           = useState([]);
  const [familyMembers, setFamilyMembers]   = useState([]);
  const [myPatients, setMyPatients]         = useState([]);
  const [logs, setLogs]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [showFamilyDose, setShowFamilyDose] = useState(false);
  const [caregiverView, setCaregiverView]   = useState(null);
  const [caregiverLogs, setCaregiverLogs]   = useState([]);

  // View mode: 'recent' | 'calendar' | 'stats'
  const [viewMode, setViewMode] = useState('recent');

  // Recent view
  const [showAllRecent, setShowAllRecent] = useState(false);

  // Calendar view
  const [calMonth, setCalMonth]         = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState(null);

  // Stats view
  const [statsMedicine, setStatsMedicine] = useState('');
  const [statsFrom, setStatsFrom]         = useState('');
  const [statsTo, setStatsTo]             = useState('');
  const [statsResult, setStatsResult]     = useState(null);

  useEffect(() => {
    Promise.all([fetchMedicines(), fetchFamily(), fetchLogs(), fetchMyPatients()]);
  }, []);

  const fetchMedicines = async () => {
    try { const r = await api.get('/medicines'); setMedicines(r.data); } catch {}
  };
  const fetchFamily = async () => {
    try { const r = await api.get('/family'); setFamilyMembers(r.data); } catch {}
  };
  const fetchLogs = async () => {
    setLoading(true);
    try { const r = await api.get('/doses/history'); setLogs(r.data); }
    catch { toast.error('Failed to load dose history.'); }
    finally { setLoading(false); }
  };
  const fetchMyPatients = async () => {
    try { const r = await api.get('/family/caregiver/my-patients'); setMyPatients(r.data || []); } catch {}
  };

  const markDose = async (medicineId, status, caregiverFamilyMemberId = null) => {
    const med = medicines.find(m => m.id === medicineId);
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, medicineId, medicineName: med?.brandName || '', status, scheduledTime: new Date().toISOString(), loggedAt: new Date().toISOString() };
    setLogs(prev => [optimistic, ...prev]);
    try {
      const endpoint = status === 'TAKEN' ? '/doses/taken' : '/doses/missed';
      await api.post(endpoint, { medicineId, ...(caregiverFamilyMemberId ? { caregiverFamilyMemberId } : {}) });
      toast.success(`Dose marked as ${status}.`);
      fetchLogs();
    } catch {
      setLogs(prev => prev.filter(l => l.id !== tempId));
      toast.error('Failed to update dose.');
    }
  };

  const openCaregiverView = async (member) => {
    setCaregiverView(member);
    try { const r = await api.get(`/family/${member.id}/doses`); setCaregiverLogs(r.data); }
    catch { toast.error("Couldn't load patient logs."); }
  };

  // -- Derived data --
  const todayLogs = useMemo(() => {
    const t = new Date();
    return logs.filter(l => {
      const d = new Date(l.scheduledTime || l.loggedAt);
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth();
    });
  }, [logs]);

  const takenToday  = todayLogs.filter(l => l.status === 'TAKEN').length;
  const missedToday = todayLogs.filter(l => l.status === 'MISSED').length;

  // Recent: last 3 days
  const recentLogs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    cutoff.setHours(0, 0, 0, 0);
    return logs.filter(l => new Date(l.scheduledTime || l.loggedAt) >= cutoff);
  }, [logs]);

  // Calendar: group by date key
  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const k = dateKey(l.scheduledTime || l.loggedAt);
      if (!map[k]) map[k] = [];
      map[k].push(l);
    });
    return map;
  }, [logs]);

  const logsForSelectedDate = useMemo(() => {
    if (!selectedCalDate) return [];
    return logsByDate[selectedCalDate] || [];
  }, [selectedCalDate, logsByDate]);

  // Stats computation
  const computeStats = useCallback(() => {
    if (!statsMedicine) { toast.warn('Please select a medicine.'); return; }
    let filtered = logs.filter(l => String(l.medicineId) === String(statsMedicine));
    if (statsFrom) filtered = filtered.filter(l => new Date(l.scheduledTime || l.loggedAt) >= new Date(statsFrom + 'T00:00:00'));
    if (statsTo)   filtered = filtered.filter(l => new Date(l.scheduledTime || l.loggedAt) <= new Date(statsTo + 'T23:59:59'));
    const taken   = filtered.filter(l => l.status === 'TAKEN').length;
    const missed  = filtered.filter(l => l.status === 'MISSED').length;
    const pending = filtered.filter(l => l.status === 'PENDING').length;
    setStatsResult({ total: filtered.length, taken, missed, pending, logs: filtered });
  }, [logs, statsMedicine, statsFrom, statsTo]);

  // -- Calendar helpers --

  const daysInMonth  = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();
  const calYear  = calMonth.getFullYear();
  const calMon   = calMonth.getMonth();
  const prevMonth = () => setCalMonth(new Date(calYear, calMon - 1, 1));
  const nextMonth = () => setCalMonth(new Date(calYear, calMon + 1, 1));

  const isTodayCal = (day) => {
    const now = new Date();
    return day === now.getDate() && calMon === now.getMonth() && calYear === now.getFullYear();
  };

  const calKey = (day) =>
    `${calYear}-${String(calMon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  // -- Caregiver view --

  if (caregiverView) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setCaregiverView(null)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Back
          </button>
          <div>
            <h2 style={{ marginBottom: '2px' }}>{caregiverView.name}'s Dose Log</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Caregiver view · {caregiverView.relation}</p>
          </div>
        </div>
        {caregiverLogs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No dose logs available.</div>
        ) : caregiverLogs.map(log => {
          const s = STATUS[log.status] || STATUS.PENDING;
          return (
            <div key={log.id} className="glass-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.medicineName}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatTime(log.scheduledTime || log.loggedAt)}</div>
                </div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: '9999px', background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {s.icon} {log.status}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // -- Main render --

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '4px' }}>Dose Log</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Track and manage your daily doses</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        {[
          { label: 'Taken Today',  val: takenToday,  color: 'var(--success)', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Missed Today', val: missedToday, color: 'var(--error)',   bg: 'rgba(239,68,68,0.08)'  },
          { label: 'Total Logs',   val: logs.length, color: 'var(--primary)', bg: 'rgba(99,102,241,0.08)' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: s.bg }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick dose entry */}
      {medicines.filter(m => !m.familyMemberId).length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: '14px', fontSize: '0.9rem' }}>Quick Dose Entry — My Medicines</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {medicines.filter(m => !m.familyMemberId).map(med => (
              <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30,41,59,0.6)', borderRadius: '10px', padding: '8px 14px', border: '1px solid var(--surface-border)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{med.brandName}</span>
                  {med.dosage && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', marginLeft: '5px' }}>({med.dosage})</span>}
                </div>
                <button onClick={() => markDose(med.id, 'TAKEN')}
                  style={{ padding: '5px 12px', borderRadius: '9999px', border: 'none', background: 'rgba(16,185,129,0.2)', color: 'var(--success)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} /> Taken
                </button>
                <button onClick={() => markDose(med.id, 'MISSED', familyMembers[0]?.id || null)}
                  style={{ padding: '5px 12px', borderRadius: '9999px', border: 'none', background: 'rgba(239,68,68,0.15)', color: 'var(--error)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={12} /> Missed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family dose section */}
      {familyMembers.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <button onClick={() => setShowFamilyDose(!showFamilyDose)}
            style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, width: '100%' }}>
            <Users size={18} color="var(--primary)" />
            Log Dose for Family Member
            {showFamilyDose ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
          </button>
          {showFamilyDose && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Family Member</label>
                <select className="form-control" value={selectedFamily || ''} onChange={e => setSelectedFamily(Number(e.target.value) || null)}>
                  <option value="">Select member…</option>
                  {familyMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>)}
                </select>
              </div>
              {selectedFamily && (() => {
                const memMeds = medicines.filter(m => String(m.familyMemberId) === String(selectedFamily));
                if (memMeds.length === 0) return (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No medicines assigned. Add medicines for them in My Medicines.</p>
                );
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {memMeds.map(med => (
                      <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30,41,59,0.6)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--surface-border)', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{med.brandName}</span>
                          {med.dosage && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', marginLeft: '6px' }}>({med.dosage})</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => markDose(med.id, 'TAKEN')} style={{ padding: '5px 12px', borderRadius: '9999px', border: 'none', background: 'rgba(16,185,129,0.2)', color: 'var(--success)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>✓ Taken</button>
                          <button onClick={() => markDose(med.id, 'MISSED', selectedFamily)} style={{ padding: '5px 12px', borderRadius: '9999px', border: 'none', background: 'rgba(239,68,68,0.15)', color: 'var(--error)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>✗ Missed</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Caregiver patients */}
      {myPatients.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(99,102,241,0.25)' }}>
          <h4 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={17} color="var(--primary)" /> Patients Under Your Care
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {myPatients.map(p => (
              <button key={p.id} onClick={() => openCaregiverView(p)}
                style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} /> {p.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p.relation})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History section with tabs */}
      <div>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '4px' }}>
          {[
            { id: 'recent',   icon: <List size={14} />,     label: 'Recent (3 days)' },
            { id: 'calendar', icon: <Calendar size={14} />, label: 'Calendar' },
            { id: 'stats',    icon: <BarChart2 size={14} />,label: 'Statistics' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setViewMode(tab.id)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                background: viewMode === tab.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: viewMode === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: viewMode === tab.id ? '0 0 0 1px rgba(99,102,241,0.35)' : 'none',
              }}>
              {tab.icon} <span style={{ display: 'none' }}>{/* mobile: icon only at xs */}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Recent tab */}
        {viewMode === 'recent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading history…</div>
            ) : recentLogs.length === 0 ? (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No doses logged in the last 3 days.
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Showing {recentLogs.length} log{recentLogs.length !== 1 ? 's' : ''} from the last 3 days
                </p>
                {recentLogs.map(log => <LogRow key={log.id} log={log} />)}
              </>
            )}
            {/* Load more — show older logs */}
            {!loading && logs.length > recentLogs.length && (
              <div style={{ marginTop: '8px' }}>
                {!showAllRecent ? (
                  <button onClick={() => setShowAllRecent(true)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--surface-border)', background: 'rgba(99,102,241,0.07)', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    Show all {logs.length} logs →
                  </button>
                ) : (
                  <>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>All logs ({logs.length})</p>
                      <button onClick={() => setShowAllRecent(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}>← Show less</button>
                    </div>
                    {logs.map(log => <LogRow key={log.id} log={log} />)}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar tab */}
        {viewMode === 'calendar' && (() => {
          const cDays = daysInMonth(calYear, calMon);
          const cFirst = firstDayOfMonth(calYear, calMon);
          const totalCells = Math.ceil((cFirst + cDays) / 7) * 7;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#0d1526',
                border: '1px solid rgba(99,102,241,0.35)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {/* Month / Year nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={16} /></button>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--primary)' }}>{MONTHS[calMon]}</span>
                    <span>{calYear}</span>
                  </div>
                  <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={16} /></button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '6px' }}>
                  {DAYS_SHORT.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                  {Array.from({ length: totalCells }).map((_, i) => {
                    const dayNum = i - cFirst + 1;
                    const valid = dayNum >= 1 && dayNum <= cDays;
                    if (!valid) return <div key={i} />;

                    const k = calKey(dayNum);
                    const dl = logsByDate[k] || [];
                    const hasTaken   = dl.some(l => l.status === 'TAKEN');
                    const hasMissed  = dl.some(l => l.status === 'MISSED');
                    const hasPending = dl.some(l => l.status === 'PENDING');
                    const isSelected = selectedCalDate === k;
                    const isToday    = isTodayCal(dayNum);

                    return (
                      <button key={i} onClick={() => setSelectedCalDate(isSelected ? null : k)}
                        style={{
                          padding: '7px 2px', borderRadius: '8px', border: 'none',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : isToday
                            ? 'rgba(99,102,241,0.18)'
                            : 'transparent',
                          color: isSelected ? 'white' : isToday ? 'var(--primary)' : 'rgba(255,255,255,0.85)',
                          fontSize: '0.82rem',
                          fontWeight: isSelected || isToday ? 700 : 400,
                          transition: 'all 0.15s',
                          outline: isToday && !isSelected ? '1px solid rgba(99,102,241,0.4)' : 'none',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(99,102,241,0.18)' : 'transparent'; }}
                      >
                        <span>{dayNum}</span>
                        {dl.length > 0 && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {hasTaken   && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : STATUS.TAKEN.dot }} />}
                            {hasMissed  && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : STATUS.MISSED.dot }} />}
                            {hasPending && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : STATUS.PENDING.dot }} />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend + Today/Clear */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.dot }} />
                        {k}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedCalDate && (
                      <button onClick={() => setSelectedCalDate(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: '2px 6px' }}>
                        Clear
                      </button>
                    )}
                    <button onClick={() => {
                      const t = new Date();
                      setCalMonth(t);
                      setSelectedCalDate(dateKey(t));
                    }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: '2px 6px' }}>
                      Today
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected date detail panel */}
              {selectedCalDate && (
                <div style={{
                  background: '#0d1526',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                      <Calendar size={16} color="var(--primary)" />
                      {formatDateDisplay(selectedCalDate)}
                    </h4>
                    <button onClick={() => setSelectedCalDate(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                  </div>
                  {logsForSelectedDate.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No doses logged on this day.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{logsForSelectedDate.length} dose{logsForSelectedDate.length !== 1 ? 's' : ''} logged</p>
                      {logsForSelectedDate.map(log => <LogRow key={log.id} log={log} compact />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Statistics tab */}
        {viewMode === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', overflow: 'visible' }}>
              <h4 style={{ marginBottom: '16px' }}>Medicine Statistics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                  <label>Select Medicine *</label>
                  <select className="form-control" value={statsMedicine} onChange={e => { setStatsMedicine(e.target.value); setStatsResult(null); }}>
                    <option value="">Choose a medicine…</option>
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.brandName}{m.dosage ? ` (${m.dosage})` : ''}</option>)}
                  </select>
                </div>
                <DatePicker label="From Date" value={statsFrom} onChange={v => { setStatsFrom(v); setStatsResult(null); }} />
                <DatePicker label="To Date" value={statsTo} onChange={v => { setStatsTo(v); setStatsResult(null); }} min={statsFrom} />
                <button className="btn-primary" onClick={computeStats}
                  style={{ alignSelf: 'flex-end', marginBottom: '1px' }}>
                  View Stats
                </button>
              </div>
            </div>

            {/* Stats result */}
            {statsResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                  {[
                    { label: 'Total',   val: statsResult.total,   color: 'var(--primary)', bg: 'rgba(99,102,241,0.08)' },
                    { label: 'Taken',   val: statsResult.taken,   color: 'var(--success)', bg: 'rgba(16,185,129,0.08)' },
                    { label: 'Missed',  val: statsResult.missed,  color: 'var(--error)',   bg: 'rgba(239,68,68,0.08)'  },
                    { label: 'Pending', val: statsResult.pending, color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)' },
                  ].map(s => (
                    <div key={s.label} className="glass-panel" style={{ padding: '14px', textAlign: 'center', background: s.bg }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.val}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {s.label}
                        {s.label !== 'Total' && statsResult.total > 0 && (
                          <> · {Math.round((s.val / statsResult.total) * 100)}%</>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adherence bar */}
                {statsResult.total > 0 && (
                  <div className="glass-panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 600 }}>Adherence Rate</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{Math.round((statsResult.taken / statsResult.total) * 100)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((statsResult.taken / statsResult.total) * 100)}%`, background: 'linear-gradient(90deg, var(--success), #34d399)', borderRadius: '9999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}

                {/* Logs list */}
                {statsResult.logs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{statsResult.logs.length} dose records</p>
                    {statsResult.logs.map(log => <LogRow key={log.id} log={log} />)}
                  </div>
                )}
                {statsResult.logs.length === 0 && (
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No logs found for this medicine in the selected period.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Reusable log row --
function LogRow({ log, compact }) {
  const s = STATUS[log.status] || STATUS.PENDING;
  return (
    <div style={{ padding: compact ? '10px 14px' : '12px 16px', borderRadius: '10px', background: 'rgba(30,41,59,0.5)', border: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.medicineName}</div>
          {!compact && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTime(log.scheduledTime || log.loggedAt)}</div>}
          {compact && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(log.scheduledTime || log.loggedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
        </div>
      </div>
      <span style={{ padding: '3px 9px', borderRadius: '9999px', background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
        {s.icon} {log.status}
      </span>
    </div>
  );
}

const navBtnStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '6px 10px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
};
