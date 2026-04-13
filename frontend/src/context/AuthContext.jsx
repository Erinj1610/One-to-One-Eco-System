import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// ─── ADMIN EMAIL LIST ─────────────────────────────────────────────────────────
// Add any admin email addresses here. Only these users can access admin tools.
// This can be upgraded to Firebase custom claims in production.
const ADMIN_EMAILS = [
  'admin@onetoone.co.za',
  'erin@onetoone.co.za',
  // Add more admin emails here as needed
];

const AuthContext = createContext(null);

export function AuthProvider({ children, devBypass = false }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Check admin status by email
      if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Dev bypass: treat as admin so dashboard is always accessible during development
  const effectiveIsAdmin = devBypass ? true : isAdmin;

  return (
    <AuthContext.Provider value={{ user, isAdmin: effectiveIsAdmin, authLoading, devBypass }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
