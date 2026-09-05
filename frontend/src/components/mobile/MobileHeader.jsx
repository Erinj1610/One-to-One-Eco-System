import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

export default function MobileHeader() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { refreshProjects, moduleConfig } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path === '/projects') return 'Projects';
    if (path.startsWith('/projects/')) return 'Project Workspace';
    if (path === '/orders') return 'Hardware Orders';
    if (path === '/sales-tracker') return 'Sales Tracker';
    if (path === '/crm') return 'CRM Clients';
    if (path === '/pipeline') return 'Sales Pipeline';
    if (path === '/products') return 'Inventory';
    if (path === '/invoices') return 'Invoices';
    if (path === '/payments') return 'Payments';
    if (path === '/ticket-logger') return 'Ticket Logger';
    if (path === '/docs') return 'Documents';
    if (path === '/settings') return 'Settings';

    const mod = moduleConfig?.modules?.find(m => m.path === path);
    return mod?.label || 'One to One';
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (refreshProjects) await refreshProjects();
    } catch (err) {
      console.error('Mobile refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const email = user?.email || '';
  const initial = email ? email.charAt(0).toUpperCase() : '1';

  return (
    <>
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
            fontSize: '12px'
          }}>
            1:1
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              {getTitle()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-ghost btn-sm"
            style={{
              padding: '6px',
              height: '30px',
              width: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Refresh Live Data"
          >
            <RefreshCw
              size={15}
              color="var(--text-secondary)"
              style={{
                animation: isRefreshing ? 'spin 0.6s linear infinite' : 'none',
                transition: 'transform 0.2s'
              }}
            />
          </button>

          <button
            type="button"
            onClick={() => setShowUserMenu(prev => !prev)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-info)',
              cursor: 'pointer'
            }}
          >
            {initial}
          </button>
        </div>
      </header>

      {/* QUICK USER POPUP */}
      {showUserMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0, 0, 0, 0.25)'
          }}
          onClick={() => setShowUserMenu(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '52px',
              right: '12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              minWidth: '220px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.displayName || 'User Session'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {email || 'No email attached'}
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                logout();
              }}
              className="btn btn-danger btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <LogOut size={13} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
