import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './Login';
import ProjectList from './pages/projects/ProjectList';
import ProjectManagement from './pages/projects/ProjectManagement';
import TemplateEditor from './pages/admin/TemplateEditor';
import './index.css';

// ─── ADMIN ROUTE GUARD ────────────────────────────────────────────────────────
// Silently redirects non-admins to home. Admins pass through.
function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// ─── MAIN MENU ────────────────────────────────────────────────────────────────
function MainMenu({ setDevBypass }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="animation-fade-in" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          121 Eco System
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Admin link — only visible to admins */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/template-editor')}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '6px',
                background: 'rgba(200, 169, 110, 0.15)',
                border: '1px solid rgba(200, 169, 110, 0.4)',
                color: '#c8a96e', cursor: 'pointer', fontSize: '0.8rem',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              ⚙️ Admin
            </button>
          )}
          <button className="glow-btn" style={{ margin: 0, padding: '0.5rem 1rem' }} onClick={() => { setDevBypass(false); signOut(auth); }}>
            Log Out
          </button>
        </div>
      </div>

      <p className="subtitle" style={{ textAlign: 'left' }}>
        Welcome back to the Central Hub. Select a module below to begin operations.
      </p>
      
      <div className="card-grid" style={{ marginTop: '2rem' }}>
        <div className="stat-card clickable" onClick={() => navigate('/projects')}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3>Projects</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Project tracking, Quotes & documentation</p>
        </div>

        <div className="stat-card clickable" onClick={() => {}}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
          <h3>Products</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Comprehensive database of lighting products</p>
        </div>

        <div className="stat-card clickable" onClick={() => {}}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3>Faults</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Log and manage faulty product returns</p>
        </div>

        <div className="stat-card clickable" onClick={() => {}}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📩</div>
          <h3>Enquiries</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Handle incoming client leads & questions</p>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
function AppInner() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [devBypass, setDevBypass] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return <div className="glass-panel" style={{ textAlign: 'center' }}>Loading Hub...</div>;
  }

  if (!user && !devBypass) {
    return <Login onBypass={() => setDevBypass(true)} />;
  }

  return (
    <BrowserRouter>
      <AuthProvider devBypass={devBypass}>
        <div className="glass-panel" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<MainMenu setDevBypass={setDevBypass} />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectManagement />} />

            {/* Admin-only routes */}
            <Route path="/admin/template-editor" element={
              <AdminRoute>
                <TemplateEditor />
              </AdminRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

function App() {
  return <AppInner />;
}

export default App;
