import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar_collapsed', String(newVal));
      return newVal;
    });
  };

  const pathTitles = {
    '/dashboard': 'Dashboard',
    '/crm': 'CRM',
    '/pipeline': 'Sales pipeline',
    '/sales-tracker': 'Sales tracker',
    '/tracker': 'Design Fee Tracker',
    '/projects': 'Projects',
    '/designfee': 'Design fee calculator',
    '/time': 'Time tracking',
    '/products': 'Product catalog',
    '/orders': 'Orders',
    '/invoices': 'Invoices',
    '/docs': 'Documents',
    '/hr': 'HR & people',
    '/reports': 'Reports',
    '/support': 'Support',
    '/settings': 'Settings'
  };

  const currentTitle = pathTitles[location.pathname] || 'Dashboard';

  return (
    <div className={`portal ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleCollapse} />
      <div className="main">
        <Topbar title={currentTitle} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

