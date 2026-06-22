import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PulseSurveyModal from '../common/PulseSurveyModal';
import { useStore } from '../../context/StoreContext';

export default function AppLayout() {
  const location = useLocation();
  const { moduleConfig } = useStore();
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

  const pathToModuleId = {
    '/dashboard': 'dashboard',
    '/crm': 'crm',
    '/pipeline': 'pipeline',
    '/sales-tracker': 'sales_tracker',
    '/tracker': 'tracker',
    '/projects': 'projects',
    '/design': 'design',
    '/orders': 'orders',
    '/logistics': 'logistics',
    '/products': 'products',
    '/docs': 'docs',
    '/hr': 'hr',
    '/reports': 'reports',
    '/support': 'support'
  };

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/settings') return 'Settings';
    if (path === '/time') return 'Time tracking';
    if (path === '/invoices') return 'Invoices';
    if (path === '/designfee') return 'Design fee calculator';
    if (path.startsWith('/projects/')) {
      const projModule = moduleConfig?.modules?.find(m => m.id === 'projects');
      return projModule ? projModule.label : 'Projects';
    }
    const modId = pathToModuleId[path];
    if (modId && moduleConfig?.modules) {
      const mod = moduleConfig.modules.find(m => m.id === modId);
      if (mod) return mod.label;
    }
    return 'Dashboard';
  };

  const currentTitle = getTitle();

  return (
    <div className={`portal ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleCollapse} />
      <div className="main">
        <Topbar title={currentTitle} />
        <div className="content">
          <Outlet />
        </div>
      </div>
      <PulseSurveyModal />
    </div>
  );
}

