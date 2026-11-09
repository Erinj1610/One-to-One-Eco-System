import React, { useState, useEffect } from 'react';
import { Bell, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [subContext, setSubContext] = useState(null);

  // Listen for active workspace / quotation breadcrumb changes dispatched by modules
  useEffect(() => {
    const handleContextChange = (e) => {
      if (e.detail?.subContext) {
        setSubContext(e.detail.subContext);
      } else {
        setSubContext(null);
      }
    };

    window.addEventListener('portal-context-change', handleContextChange);
    return () => window.removeEventListener('portal-context-change', handleContextChange);
  }, []);

  // Clear sub-context whenever route changes
  useEffect(() => {
    setSubContext(null);
  }, [location.pathname]);

  const email = user?.email || '';
  let initials = 'U';
  if (email && email.includes('@')) {
    const localPart = email.split('@')[0];
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      initials = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    } else {
      initials = localPart.substring(0, 2).toUpperCase();
    }
  }

  return (
    <div className="topbar">
      <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {title || 'Portal'}
        </span>
        {subContext && (
          <>
            <ChevronRight size={14} color="#94a3b8" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500', color: '#64748b' }}>
              {subContext}
            </span>
          </>
        )}
      </div>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease, color 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          title="Notifications"
        >
          <Bell size={17} />
        </button>

        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '3px 10px 3px 4px',
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.03)',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="av" title={email}>{initials}</div>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 500,
            color: 'var(--text-primary)', 
            display: 'inline-block', 
            maxWidth: '180px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {email}
          </span>
        </div>

        <button 
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: '6px',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          title="Sign Out"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
