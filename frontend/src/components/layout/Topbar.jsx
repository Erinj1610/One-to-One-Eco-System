import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();

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
      <div className="topbar-title">{title || 'Portal'}</div>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Bell size={18} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="av" title={email}>{initials}</div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'inline-block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            gap: '4px',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = '#f87171'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
          title="Sign Out"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
