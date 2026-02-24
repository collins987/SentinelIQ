import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile } from '../services/api';

export interface AnalystProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface AnalystContextType {
  user: AnalystProfile | null;
  token: string | null;
  setUser: (user: AnalystProfile | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AnalystContext = createContext<AnalystContextType | undefined>(undefined);

export const AnalystProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AnalystProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Rehydrate from sessionStorage
    const stored = sessionStorage.getItem('analyst_token');
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('analyst_token', token);
      if (!user) {
        getProfile(token)
          .then((p) => setUser(p))
          .catch(() => setUser(null));
      }
    } else {
      sessionStorage.removeItem('analyst_token');
    }
  }, [token, user]);

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('analyst_token');
  };

  return (
    <AnalystContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </AnalystContext.Provider>
  );
};

export const useAnalyst = () => {
  const ctx = useContext(AnalystContext);
  if (!ctx) throw new Error('useAnalyst must be used within AnalystProvider');
  return ctx;
};
