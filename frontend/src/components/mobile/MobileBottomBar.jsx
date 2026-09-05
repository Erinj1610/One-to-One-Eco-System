import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PackageCheck, TrendingUp, Users, Ticket } from 'lucide-react';

export default function MobileBottomBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, aliases: ['/'] },
    { label: 'Orders', path: '/orders', icon: PackageCheck, aliases: ['/orders'] },
    { label: 'Sales', path: '/sales', icon: TrendingUp, aliases: ['/sales'] },
    { label: 'CRM', path: '/crm', icon: Users, aliases: ['/crm', '/pipeline'] },
    { label: 'Tickets', path: '/tickets', icon: Ticket, aliases: ['/tickets'] }
  ];

  const isActive = (tab) => {
    if (location.pathname === tab.path) return true;
    if (tab.aliases && tab.aliases.includes(location.pathname)) return true;
    return false;
  };

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab);
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => navigate(tab.path)}
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
  );
}
