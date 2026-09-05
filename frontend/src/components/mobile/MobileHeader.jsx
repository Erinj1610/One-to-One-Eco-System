import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function MobileHeader({ user, onRefresh }) {
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'Executive Dashboard';
      case '/orders':
        return 'Orders & Production';
      case '/sales':
        return 'Sales & Invoicing';
      case '/crm':
      case '/pipeline':
        return 'Client Relationships';
      case '/tickets':
        return 'Snags & Tickets';
      case '/projects':
        return 'Active Projects';
      default:
        return 'One to One Portal';
    }
  };

  return (
    <header className="mobile-app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '7px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '13px'
        }}>
          1:1
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              {getTitle()}
            </span>
            <span style={{
              fontSize: '8.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--text-info)'
            }}>
              App
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', height: 'auto', borderRadius: '50%' }}
            title="Refresh Live Data"
          >
            <RefreshCw size={15} color="var(--text-secondary)" />
          </button>
        )}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-info)'
        }}>
          {user?.name ? user.name.charAt(0).toUpperCase() : '1'}
        </div>
      </div>
    </header>
  );
}
