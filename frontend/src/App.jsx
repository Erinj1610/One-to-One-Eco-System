import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AccessDenied from './components/common/AccessDenied';

import Login from './Login';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DesignTracker from './pages/DesignTracker';
import ProjectList from './pages/projects/ProjectList';
import ProjectManagement from './pages/projects/ProjectManagement';
import DesignFeePage from './pages/DesignFeePage';
import DesignPage from './pages/DesignPage';
import TemplateEditor from './pages/admin/TemplateEditor';
import SalesTracker from './pages/SalesTracker';

// All portal modules
import CrmPage from './pages/CrmPage';
import PipelinePage from './pages/PipelinePage';
import TimePage from './pages/TimePage';
import ProductsPage from './pages/ProductsPage';
import BoqPage from './pages/BoqPage';
import OrdersPage from './pages/OrdersPage';
import LogisticsPage from './pages/LogisticsPage';
import PurchasingPage from './pages/PurchasingPage';
import InvoicesPage from './pages/InvoicesPage';
import PaymentsPage from './pages/PaymentsPage';
import DocsPage from './pages/DocsPage';
import HrPage from './pages/HrPage';
import ReportsPage from './pages/ReportsPage';
import SupportPage from './pages/SupportPage';
import TicketLoggerPage from './pages/TicketLoggerPage';
import SettingsPage from './pages/SettingsPage';
import ResetPassword from './pages/ResetPassword';

import './index.css';

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
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 13 }}>
        Loading 1-to-1 World…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={user || devBypass ? <Navigate to="/dashboard" replace /> : <Login onBypass={() => setDevBypass(true)} />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route path="/" element={user || devBypass ? <AppLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
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
