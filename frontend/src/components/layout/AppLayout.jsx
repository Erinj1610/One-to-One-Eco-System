import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileHeader from '../mobile/MobileHeader';
import MobileBottomBar from '../mobile/MobileBottomBar';
import PulseSurveyModal from '../common/PulseSurveyModal';
import { useStore } from '../../context/StoreContext';

export default function AppLayout() {
  const location = useLocation();
  const { moduleConfig } = useStore();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' && window.innerWidth < 1280;
  });

  const toggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar_collapsed', String(newVal));
      return newVal;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    '/support': 'ticket_logger',
    '/ticket-logger': 'ticket_logger'
  };

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/settings') return 'Settings';
    if (path === '/time') return 'Time tracking';
    if (path === '/invoices') return 'Invoices';
    if (path === '/payments') return 'Payments';
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
  const { logActivity } = useStore();

  useEffect(() => {
    if (logActivity) {
      logActivity('page_view', `Visited ${currentTitle} page`);
    }
  }, [location.pathname, currentTitle, logActivity]);

  return (
    <div className={`portal ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'is-mobile-shell' : ''}`}>
      {!isMobile && <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleCollapse} />}
      <div className="main">
        {isMobile ? <MobileHeader /> : <Topbar title={currentTitle} />}
        <div className="content">
          <Outlet />
        </div>
      </div>
      {isMobile && <MobileBottomBar />}
      <PulseSurveyModal />
    </div>
  );
}

