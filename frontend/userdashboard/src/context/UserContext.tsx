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
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (token && !user) {
      getProfile(token)
        .then((profile) => setUser(profile))
        .catch(() => setUser(null));
    }
  }, [token, user]);

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <UserContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
