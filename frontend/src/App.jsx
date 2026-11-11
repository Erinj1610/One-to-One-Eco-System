import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AccessDenied from './components/common/AccessDenied';

import Login from './Login';
import AppLayout from './components/layout/AppLayout';

// Lazy loaded page modules with auto-retry on new deployments to eliminate dynamic import hash mismatch crashes
const lazyWithRetry = (componentImport) => lazy(async () => {
  try {
    return await componentImport();
  } catch (error) {
    const errorStr = String(error?.message || error || '');
    const isChunkError = errorStr.includes('Failed to fetch dynamically imported module') ||
      errorStr.includes('dynamically imported module') ||
      errorStr.includes('Loading chunk') ||
      errorStr.includes('error loading');

    if (isChunkError) {
      const now = Date.now();
      const lastRetry = parseInt(sessionStorage.getItem('chunk_retry_timestamp') || '0', 10);
      if (now - lastRetry > 4000) {
        sessionStorage.setItem('chunk_retry_timestamp', String(now));
        window.location.reload();
        return new Promise(() => {});
      }
    }
    throw error;
  }
});

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const DesignTracker = lazyWithRetry(() => import('./pages/DesignTracker'));
const ProjectList = lazyWithRetry(() => import('./pages/projects/ProjectList'));
const ProjectManagement = lazyWithRetry(() => import('./pages/projects/ProjectManagement'));
const DesignFeePage = lazyWithRetry(() => import('./pages/DesignFeePage'));
const DesignPage = lazyWithRetry(() => import('./pages/DesignPage'));
const TemplateEditor = lazyWithRetry(() => import('./pages/admin/TemplateEditor'));
const SalesTracker = lazyWithRetry(() => import('./pages/SalesTracker'));
const DebtorsForecastHub = lazyWithRetry(() => import('./pages/DebtorsForecastHub'));
const MyWorkspace = lazyWithRetry(() => import('./pages/MyWorkspace'));

const CrmPage = lazyWithRetry(() => import('./pages/CrmPage'));
const PipelinePage = lazyWithRetry(() => import('./pages/PipelinePage'));
const TimePage = lazyWithRetry(() => import('./pages/TimePage'));
const ProductsPage = lazyWithRetry(() => import('./pages/ProductsPage'));
const BoqPage = lazyWithRetry(() => import('./pages/BoqPage'));
const OrdersPage = lazyWithRetry(() => import('./pages/OrdersPage'));
const LogisticsPage = lazyWithRetry(() => import('./pages/LogisticsPage'));
const PurchasingPage = lazyWithRetry(() => import('./pages/PurchasingPage'));
const InvoicesPage = lazyWithRetry(() => import('./pages/InvoicesPage'));
const PaymentsPage = lazyWithRetry(() => import('./pages/PaymentsPage'));
const DocsPage = lazyWithRetry(() => import('./pages/DocsPage'));
const HrPage = lazyWithRetry(() => import('./pages/HrPage'));
const ReportsPage = lazyWithRetry(() => import('./pages/ReportsPage'));
const SupportPage = lazyWithRetry(() => import('./pages/SupportPage'));
const TicketLoggerPage = lazyWithRetry(() => import('./pages/TicketLoggerPage'));
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'));
const ManagementAiPage = lazyWithRetry(() => import('./pages/ManagementAiPage'));
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'));

import './index.css';
import OneToOneLoader from './components/common/OneToOneLoader';
import GlobalKeyboardShortcuts from './components/common/GlobalKeyboardShortcuts';
import GlobalQuickCopyListener from './components/common/GlobalQuickCopyListener';
import UniversalTruncationTooltip from './components/common/UniversalTruncationTooltip';
import GlobalConfirmModal from './components/common/GlobalConfirmModal';
import GlobalToastNotification from './components/common/GlobalToastNotification';

const ModuleLoadingFallback = () => (
  <div style={{
    height: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <OneToOneLoader size="lg" text="Loading module..." />
  </div>
);

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PermissionRoute({ module, children }) {
  const { hasAccess, authLoading } = useAuth();
  if (authLoading) return null;
  if (!hasAccess(module)) {
    return <AccessDenied module={module} />;
  }
  return children;
}

function AppInner({ devBypass, setDevBypass }) {
  const { user, authLoading, loginMock } = useAuth();

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)' }}>
        <OneToOneLoader size="xl" text="Loading 1-to-1 World..." />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <GlobalKeyboardShortcuts />
      <GlobalQuickCopyListener />
      <UniversalTruncationTooltip />
      <GlobalConfirmModal />
      <GlobalToastNotification />
      <Suspense fallback={<ModuleLoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={user || devBypass ? <Navigate to="/dashboard" replace /> : <Login onBypass={() => { loginMock('erin.jones@1-to-1.world'); setDevBypass(true); }} />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/" element={user || devBypass ? <AppLayout /> : <Navigate to="/login" replace />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="workspace" element={<MyWorkspace />} />
            <Route path="dashboard" element={<PermissionRoute module="Dashboard"><Dashboard /></PermissionRoute>} />
            <Route path="tracker" element={<PermissionRoute module="Design tracker"><DesignTracker /></PermissionRoute>} />
            <Route path="projects" element={<PermissionRoute module="Projects"><ProjectList /></PermissionRoute>} />
            <Route path="projects/:id" element={<PermissionRoute module="Projects"><ProjectManagement /></PermissionRoute>} />
            <Route path="designfee" element={<PermissionRoute module="Design fee"><DesignFeePage /></PermissionRoute>} />
            <Route path="design" element={<PermissionRoute module="Design fee"><DesignPage /></PermissionRoute>} />
            <Route path="crm" element={<PermissionRoute module="CRM"><CrmPage /></PermissionRoute>} />
            <Route path="pipeline" element={<PermissionRoute module="Pipeline"><PipelinePage /></PermissionRoute>} />
            <Route path="sales-tracker" element={<PermissionRoute module="Pipeline"><SalesTracker /></PermissionRoute>} />
            <Route path="debtors-hub" element={<PermissionRoute module="Pipeline"><DebtorsForecastHub /></PermissionRoute>} />
            <Route path="time" element={<PermissionRoute module="Time tracking"><TimePage /></PermissionRoute>} />
            <Route path="products" element={<PermissionRoute module="Products"><ProductsPage /></PermissionRoute>} />
            <Route path="boq" element={<PermissionRoute module="BOQ Maker"><BoqPage /></PermissionRoute>} />
            <Route path="orders" element={<PermissionRoute module="Orders"><OrdersPage /></PermissionRoute>} />
            <Route path="purchasing" element={<PermissionRoute module="Orders"><PurchasingPage /></PermissionRoute>} />
            <Route path="logistics" element={<PermissionRoute module="Orders"><LogisticsPage /></PermissionRoute>} />
            <Route path="invoices" element={<PermissionRoute module="Invoices"><InvoicesPage /></PermissionRoute>} />
            <Route path="payments" element={<PermissionRoute module="Invoices"><PaymentsPage /></PermissionRoute>} />
            <Route path="docs" element={<PermissionRoute module="Documents"><DocsPage /></PermissionRoute>} />
            <Route path="hr" element={<PermissionRoute module="HR & people"><HrPage /></PermissionRoute>} />
            <Route path="reports" element={<PermissionRoute module="Reports"><ReportsPage /></PermissionRoute>} />
            <Route path="management-ai" element={<PermissionRoute module="Management AI"><ManagementAiPage /></PermissionRoute>} />
            <Route path="ticket-logger" element={<PermissionRoute module="Support"><TicketLoggerPage /></PermissionRoute>} />
            <Route path="support" element={<PermissionRoute module="Support"><TicketLoggerPage /></PermissionRoute>} />
            <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
            <Route path="admin/template-editor" element={
              <AdminRoute><TemplateEditor /></AdminRoute>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  const [devBypass, setDevBypass] = useState(false);

  return (
    <ErrorBoundary>
      <AuthProvider devBypass={devBypass}>
        <StoreProvider>
          <AppInner devBypass={devBypass} setDevBypass={setDevBypass} />
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
