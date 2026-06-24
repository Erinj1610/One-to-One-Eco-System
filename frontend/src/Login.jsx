import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from './context/AuthContext';
import { Mail, Lock, AlertCircle, Sparkles, KeyRound } from 'lucide-react';

function Login({ onBypass }) {
  const { loginMock } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const isProd = import.meta.env.MODE === 'production' || import.meta.env.VITE_ENV === 'production';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (forgotMode) {
      try {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent! Check your inbox.");
      } catch (err) {
        setError(err.message || "Failed to send reset email. Verify your connection.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Try mock auth first if preset static credentials are used in non-production
    if (!isProd && email === 'admin@onetoone.co.za' && password === 'admin123') {
      loginMock(email);
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth failed or unconfigured, attempting static mock session fallback...", err);
      // Fallback for static mock mode in non-production
      if (!isProd && (email.endsWith('@onetoone.co.za') || email.endsWith('@1-to-1.world'))) {
        loginMock(email);
      } else {
        setError("Invalid credentials or authentication server offline. Hint: use admin@onetoone.co.za / admin123");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(rgba(15, 14, 18, 0.45), rgba(15, 14, 18, 0.75)), url('/project_background.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '20px',
      color: '#f3f4f6',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        background: 'rgba(15, 14, 18, 0.85)',
        border: '1px solid rgba(224, 153, 36, 0.25)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '420px',
        width: '100%',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 50px rgba(224, 153, 36, 0.12)',
        textAlign: 'center'
      }}>
        
        {/* Logo Icon Container */}
        <div style={{ display: 'inline-flex', padding: '4px', borderRadius: '50%', background: 'rgba(224, 153, 36, 0.15)', marginBottom: '20px', boxShadow: '0 0 15px rgba(224, 153, 36, 0.2)' }}>
          <img 
            src="https://static.wixstatic.com/media/4df047_59443c36dca74168856bb30e346ef89c%7Emv2.jpg/v1/fill/w_180%2Ch_180%2Clg_1%2Cusm_0.66_1.00_0.01/4df047_59443c36dca74168856bb30e346ef89c%7Emv2.jpg" 
            alt="One to One Logo" 
            style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>
        
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, margin: '0 0 4px 0', color: '#ffffff', letterSpacing: '1px' }}>
          ONE TO ONE
        </h1>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '3px', color: '#e09924', fontWeight: 600, marginBottom: '28px' }}>
          BY MARTIN DÖLLER
        </p>

        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>
          {forgotMode ? 'Reset Your Password' : 'Sign In to Portal'}
        </h3>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', marginBottom: '20px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', marginBottom: '20px' }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: '6px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
              <input 
                type="email" 
                placeholder="name@onetoone.co.za" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '13.5px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#e09924'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          </div>

          {!forgotMode && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af' }}>Password</label>
                <button 
                  type="button"
                  onClick={() => setForgotMode(true)}
                  style={{ background: 'transparent', border: 'none', color: '#e09924', cursor: 'pointer', fontSize: '11.5px', textDecoration: 'none', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '13.5px', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#e09924'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #e09924 0%, #b8730b 100%)', color: '#ffffff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', marginTop: '10px', boxShadow: '0 4px 12px rgba(224, 153, 36, 0.15)' }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {loading ? 'Processing...' : (forgotMode ? 'Send Reset Link' : 'Sign In')}
          </button>
        </form>

        {forgotMode && (
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => { setForgotMode(false); setMessage(null); setError(null); }}
              style={{ background: 'transparent', border: 'none', color: '#e09924', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {!isProd && !forgotMode && (
          <>
            <div style={{ marginTop: '24px', background: 'rgba(224, 153, 36, 0.03)', border: '1px solid rgba(224, 153, 36, 0.08)', borderRadius: '8px', padding: '12px', fontSize: '11.5px', color: '#9ca3af', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, color: '#e09924', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
                <Sparkles size={12} /> Static Demo Sandbox
              </div>
              Use <strong>admin@onetoone.co.za</strong> with password <strong>admin123</strong> to log in.
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={onBypass} 
                style={{ background: 'transparent', border: 'none', color: '#e09924', cursor: 'pointer', fontSize: '11.5px', textDecoration: 'underline' }}
              >
                Direct Developer Bypass
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
