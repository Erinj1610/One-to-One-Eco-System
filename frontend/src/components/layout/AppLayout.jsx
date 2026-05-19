import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const location = useLocation();
  const pathTitles = {
    '/dashboard': 'Dashboard',
    '/crm': 'CRM',
    '/pipeline': 'Sales pipeline',
    '/tracker': 'Design tracker',
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
    <div className="portal">
      <Sidebar />
      <div className="main">
        <Topbar title={currentTitle} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
