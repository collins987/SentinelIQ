import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile } from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserContextType {
  user: UserProfile | null;
  token: string | null;
  isReady: boolean;
  isProfileLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user_token');
    if (stored) setToken(stored);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('user_token', token);
    } else {
      localStorage.removeItem('user_token');
    }
  }, [token]);

  useEffect(() => {
    if (!token || user || isProfileLoading) return;
    setIsProfileLoading(true);
    getProfile(token)
      .then((profile) => setUser(profile))
      .catch(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user_token');
      })
      .finally(() => setIsProfileLoading(false));
  }, [token, user, isProfileLoading]);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user_token');
  };

  return (
    <UserContext.Provider value={{ user, token, isReady, isProfileLoading, setUser, setToken, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
