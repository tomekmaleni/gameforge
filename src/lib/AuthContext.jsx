import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setIsLoadingAuth(false); })
      .catch(() => { setAuthError({ type: 'auth_required' }); setIsLoadingAuth(false); });
  }, []);

  const login = async (email, full_name) => {
    const u = await base44.auth.register({ email, full_name });
    setUser(u);
    setAuthError(null);
    return u;
  };

  const logout = async () => {
    await base44.auth.logout();
    setUser(null);
    setAuthError({ type: 'auth_required' });
  };

  const navigateToLogin = () => {
    // In our self-hosted version, we show the login page inline
  };

  return (
    <AuthContext.Provider value={{
      user, isLoadingAuth, isLoadingPublicSettings, authError,
      login, logout, navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
