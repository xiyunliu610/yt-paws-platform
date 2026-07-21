import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, AuthUser, ApiError } from '../api/client';

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore a previous session on cold start so the app doesn't force a
  // fresh login every time (App.tsx picks the initial route based on this).
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const persistSession = async (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, nextToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser)),
    ]);
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    await persistSession(response.token, response.user);
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    const response = await authApi.register(email, password, name, phone);
    await persistSession(response.token, response.user);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
      AsyncStorage.removeItem(USER_STORAGE_KEY),
    ]);
  };

  return (
    <AuthContext.Provider value={{ token, user, isRestoring, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export { ApiError };
