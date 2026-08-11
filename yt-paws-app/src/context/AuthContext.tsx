import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, AuthUser, ApiError, configureSessionRefresh } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';
const REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { language } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore a previous session on cold start so the app doesn't force a
  // fresh login every time (App.tsx picks the initial route based on this).
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser, storedRefreshToken] = await Promise.all([
          AsyncStorage.getItem(TOKEN_STORAGE_KEY),
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
        ]);
        if (storedToken && storedUser && storedRefreshToken) {
          try {
            const refreshed = await authApi.refresh(storedRefreshToken);
            await persistSession(refreshed.token, refreshed.refreshToken, refreshed.user);
          } catch {
            await Promise.all([TOKEN_STORAGE_KEY, USER_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY].map((key) => AsyncStorage.removeItem(key)));
          }
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) {
      configureSessionRefresh(null);
      return;
    }
    configureSessionRefresh(async () => {
      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!storedRefreshToken) throw new ApiError(401, 'Session expired');
      try {
        const refreshed = await authApi.refresh(storedRefreshToken);
        await persistSession(refreshed.token, refreshed.refreshToken, refreshed.user);
        return refreshed;
      } catch (error) {
        await clearSession();
        throw error;
      }
    });
    return () => configureSessionRefresh(null);
  }, [token, language]);

  const persistSession = async (nextToken: string, nextRefreshToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_STORAGE_KEY, nextToken),
      AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser)),
      AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken),
    ]);
  };

  const clearSession = async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
      AsyncStorage.removeItem(USER_STORAGE_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY),
    ]);
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    await persistSession(response.token, response.refreshToken, response.user);
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    const response = await authApi.register(email, password, name, phone, language);
    await persistSession(response.token, response.refreshToken, response.user);
  };

  const logout = async () => {
    if (token) await authApi.logout(token).catch(() => undefined);
    await clearSession();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) throw new ApiError(401, 'Not authenticated');
    const response = await authApi.changePassword(token, currentPassword, newPassword);
    await persistSession(response.token, response.refreshToken, response.user);
  };

  return (
    <AuthContext.Provider value={{ token, user, isRestoring, login, register, logout, changePassword }}>
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
