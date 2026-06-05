import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAILS = [
  'admin@onetoone.co.za',
  'erin@onetoone.co.za',
];

const AuthContext = createContext(null);

export function AuthProvider({ children, devBypass = false }) {
  const [user, setUser] = useState(() => {
    // Check if we have a mock user in localStorage
    const saved = localStorage.getItem('mock_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // If we already have a mock user, we don't block loading
    if (user) {
      setIsAdmin(ADMIN_EMAILS.includes(user.email));
      setAuthLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAdmin(ADMIN_EMAILS.includes(currentUser.email));
      } else if (!localStorage.getItem('mock_user')) {
        setUser(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const loginMock = (email) => {
    const mockUser = { email, uid: 'mock-uid-123' };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAdmin(ADMIN_EMAILS.includes(email));
  };

  const logout = async () => {
    localStorage.removeItem('mock_user');
    setUser(null);
    setIsAdmin(false);
    try {
      await auth.signOut();
    } catch (e) {
      // Ignore if firebase not initialized
    }
  };

  const effectiveIsAdmin = devBypass ? true : isAdmin;

  return (
    <AuthContext.Provider value={{ user, isAdmin: effectiveIsAdmin, authLoading, devBypass, loginMock, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
