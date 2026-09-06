import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, PackageCheck, TrendingUp, Menu, 
  X, Users, ShoppingBag, FileText, CreditCard, Ticket, Settings, 
  LogOut, Shield, ChevronRight, BarChart3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const tabs = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, aliases: ['/'] },
    { label: 'Projects', path: '/projects', icon: Briefcase, aliases: ['/projects'] },
    { label: 'Orders', path: '/orders', icon: PackageCheck, aliases: ['/orders'] },
    { label: 'Sales', path: '/sales-tracker', icon: TrendingUp, aliases: ['/sales-tracker'] },
    { label: 'More', isMenu: true, icon: Menu }
  ];

  const isActive = (tab) => {
    if (tab.isMenu) return showMoreMenu;
    if (location.pathname === tab.path) return true;
    if (tab.aliases && tab.aliases.some(a => location.pathname.startsWith(a))) return true;
    return false;
  };

  const handleTabClick = (tab) => {
    if (tab.isMenu) {
      setShowMoreMenu(prev => !prev);
    } else {
      setShowMoreMenu(false);
      navigate(tab.path);
    }
  };

  const handleNavigateMore = (path) => {
    setShowMoreMenu(false);
    navigate(path);
  };

  const moreItems = [
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, color: '#6366f1', desc: 'Financial, Sales & KPI Reports' },
    { label: 'Client CRM', path: '/crm', icon: Users, color: '#3b82f6', desc: 'Clients & Accounts' },
    { label: 'Products & Stock', path: '/products', icon: ShoppingBag, color: '#10b981', desc: 'Live Inventory & Catalog' },
    { label: 'Invoices & Claims', path: '/invoices', icon: FileText, color: '#f59e0b', desc: 'Invoicing & Claims' },
    { label: 'Payments', path: '/payments', icon: CreditCard, color: '#8b5cf6', desc: 'Palladium Ingest & Allocations' },
    { label: 'Ticket Logger', path: '/ticket-logger', icon: Ticket, color: '#ec4899', desc: 'Snags & Issues' },
    { label: 'Document Vault', path: '/docs', icon: FileText, color: '#06b6d4', desc: 'Files, CAD & Specs' },
    { label: 'System Settings', path: '/settings', icon: Settings, color: '#64748b', desc: 'Deployments, Users & Rules' }
  ];

  return (
    <>
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`mobile-tab-item ${active ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Icon size={20} color={active ? 'var(--text-info, #3b82f6)' : 'var(--text-tertiary, #94a3b8)'} />
              <span style={{ color: active ? 'var(--text-info, #3b82f6)' : 'var(--text-tertiary, #94a3b8)' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MORE MODULES FULL SLIDE-UP DRAWER */}
      {showMoreMenu && (
        <div className="mobile-drawer-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-drawer-content" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-handle" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  All Modules & Tools
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {user?.email || 'Logged in user'} {isAdmin ? '• Administrator' : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px', borderRadius: '50%', background: 'var(--bg-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* CLEAN FULL-WIDTH LIST OF MODULE LINKS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {moreItems.map(item => {
                const Icon = item.icon;
                const isCurrent = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavigateMore(item.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: isCurrent ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                      border: isCurrent ? '1.5px solid var(--text-info)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: `${item.color}15`,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        {item.desc}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>

            {/* LOG OUT BUTTON */}
            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false);
                logout();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-danger, #f87171)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              <span>Log Out of Portal</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
