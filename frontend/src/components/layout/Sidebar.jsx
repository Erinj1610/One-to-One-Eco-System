import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, Users, TrendingUp, Table, Layout, Calculator, Clock, 
  Package, Truck, Receipt, Folder, BadgeCheck, BarChart, Headset, 
  Settings, Lightbulb, ChevronLeft, ChevronRight, Compass, ClipboardList
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { section: 'Clients & sales' },
  { path: '/crm', icon: Users, label: 'CRM' },
  { section: 'Projects' },
  { path: '/projects', icon: Layout, label: 'Projects' },
  { path: '/design', icon: Calculator, label: 'Design' },
  { path: '/orders', icon: ClipboardList, label: 'Orders' },
  { path: '/logistics', icon: Truck, label: 'Logistics' },
  { path: '/sales-tracker', icon: TrendingUp, label: 'Sales tracker' },
  { path: '/tracker', icon: Compass, label: 'Design fee tracker' },
  { section: 'Other modules' },
  { path: '/pipeline', icon: TrendingUp, label: 'Sales pipeline' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/docs', icon: Folder, label: 'Documents' },
  { path: '/hr', icon: BadgeCheck, label: 'HR & people' },
  { path: '/reports', icon: BarChart, label: 'Reports' },
  { path: '/support', icon: Headset, label: 'Support' }
];

export default function Sidebar({ isCollapsed, toggleCollapse }) {
  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sb-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '49px' }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={18} color="var(--text-info)" /> 1-to-1 World
          </div>
        )}
        {isCollapsed && (
          <Lightbulb size={18} color="var(--text-info)" style={{ margin: '0 auto' }} />
        )}
        <button 
          onClick={toggleCollapse} 
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px',
            marginLeft: isCollapsed ? '0' : 'auto'
          }}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      {navItems.map((item, idx) => {
        if (item.section) {
          if (isCollapsed) return null;
          return <div key={idx} className="sb-sec-label">{item.section}</div>;
        }
        const Icon = item.icon;
        return (
          <NavLink 
            key={idx} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon size={16} style={{ flexShrink: 0 }} /> 
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        );
      })}

      <div className="sb-bottom">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings size={16} style={{ flexShrink: 0 }} /> 
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </div>
  );
}

