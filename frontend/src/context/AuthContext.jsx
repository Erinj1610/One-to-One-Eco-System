import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { API_BASE } from '../api_config';

const ADMIN_EMAILS = [
  'admin@onetoone.co.za',
  'erin@onetoone.co.za',
  'erin.jones@1-to-1.world',
  'staff@onetoone.co.za'
];

const AuthContext = createContext(null);

export function AuthProvider({ children, devBypass = false }) {
  const [user, setUser] = useState(() => {
    // Check if we have a mock user in localStorage
    const saved = localStorage.getItem('mock_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchUserProfile = async (targetUser) => {
    if (!targetUser || !targetUser.email) {
      setUserProfile(null);
      setPermissions({});
      return null;
    }
    setPermissionsLoading(true);
    try {
      const emailParam = encodeURIComponent(targetUser.email);
      const res = await fetch(`${API_BASE}/admin/users/me?email=${emailParam}`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        setPermissions(data.effective_permissions || {});
        if (data.is_admin) {
          setIsAdmin(true);
        }
        return data;
      } else {
        console.warn("Could not fetch user profile from /admin/users/me:", res.status);
      }
    } catch (err) {
      console.error("Error fetching user profile & permissions:", err);
    } finally {
      setPermissionsLoading(false);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Check mock user in localStorage on mount
      try {
        const saved = localStorage.getItem('mock_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isMounted) {
            setUser(parsed);
            setIsAdmin(ADMIN_EMAILS.includes(parsed.email));
            await fetchUserProfile(parsed);
            setAuthLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Error parsing saved mock user:", e);
      }

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;
        if (currentUser) {
          setUser(currentUser);
          const adminCheck = ADMIN_EMAILS.includes(currentUser.email);
          setIsAdmin(adminCheck);
          await fetchUserProfile(currentUser);
        } else {
          try {
            const saved = localStorage.getItem('mock_user');
            if (saved) {
              const parsed = JSON.parse(saved);
              setUser(parsed);
              setIsAdmin(ADMIN_EMAILS.includes(parsed.email));
              await fetchUserProfile(parsed);
            } else {
              setUser(null);
              setIsAdmin(false);
              setUserProfile(null);
              setPermissions({});
            }
          } catch (e) {
            setUser(null);
            setIsAdmin(false);
            setUserProfile(null);
            setPermissions({});
          }
        }
        setAuthLoading(false);
      });

      return unsubscribe;
    };

    let cleanupFn = null;
    initAuth().then(unsub => {
      cleanupFn = unsub;
    });

    return () => {
      isMounted = false;
      if (typeof cleanupFn === 'function') cleanupFn();
    };
  }, []);

  const refreshPermissions = async () => {
    const activeUser = user || (localStorage.getItem('mock_user') ? JSON.parse(localStorage.getItem('mock_user')) : null);
    if (activeUser) {
      return await fetchUserProfile(activeUser);
    }
    return null;
  };

  const loginMock = async (email) => {
    const mockUser = { email, uid: 'mock-uid-123' };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAdmin(ADMIN_EMAILS.includes(email));
    await fetchUserProfile(mockUser);
  };

  const logout = async () => {
    localStorage.removeItem('mock_user');
    setUser(null);
    setIsAdmin(false);
    setUserProfile(null);
    setPermissions({});
    try {
      await auth.signOut();
    } catch (e) {
      // Ignore if firebase not initialized
    }
  };

  const effectiveIsAdmin = devBypass ? true : (isAdmin || Boolean(userProfile?.is_admin));

  const hasAccess = (moduleName) => {
    if (!moduleName) return true;
    // Settings is always accessible to Admin users so they can never lock themselves out
    if (moduleName === 'Settings') {
      return Boolean(effectiveIsAdmin);
    }
    
    // Check if an explicit effective permission exists for this module
    if (permissions && typeof permissions[moduleName] === 'string') {
      return permissions[moduleName] !== 'No access';
    }
    
    // Fallback: If admin, default to true; otherwise default to true
    return true;
  };

  const canEdit = (moduleName) => {
    if (!moduleName) return true;
    if (permissions && typeof permissions[moduleName] === 'string') {
      const perm = permissions[moduleName];
      return perm === 'Full access' || perm === 'Can edit';
    }
    return Boolean(effectiveIsAdmin);
  };

  const isReadOnly = (moduleName) => {
    if (!moduleName) return false;
    if (permissions && typeof permissions[moduleName] === 'string') {
      return permissions[moduleName] === 'View only';
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin: effectiveIsAdmin, 
      userProfile, 
      permissions, 
      permissionsLoading,
      authLoading, 
      devBypass, 
      hasAccess, 
      canEdit, 
      isReadOnly, 
      refreshPermissions, 
      loginMock, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
