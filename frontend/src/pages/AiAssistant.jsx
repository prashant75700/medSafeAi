import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

const DAILY_LIMIT = 20;

/** Key is per-user per-day (uses stored email) */
function todayKey() {
  try {
    const p = JSON.parse(localStorage.getItem('medsafe_profile') || localStorage.getItem('medsafe_user') || '{}');
    const id = p.email || 'anon';
    return `medsafe_ai_count_${id}_${new Date().toDateString()}`;
  } catch { return `medsafe_ai_count_anon_${new Date().toDateString()}`; }
}

function getRemainingMessages() {
  return Math.max(0, DAILY_LIMIT - parseInt(localStorage.getItem(todayKey()) || '0', 10));
}

function incrementMessageCount() {
  const k = todayKey();
  localStorage.setItem(k, String(parseInt(localStorage.getItem(k) || '0', 10) + 1));
}

const WELCOME = {
  role: 'assistant',
  content: "Hello! I'm MedSafe AI, your personal medicine assistant. I can answer questions about drug safety, dosage, and health — with Indian medicine names in mind. How can I help you today?",
  ts: new Date(),
};

const SUGGESTIONS = [
  'Is it safe to take Paracetamol and Ibuprofen together?',
  'What are the side effects of Metformin?',
  'Can I drink alcohol while taking Azithromycin?',
  'What is the difference between generic and brand medicine?',
];

export default function AiAssistant() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('medsafe_ai_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [WELCOME, ...parsed.map(m => ({ ...m, ts: new Date(m.ts) }))];
      }
    } catch (_) {}
    return [WELCOME];
  });
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [remaining, setRemaining] = useState(getRemainingMessages());
  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const toSave = messages.slice(1).slice(-30);
    localStorage.setItem('medsafe_ai_history', JSON.stringify(toSave));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (questionOverride) => {
    const question = (questionOverride ?? input).trim();
    if (!question) return;
    if (remaining <= 0) {
      toast.error('Daily message limit reached (20/day). Try again tomorrow.');
      return;
    }
    if (question.length > 500) { toast.warn('Message too long. Max 500 characters.'); return; }

    setMessages(prev => [...prev, { role: 'user', content: question, ts: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      incrementMessageCount();
      setRemaining(getRemainingMessages());
      const res = await api.post('/ai/ask', { question });
      const answer = res.data?.answer || 'Sorry, no response received.';
      setMessages(prev => [...prev, { role: 'assistant', content: answer, ts: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        ts: new Date(), error: true,
      }]);
    } finally { setLoading(false); }
  };

  const clearHistory = () => {
    setMessages([WELCOME]);
    localStorage.removeItem('medsafe_ai_history');
    toast.success('Chat history cleared.');
  };

  const formatTime = d => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={22} color="var(--primary)" />
            AI Health Assistant
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Powered by NVIDIA AI
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '6px 14px', borderRadius: '9999px',
            background: remaining <= 5 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)',
            border: `1px solid ${remaining <= 5 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            color: remaining <= 5 ? 'var(--error)' : 'var(--success)',
            fontSize: '0.78rem', fontWeight: 600,
          }}>
            {remaining}/{DAILY_LIMIT} msgs today
          </div>
          <button onClick={clearHistory}
            style={{ background:'transparent', border:'1px solid var(--surface-border)', color:'var(--text-muted)', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.8rem' }}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'16px', padding:'4px 4px 16px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap:'4px' }}>
            {msg.role === 'assistant' && (
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--secondary))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Sparkles size={12} color="white" />
                </div>
                <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:600 }}>MedSafe AI</span>
              </div>
            )}
            <div style={{
              maxWidth:'80%', padding:'12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg,var(--primary),var(--secondary))'
                : msg.error ? 'rgba(239,68,68,0.1)' : 'rgba(30,41,59,0.8)',
              border: msg.role === 'assistant' ? `1px solid ${msg.error ? 'rgba(239,68,68,0.3)' : 'var(--surface-border)'}` : 'none',
              color:'var(--text-main)', fontSize:'0.9rem', lineHeight:1.6,
              whiteSpace:'pre-wrap', wordBreak:'break-word',
            }}>
              {msg.content}
            </div>
            <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{formatTime(msg.ts)}</span>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'linear-gradient(135deg,var(--primary),var(--secondary))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Sparkles size={12} color="white" />
            </div>
            <div style={{ padding:'14px 18px', borderRadius:'4px 18px 18px 18px', background:'rgba(30,41,59,0.8)', border:'1px solid var(--surface-border)' }}>
              <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                {[0,1,2].map(j => (
                  <div key={j} style={{ width:'7px', height:'7px', borderRadius:'50%', background:'var(--primary)', opacity:0.7, animation:`bounce 1.2s ease-in-out ${j*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'8px' }}>
            <p style={{ color:'var(--text-muted)', fontSize:'0.8rem', textAlign:'center' }}>Try asking:</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', justifyContent:'center' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ padding:'8px 14px', borderRadius:'10px', border:'1px solid var(--surface-border)', background:'rgba(30,41,59,0.5)', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.8rem', textAlign:'left', transition:'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--text-main)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor='var(--surface-border)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, background:'rgba(15,23,42,0.8)', backdropFilter:'blur(12px)', border:'1px solid var(--surface-border)', borderRadius:'16px', padding:'12px 16px', display:'flex', alignItems:'flex-end', gap:'10px' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value.slice(0, 500))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about medicine safety, dosage, interactions..."
          rows={1}
          disabled={loading || remaining <= 0}
          style={{ flex:1, background:'transparent', border:'none', color:'var(--text-main)', fontSize:'0.9rem', resize:'none', outline:'none', fontFamily:'var(--font-sans)', lineHeight:1.5, maxHeight:'120px', overflowY:'auto' }}
        />
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{input.length}/500</span>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim() || remaining <= 0}
            style={{ background: input.trim() && !loading && remaining > 0 ? 'linear-gradient(135deg,var(--primary),var(--secondary))' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'10px', padding:'10px 12px', cursor: input.trim() && !loading && remaining > 0 ? 'pointer' : 'not-allowed', color:'white', display:'flex', alignItems:'center', gap:'6px', transition:'all 0.2s', fontSize:'0.85rem', fontWeight:600 }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
