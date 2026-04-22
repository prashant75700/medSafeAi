import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/**
 * Props:
 *   value     – string "YYYY-MM-DD" or ""
 *   onChange  – (value: string) => void
 *   label     – string
 *   min       – "YYYY-MM-DD" (optional)
 *   placeholder – string
 */
export default function DatePicker({ value, onChange, label, min, placeholder = 'dd-mm-yyyy' }) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState(() => {
    if (value) {
      const d = new Date(value);
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = value ? new Date(value + 'T00:00:00') : null;
  const minDate  = min   ? new Date(min  + 'T00:00:00') : null;

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay    = (y, m) => new Date(y, m, 1).getDay();

  const isSameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isDisabled = (d) => minDate && d < minDate;

  const prevMonth = () =>
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () =>
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const selectDay = (day) => {
    const d = new Date(view.year, view.month, day);
    if (isDisabled(d)) return;
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  const displayValue = value
    ? (() => {
        const d = new Date(value + 'T00:00:00');
        return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
      })()
    : '';

  const totalCells = Math.ceil((firstDay(view.year, view.month) + daysInMonth(view.year, view.month)) / 7) * 7;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && (
        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
          {label}
        </label>
      )}

      {/* Trigger input */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(15,23,42,0.6)', border: `1px solid ${open ? 'var(--primary)' : 'var(--surface-border)'}`,
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
          color: displayValue ? 'var(--text-main)' : '#475569',
          padding: '11px 14px', borderRadius: '10px', cursor: 'pointer',
          fontSize: '0.9rem', transition: 'all 0.2s',
          fontFamily: 'monospace',
        }}
      >
        <span>{displayValue || placeholder}</span>
        <Calendar size={15} color={open ? 'var(--primary)' : '#475569'} />
      </div>

      {/* Calendar popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
          background: '#0d1526',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          minWidth: '280px',
          animation: 'calFadeIn 0.15s ease',
        }}>
          {/* Month / Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button onClick={prevMonth} style={navBtnStyle}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem',
              color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--primary)' }}>{MONTHS[view.month]}</span>
              <span>{view.year}</span>
            </div>
            <button onClick={nextMonth} style={navBtnStyle}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '6px' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700,
                color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const dayNum = i - firstDay(view.year, view.month) + 1;
              const valid  = dayNum >= 1 && dayNum <= daysInMonth(view.year, view.month);
              if (!valid) return <div key={i} />;
              const dayDate = new Date(view.year, view.month, dayNum);
              const isSel   = isSameDay(dayDate, selected);
              const isToday = isSameDay(dayDate, new Date());
              const disabled = isDisabled(dayDate);
              return (
                <button
                  key={i}
                  onClick={() => selectDay(dayNum)}
                  disabled={disabled}
                  style={{
                    padding: '7px 4px', borderRadius: '8px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isSel
                      ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                      : isToday
                      ? 'rgba(99,102,241,0.18)'
                      : 'transparent',
                    color: isSel ? 'white' : disabled ? 'rgba(255,255,255,0.2)' : isToday ? 'var(--primary)' : 'rgba(255,255,255,0.85)',
                    fontSize: '0.82rem', fontWeight: isSel || isToday ? 700 : 400,
                    transition: 'all 0.15s',
                    outline: isToday && !isSel ? '1px solid rgba(99,102,241,0.4)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isSel && !disabled) e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                  onMouseLeave={e => { if (!isSel && !disabled) e.currentTarget.style.background = 'transparent'; }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Today / Clear */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <button onClick={() => { onChange(''); setOpen(false); }} style={footBtnStyle}>Clear</button>
            <button onClick={() => {
              const t = new Date();
              onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`);
              setOpen(false);
            }} style={{ ...footBtnStyle, color: 'var(--primary)' }}>Today</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes calFadeIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '5px 8px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
};
const footBtnStyle = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px',
  borderRadius: '6px', transition: 'color 0.15s',
};
