import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!oobCode) {
      setError("Invalid link. The password reset link is missing its security code.");
      setVerifying(false);
      return;
    }

    // Verify the password reset code and retrieve the user's email address
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setVerifying(false);
      })
      .catch((err) => {
        console.error(err);
        setError("This password setup link has expired or has already been used. Please request a new invitation.");
        setVerifying(false);
      });
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to set new password. Please try again.");
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
        {/* Logo Container */}
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

        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#fff' }}>
          Setup Account Password
        </h3>

        {verifying ? (
          <div style={{ fontSize: '13px', color: '#9ca3af', margin: '20px 0' }}>
            Verifying invitation details...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '12px', color: '#fca5a5', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            <button 
              onClick={() => navigate('/')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
            >
              <ArrowLeft size={16} /> Back to Portal
            </button>
          </div>
        ) : success ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '12px', color: '#86efac', fontSize: '13px', marginBottom: '25px', textAlign: 'left' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>Password set successfully! Your account is now fully set up.</span>
            </div>
            <button 
              onClick={() => navigate('/')}
              style={{ width: '100%', background: '#e09924', border: 'none', color: '#000', padding: '12px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
            >
              Login to Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px', textAlign: 'center' }}>
              Setting up password for:<br /><strong>{email}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#e09924' }} />
                <input 
                  type="password" 
                  required
                  placeholder="At least 6 characters" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px 10px 38px', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#e09924' }} />
                <input 
                  type="password" 
                  required
                  placeholder="Confirm password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px 10px 38px', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', background: '#e09924', border: 'none', color: '#000', padding: '12px 16px', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', marginBottom: '15px' }}
            >
              {loading ? "Saving..." : "Set Password & Complete Setup"}
            </button>

            <button 
              type="button"
              onClick={() => navigate('/')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
