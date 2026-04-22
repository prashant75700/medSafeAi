import { useState } from 'react';

const TIME_GRID = {
  'Morning ☀️': ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'],
  'Afternoon 🌤️': ['12:00', '13:00', '14:00', '15:00', '16:00'],
  'Evening 🌆': ['17:00', '18:00', '19:00', '20:00'],
  'Night 🌙': ['21:00', '22:00', '23:00', '00:00'],
};

export default function TimePicker({ value, onChange, label = 'Dose Time Slots' }) {
  const parse = (v) => (v ? v.split(',').map((t) => t.trim()).filter(Boolean) : []);
  const [selected, setSelected] = useState(parse(value));
  const [customH, setCustomH] = useState('08');
  const [customM, setCustomM] = useState('00');

  const toggle = (t) => {
    const next = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t].sort();
    setSelected(next);
    onChange(next.join(','));
  };

  const addCustom = () => {
    const t = `${customH}:${customM}`;
    if (!selected.includes(t)) {
      const next = [...selected, t].sort();
      setSelected(next);
      onChange(next.join(','));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>

      {Object.entries(TIME_GRID).map(([period, times]) => (
        <div key={period}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>{period}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {times.map((t) => {
              const active = selected.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--surface-border)'}`,
                    background: active ? 'rgba(99,102,241,0.18)' : 'rgba(15,23,42,0.5)',
                    color: active ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: active ? '700' : '400',
                    transition: 'all 0.18s ease',
                    fontFamily: 'monospace',
                    letterSpacing: '0.02em',
                    boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.35)' : 'none',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom time row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--surface-border)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Custom:</span>
        <select
          value={customH}
          onChange={(e) => setCustomH(e.target.value)}
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--surface-border)', color: 'var(--text-main)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.85rem', fontFamily: 'monospace' }}
        >
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>:</span>
        <select
          value={customM}
          onChange={(e) => setCustomM(e.target.value)}
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--surface-border)', color: 'var(--text-main)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.85rem', fontFamily: 'monospace' }}
        >
          {['00', '15', '30', '45'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addCustom}
          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
          onMouseOut={(e) => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.color = 'var(--text-muted)'; }}
        >
          + Add
        </button>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.07)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ✓ {selected.length} dose{selected.length > 1 ? 's' : ''} scheduled daily
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selected.map((t) => (
              <span
                key={t}
                style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '1rem', opacity: 0.7 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '8px' }}>
          Tap a time above to schedule doses
        </div>
      )}
    </div>
  );
}
