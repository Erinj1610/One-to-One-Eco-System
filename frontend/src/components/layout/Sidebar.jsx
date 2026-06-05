import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, TrendingUp, Table, Layout, Calculator, Clock, Package, Truck, Receipt, Folder, BadgeCheck, BarChart, Headset, Settings, Lightbulb, ListOrdered } from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { section: 'Clients & sales' },
  { path: '/crm', icon: Users, label: 'CRM' },
  { path: '/pipeline', icon: TrendingUp, label: 'Sales pipeline' },
  { section: 'Projects' },
  { path: '/projects', icon: Layout, label: 'Projects' },
  { path: '/design', icon: Calculator, label: 'Design' },
  { path: '/orders', icon: Truck, label: 'Orders' },
  { path: '/sales-tracker', icon: TrendingUp, label: 'Sales tracker' },
  { section: 'Other modules' },
  { path: '/tracker', icon: Table, label: 'Design tracker' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/docs', icon: Folder, label: 'Documents' },
  { path: '/hr', icon: BadgeCheck, label: 'HR & people' },
  { path: '/reports', icon: BarChart, label: 'Reports' },
  { path: '/support', icon: Headset, label: 'Support' }
];

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sb-logo">
        <Lightbulb size={18} color="var(--text-info)" /> 1-to-1 World
      </div>
      
      {navItems.map((item, idx) => {
        if (item.section) {
          return <div key={idx} className="sb-sec-label">{item.section}</div>;
        }
        const Icon = item.icon;
        return (
          <NavLink 
            key={idx} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} /> {item.label}
          </NavLink>
        );
      })}

      <div className="sb-bottom">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={16} /> Settings
        </NavLink>
      </div>
    </div>
  );
}
