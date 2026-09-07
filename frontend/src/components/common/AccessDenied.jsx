import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export default function AccessDenied({ module = 'Module' }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '24px'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        padding: '36px 30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(20, 24, 33, 0.95) 100%)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <ShieldAlert size={32} color="#ef4444" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          Access Restricted
        </h2>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '11.5px',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          <Lock size={12} /> {module}: No Access
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          Your account does not currently have permissions to view or interact with the <strong>{module}</strong> module.
          If you believe this is an error or need access to this workspace, please contact your administrator.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
