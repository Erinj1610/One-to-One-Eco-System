import React, { useState, useEffect } from 'react';
import { Bell, LogOut, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [subContext, setSubContext] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  // Listen for alerts count updates dispatched by active modules
  useEffect(() => {
    const handleCount = (e) => {
      if (typeof e.detail?.count === 'number') {
        setAlertCount(e.detail.count);
      }
    };
    window.addEventListener('portal-alerts-count-update', handleCount);
    return () => window.removeEventListener('portal-alerts-count-update', handleCount);
  }, []);

  const handleAlertsClick = () => {
    let handled = false;
    const ack = () => { handled = true; };
    window.addEventListener('portal-alerts-handled', ack, { once: true });
    window.dispatchEvent(new CustomEvent('toggle-portal-alerts'));
    setTimeout(() => {
      window.removeEventListener('portal-alerts-handled', ack);
      if (!handled && !['/orders', '/projects', '/crm', '/design'].includes(location.pathname)) {
        navigate('/orders');
      }
    }, 60);
  };

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
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
          title="Global Quick Jump (Ctrl + K)"
        >
          <Search size={13} color="#94a3b8" />
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>Search or jump...</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '4px',
            background: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            fontFamily: 'monospace'
          }}>
            Ctrl K
          </span>
        </button>

        <button 
          onClick={handleAlertsClick}
          style={{
            background: alertCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 0, 0, 0.03)',
            border: alertCount > 0 ? '1px solid rgba(239, 68, 68, 0.22)' : '1px solid var(--border)',
            color: alertCount > 0 ? '#ef4444' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px 11px 4px 9px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.background = alertCount > 0 ? 'rgba(239, 68, 68, 0.14)' : 'rgba(0, 0, 0, 0.06)'; 
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.background = alertCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 0, 0, 0.03)'; 
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title={alertCount > 0 ? `${alertCount} Operational Alerts active - Click to view` : "Operational Alerts & Prompts"}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell size={14} />
            {alertCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-3px', 
                right: '-3px', 
                width: '6px', 
                height: '6px', 
                background: '#ef4444', 
                borderRadius: '50%',
                boxShadow: '0 0 5px rgba(239, 68, 68, 0.8)'
              }} />
            )}
          </div>
          <span style={{ letterSpacing: '0.01em' }}>Alerts</span>
          {alertCount > 0 && (
            <span style={{ 
              background: '#ef4444', 
              color: '#ffffff', 
              borderRadius: '10px', 
              padding: '1px 6px', 
              fontSize: '10px', 
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {alertCount}
            </span>
          )}
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
