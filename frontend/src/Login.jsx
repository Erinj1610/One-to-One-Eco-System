import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './context/AuthContext';
import { Shield, Mail, Lock, AlertCircle, Sparkles } from 'lucide-react';

function Login({ onBypass }) {
  const { loginMock } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Try mock auth first if preset static credentials are used
    if (email === 'admin@onetoone.co.za' && password === 'admin123') {
      loginMock(email);
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth failed or unconfigured, attempting static mock session fallback...", err);
      // Fallback for static mock mode
      if (email.endsWith('@onetoone.co.za') || email.endsWith('@1-to-1.world')) {
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
      background: 'radial-gradient(circle at 50% 0%, #151a3a 0%, #070913 70%)',
      padding: '20px',
      color: '#f3f4f6',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        background: 'rgba(17, 22, 43, 0.75)',
        border: '1px solid rgba(0, 242, 254, 0.15)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '420px',
        width: '100%',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 242, 254, 0.05)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)', marginBottom: '16px' }}>
          <Shield size={32} color="#00f2fe" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 242, 254, 0.4))' }} />
        </div>
        
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700, margin: '0 0 8px 0', background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          1-to-1 World Portal
        </h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
          Authorized staff and client access dashboard.
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', marginBottom: '20px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
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
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)', color: '#070913', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', marginTop: '10px', boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.1)', borderRadius: '8px', padding: '12px', fontSize: '11.5px', color: '#9ca3af', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, color: '#00f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
            <Sparkles size={12} /> Static Demo Sandbox
          </div>
          Use <strong>admin@onetoone.co.za</strong> with password <strong>admin123</strong> to log in.
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={onBypass} 
            style={{ background: 'transparent', border: 'none', color: '#4facfe', cursor: 'pointer', fontSize: '11.5px', textDecoration: 'underline' }}
          >
            Direct Developer Bypass
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
