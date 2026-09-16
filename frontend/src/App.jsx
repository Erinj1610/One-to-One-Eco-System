import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AccessDenied from './components/common/AccessDenied';

import Login from './Login';
import AppLayout from './components/layout/AppLayout';

// Lazy loaded page modules to prevent tab memory crashes and monolithic bundle lockup
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DesignTracker = lazy(() => import('./pages/DesignTracker'));
const ProjectList = lazy(() => import('./pages/projects/ProjectList'));
const ProjectManagement = lazy(() => import('./pages/projects/ProjectManagement'));
const DesignFeePage = lazy(() => import('./pages/DesignFeePage'));
const DesignPage = lazy(() => import('./pages/DesignPage'));
const TemplateEditor = lazy(() => import('./pages/admin/TemplateEditor'));
const SalesTracker = lazy(() => import('./pages/SalesTracker'));
const MyWorkspace = lazy(() => import('./pages/MyWorkspace'));

const CrmPage = lazy(() => import('./pages/CrmPage'));
const PipelinePage = lazy(() => import('./pages/PipelinePage'));
const TimePage = lazy(() => import('./pages/TimePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const BoqPage = lazy(() => import('./pages/BoqPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage'));
const PurchasingPage = lazy(() => import('./pages/PurchasingPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const HrPage = lazy(() => import('./pages/HrPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const TicketLoggerPage = lazy(() => import('./pages/TicketLoggerPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

import './index.css';

const ModuleLoadingFallback = () => (
  <div style={{
    height: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '13px'
  }}>
    <div style={{
      width: '28px',
      height: '28px',
      border: '2px solid rgba(255,255,255,0.1)',
      borderTopColor: 'var(--accent, #6366f1)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span>Loading module…</span>
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 13 }}>
        Loading 1-to-1 World…
      </div>
    );
  }

  return (
    <BrowserRouter>
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
