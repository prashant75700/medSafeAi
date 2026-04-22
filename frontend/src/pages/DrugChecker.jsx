import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

// Indian brand to generic mapping (Client Side augmentation)
export const INDIAN_DRUGS = {
  // Pain & Fever
  crocin: 'paracetamol', dolo: 'paracetamol', calpol: 'paracetamol',
  'dolo 650': 'paracetamol', combiflam: 'ibuprofen', brufen: 'ibuprofen',
  nise: 'nimesulide', nimulid: 'nimesulide', voveran: 'diclofenac',
  meftal: 'mefenamic acid', drotin: 'drotaverine', buscopan: 'hyoscine',
  // Antibiotics
  augmentin: 'amoxicillin', clavam: 'amoxicillin', mox: 'amoxicillin',
  azee: 'azithromycin', zithromax: 'azithromycin',
  cifran: 'ciprofloxacin', ciplox: 'ciprofloxacin',
  'taxim-o': 'cefixime', zifi: 'cefixime', monocef: 'ceftriaxone',
  metrogyl: 'metronidazole', flagyl: 'metronidazole',
  doxrid: 'doxycycline', vibramycin: 'doxycycline',
  // Antacids / GI
  'pan 40': 'pantoprazole', pantocid: 'pantoprazole',
  omez: 'omeprazole', ocid: 'omeprazole',
  rablet: 'rabeprazole', rabeloc: 'rabeprazole',
  aciloc: 'ranitidine', zinetac: 'ranitidine',
  // Antihistamines
  allegra: 'fexofenadine', okacet: 'cetirizine',
  levocet: 'levocetirizine', xyzal: 'levocetirizine',
  atarax: 'hydroxyzine', avil: 'pheniramine',
  // Cardiovascular
  ecosprin: 'aspirin', loprin: 'aspirin',
  deplatt: 'clopidogrel', plavix: 'clopidogrel',
  telma: 'telmisartan', micardis: 'telmisartan',
  stamlo: 'amlodipine', norvasc: 'amlodipine', amlip: 'amlodipine',
  atorva: 'atorvastatin', lipitor: 'atorvastatin',
  rosuvas: 'rosuvastatin', crestor: 'rosuvastatin',
  cardace: 'ramipril', repace: 'losartan', olmat: 'olmesartan',
  metolar: 'metoprolol', tenormin: 'atenolol',
  lasix: 'furosemide', aldactone: 'spironolactone', lanoxin: 'digoxin',
  acitrom: 'acenocoumarol', clexane: 'enoxaparin',
  // Diabetes
  glycomet: 'metformin', glucophage: 'metformin',
  amaryl: 'glimepiride', gemer: 'glimepiride',
  januvia: 'sitagliptin', jardiance: 'empagliflozin',
  forxiga: 'dapagliflozin', volix: 'voglibose',
  // Thyroid
  thyronorm: 'levothyroxine', eltroxin: 'levothyroxine',
  // Respiratory
  asthalin: 'salbutamol', ventolin: 'salbutamol',
  seroflo: 'fluticasone', duolin: 'levosalbutamol',
  // Psychiatric / Neuro
  nexito: 'escitalopram', stalopam: 'escitalopram',
  stugeron: 'cinnarizine', vertin: 'betahistine',
  // Steroids
  wysolone: 'prednisolone', dexa: 'dexamethasone',
  // Vitamins / Supplements
  shelcal: 'calcium', becosules: 'b complex', revital: 'multivitamin',
  folvite: 'folic acid', zincovit: 'zinc',
};

export function resolveGeneric(name) {
  const lower = name.toLowerCase().trim();
  return INDIAN_DRUGS[lower] || lower;
}

const HIST_KEY = 'medsafe_drug_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 20)));
}

export default function DrugChecker() {
  const [drugs, setDrugs] = useState(['', '']);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const addDrug = () => drugs.length < 6 && setDrugs([...drugs, '']);
  const removeDrug = (i) => drugs.length > 2 && setDrugs(drugs.filter((_, idx) => idx !== i));
  const setDrug = (i, v) => { const d = [...drugs]; d[i] = v; setDrugs(d); };

  const check = async () => {
    const valid = drugs.map((d) => d.trim()).filter(Boolean);
    if (valid.length < 2) { toast.warn('Please enter at least 2 drug names.'); return; }

    setLoading(true);
    setResults(null);
    try {
      const res = await api.post('/interactions/check', { drugs: valid });
      setResults(res.data);

      // Save to history
      const entry = {
        drugs: valid,
        resolvedDrugs: valid.map(resolveGeneric),
        results: res.data,
        ts: new Date().toISOString(),
        interactionCount: res.data.length,
      };
      const updated = [entry, ...loadHistory().filter((h) => h.drugs.join(',') !== valid.join(','))];
      saveHistory(updated);
      setHistory(updated);

      if (res.data.length === 0) toast.success('No significant interactions found.');
      else toast.warn(`${res.data.length} interaction(s) detected!`);
    } catch (err) {
      toast.error('Failed to check interactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryEntry = (idx) => {
    const updated = history.filter((_, i) => i !== idx);
    saveHistory(updated);
    setHistory(updated);
  };

  const clearAllHistory = () => {
    saveHistory([]);
    setHistory([]);
    toast.success('History cleared.');
  };

  const rerunSearch = (entry) => {
    setDrugs(entry.drugs);
    setResults(entry.results);
    setShowHistory(false);
    window.scrollTo(0, 0);
  };

  const severityColor = { MINOR: 'var(--success)', MODERATE: 'var(--warning)', MAJOR: 'var(--error)', SEVERE: '#7f1d1d' };
  const severityBg = { MINOR: 'rgba(16,185,129,0.1)', MODERATE: 'rgba(245,158,11,0.1)', MAJOR: 'rgba(239,68,68,0.1)', SEVERE: 'rgba(127,29,29,0.2)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '4px' }}>Drug Interaction Checker</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          FDA-powered — supports US generic names and popular Indian brand names (Crocin, Dolo, Allegra, etc.)
        </p>
      </div>

      {/* Input panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Enter drug names (brand or generic):</div>

        {drugs.map((d, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={d}
                onChange={(e) => setDrug(i, e.target.value)}
                placeholder={`Drug ${i + 1} — e.g. Crocin, Warfarin, Metformin…`}
                className="form-control"
                onKeyDown={(e) => e.key === 'Enter' && check()}
                list={`drug-suggestions-${i}`}
              />
              <datalist id={`drug-suggestions-${i}`}>
                {Object.keys(INDIAN_DRUGS).slice(0, 50).map((n) => (
                  <option key={n} value={n.charAt(0).toUpperCase() + n.slice(1)} />
                ))}
              </datalist>
            </div>
            {drugs.length > 2 && (
              <button onClick={() => removeDrug(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>
                ✕
              </button>
            )}
            {d && INDIAN_DRUGS[d.toLowerCase().trim()] && (
              <span style={{ fontSize: '0.72rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                → {INDIAN_DRUGS[d.toLowerCase().trim()]}
              </span>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={check} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Checking…</>
            ) : (
              <><Zap size={16} /> Check Interactions</>
            )}
          </button>
          {drugs.length < 6 && (
            <button className="btn-secondary" onClick={addDrug} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add Drug
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map((n) => (
            <div key={n} style={{ height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
        </div>
      )}

      {/* Results */}
      {results !== null && !loading && (
        <div>
          {results.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
              <CheckCircle size={40} color="var(--success)" style={{ marginBottom: '12px' }} />
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>No significant interactions found</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Always consult your doctor or pharmacist to be safe.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> {results.length} Interaction(s) Detected
              </h3>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="glass-panel"
                  style={{ padding: '20px', borderLeft: `4px solid ${severityColor[r.severity] || 'var(--warning)'}`, background: severityBg[r.severity] }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ margin: 0 }}>{r.drugA} + {r.drugB}</h4>
                    <span className={`badge badge-${r.severity.toLowerCase()}`}>{r.severity}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', marginBottom: '10px', lineHeight: 1.6 }}>
                    <strong>FDA Warning:</strong> {r.description}
                  </p>
                  {r.aiExplanation && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--primary)' }}>MedSafe AI:</strong> {r.aiExplanation}
                    </div>
                  )}
                  {r.foodWarnings && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      🍽️ {r.foodWarnings}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600 }}
            >
              <Clock size={18} /> Search History ({history.length})
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={clearAllHistory}
              style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>

          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((entry, i) => (
                <div
                  key={i}
                  className="glass-panel"
                  style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  onClick={() => rerunSearch(entry)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{entry.drugs.join(' + ')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(entry.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {entry.interactionCount === 0
                        ? <span style={{ color: 'var(--success)' }}>No interactions</span>
                        : <span style={{ color: 'var(--error)' }}>{entry.interactionCount} interaction(s)</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(i); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Delete this entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
