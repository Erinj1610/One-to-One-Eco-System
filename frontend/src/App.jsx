import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import ErrorBoundary from './components/common/ErrorBoundary';

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
import DocsPage from './pages/DocsPage';
import HrPage from './pages/HrPage';
import ReportsPage from './pages/ReportsPage';
import SupportPage from './pages/SupportPage';
import SettingsPage from './pages/SettingsPage';
import ResetPassword from './pages/ResetPassword';

import './index.css';

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppInner({ devBypass, setDevBypass }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="tracker"    element={<DesignTracker />} />
          <Route path="projects"   element={<ProjectList />} />
          <Route path="projects/:id" element={<ProjectManagement />} />
          <Route path="designfee"   element={<DesignFeePage />} />
          <Route path="design"      element={<DesignPage />} />
          <Route path="crm"        element={<CrmPage />} />
          <Route path="pipeline"   element={<PipelinePage />} />
          <Route path="sales-tracker" element={<SalesTracker />} />
          <Route path="time"       element={<TimePage />} />
          <Route path="products"   element={<ProductsPage />} />
          <Route path="boq"        element={<BoqPage />} />
          <Route path="orders"     element={<OrdersPage />} />
          <Route path="purchasing"  element={<PurchasingPage />} />
          <Route path="logistics"  element={<LogisticsPage />} />
          <Route path="invoices"   element={<InvoicesPage />} />
          <Route path="docs"       element={<DocsPage />} />
          <Route path="hr"         element={<HrPage />} />
          <Route path="reports"    element={<ReportsPage />} />
          <Route path="support"    element={<SupportPage />} />
          <Route path="settings"   element={<SettingsPage />} />
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
