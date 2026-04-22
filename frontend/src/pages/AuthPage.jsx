import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { ShieldCheck, Zap, Bell, FileText, Brain, HeartPulse, X, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../api';

const FEATURES = [
  { icon: <ShieldCheck size={16} />, text: 'FDA-backed drug interaction checks' },
  { icon: <Brain size={16} />,       text: 'AI health assistant (English & Hindi)' },
  { icon: <Bell size={16} />,        text: 'Smart medicine reminders via email' },
  { icon: <FileText size={16} />,    text: 'PDF health reports for your doctor' },
  { icon: <Zap size={16} />,         text: 'Instant interaction detection' },
  { icon: <HeartPulse size={16} />,  text: 'Family medicine management' },
];

// -- OTP Input Component --
function OtpInput({ value, onChange }) {
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = value.split('');
    next[i] = val;
    onChange(next.join(''));
    if (val && i < 3) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) refs[i - 1].current?.focus();
    if (e.key === 'ArrowRight' && i < 3) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      onChange(pasted.padEnd(4, '').slice(0, 4));
      const lastFilled = Math.min(pasted.length, 3);
      refs[lastFilled].current?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '24px 0' }}>
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`otp-input${value[i] ? ' filled' : ''}`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// -- Main AuthPage --
export default function AuthPage() {
  // 'auth' | 'verify'
  const [step, setStep]           = useState('auth');
  const [isLogin, setIsLogin]     = useState(true);
  const [formData, setFormData]   = useState({ name: '', email: '', password: '' });
  const [loading, setLoading]     = useState(false);

  // OTP verification state
  const [pendingEmail, setPendingEmail]     = useState('');
  const [otp, setOtp]                       = useState('');
  const [otpLoading, setOtpLoading]         = useState(false);
  const [resendLoading, setResendLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password
  const [showForgot, setShowForgot]         = useState(false);
  const [forgotEmail, setForgotEmail]       = useState('');
  const [forgotLoading, setForgotLoading]   = useState(false);

  // -- Auth form submit --
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && formData.name.trim().length < 2) {
      toast.warn('Please enter your full name.'); return;
    }
    if (!formData.email.includes('@')) {
      toast.warn('Please enter a valid email address.'); return;
    }
    if (formData.password.length < 6) {
      toast.warn('Password must be at least 6 characters.'); return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
        localStorage.setItem('medsafe_token', res.data.token);
        localStorage.setItem('medsafe_profile', JSON.stringify({
          name: res.data.name,
          email: res.data.email,
          phone: '',
        }));
        toast.success('Welcome back, ' + res.data.name + '!');
        window.location.href = '/';
      } else {
        const res = await api.post('/auth/register', formData);
        if (res.data.requiresVerification) {
          setPendingEmail(formData.email);
          setOtp('');
          setStep('verify');
          toast.info(res.data.emailSent
            ? '📧 OTP sent to your email!'
            : '⚠️ Email delivery failed. Use Resend OTP below.');
        } else {
          toast.success('Account created! Please sign in.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Something went wrong.';
      if (err.response?.status === 403 && err.response?.data?.requiresVerification) {
        setPendingEmail(formData.email);
        setOtp('');
        setStep('verify');
        toast.warn('Please verify your email first.');
      } else {
        toast.error(typeof msg === 'string' ? msg : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // -- OTP submit --
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      toast.warn('Please enter the 4-digit OTP.'); return;
    }
    setOtpLoading(true);
    try {
      await api.post('/auth/verify-email', { email: pendingEmail, otp });
      toast.success('✅ Email verified! Please sign in.');
      setStep('auth');
      setIsLogin(true);
      setFormData(f => ({ ...f, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // -- Resend OTP --
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { email: pendingEmail });
      toast.success('New OTP sent! Check your inbox.');
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // -- Forgot password --
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.includes('@')) { toast.warn('Enter a valid email address.'); return; }
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('If your email is registered, a temporary password has been sent!');
      setShowForgot(false);
      setForgotEmail('');
    } catch {
      toast.error('Could not process request. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // -- OTP Verification Screen --
  if (step === 'verify') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease',
        }}>
          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <Mail size={28} color="white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Verify your email</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              We sent a 4-digit OTP to<br />
              <strong style={{ color: 'var(--text-main)' }}>{pendingEmail}</strong>
            </p>
          </div>

          <form onSubmit={handleOtpSubmit}>
            <OtpInput value={otp} onChange={setOtp} />

            <button
              type="submit"
              className="btn-primary"
              disabled={otpLoading || otp.length !== 4}
              style={{ width: '100%', padding: '13px', fontSize: '1rem' }}
            >
              {otpLoading ? 'Verifying…' : (
                <><CheckCircle size={17} /> Verify Email</>
              )}
            </button>
          </form>

          {/* Resend */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '10px' }}>
              Didn't receive the OTP?
            </p>
            <button
              onClick={handleResendOtp}
              disabled={resendLoading || resendCooldown > 0}
              style={{
                background: 'none', border: 'none',
                color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.88rem', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              {resendLoading
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</>
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : <><RefreshCw size={14} /> Resend OTP</>}
            </button>
          </div>

          {/* Back */}
          <p style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={() => { setStep('auth'); setIsLogin(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.84rem' }}
            >
              ← Back to sign up
            </button>
          </p>
        </div>

        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // -- Main Auth Screen (Login / Register) --
  return (
    <div className="auth-layout" style={{
      minHeight: '100vh', display: 'grid',
      gridTemplateColumns: '1fr 1fr',
    }}>
      {/* Left panel — branding */}
      <div className="auth-branding" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/logo.png"
            alt="MedSafe AI"
            style={{ width: '72px', height: '72px', borderRadius: '18px', objectFit: 'cover' }}
          />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'white' }}>
            MedSafe AI
          </span>
        </div>

        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.15, margin: 0, color: 'white' }}>
            Medicine safety,{' '}
            <span style={{ color: '#2dd4bf' }}>powered by AI</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginTop: '16px', lineHeight: 1.6 }}>
            Track your medicines, detect dangerous interactions, and get AI-powered explanations — designed for patients across India.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
              }}>
                {f.icon}
              </div>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', background: 'rgba(0,0,0,0.3)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ marginBottom: '6px', fontFamily: 'var(--font-display)', fontSize: '1.8rem' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '28px' }}>
            {isLogin ? 'Sign in to your MedSafe account.' : 'Fill in the details below to get started.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isLogin && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Full Name</label>
                <input
                  type="text" className="form-control" placeholder="Aarav Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email Address</label>
              <input
                type="email" className="form-control" placeholder="you@email.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    style={{ background: 'none', border: 'none', color: '#2dd4bf', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password" className="form-control" placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {/* Email verification note for registration */}
            {!isLogin && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <Mail size={14} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--primary)' }} />
                <span>We'll send a 4-digit OTP to verify your email before you can sign in.</span>
              </div>
            )}

            <button
              type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: '1rem', marginTop: '4px' }}
            >
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account & Send OTP'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setFormData({ name: '', email: '', password: '' }); }}
              style={{ background: 'none', border: 'none', color: '#2dd4bf', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', padding: 0 }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
            By continuing you agree to our Terms of Service and Privacy Policy.
            MedSafe AI is not a substitute for professional medical advice.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div
          onClick={e => e.target === e.currentTarget && setShowForgot(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
        >
          <div style={{
            background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', width: '100%', maxWidth: '420px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <Mail size={18} color="var(--primary)" /> Reset Password
              </h3>
              <button onClick={() => setShowForgot(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Enter the email address associated with your account. We'll send you a temporary password that expires in 30 minutes.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Email Address</label>
                <input
                  type="email" className="form-control" placeholder="you@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowForgot(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={forgotLoading}>
                  {forgotLoading ? 'Sending…' : 'Send Temporary Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .auth-layout {
            grid-template-columns: 1fr !important;
          }
          .auth-branding {
            display: none !important;
          }
          .auth-form-panel {
            padding: 24px 20px !important;
            border-left: none !important;
            min-height: 100vh;
            background: transparent !important;
          }
          .auth-form-panel > div {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
