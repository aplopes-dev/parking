import React, { createContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { switchTenant as apiSwitchTenant } from '../services/multistoreApi';
import { User, AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        refreshUser();
      } catch (error) {
        console.error('Error parsing stored user:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await api.get<User>('/auth/me');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    tenantSlug: string,
  ): Promise<{ access_token: string; user: User }> => {
    const response = await api.post<{ access_token: string; user: User }>('/auth/login', {
      email,
      password,
      tenantSlug: tenantSlug.trim().toLowerCase(),
    });
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('lastTenantSlug', tenantSlug.trim().toLowerCase());
    setUser(response.data.user);
    return response.data;
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const switchTenant = async (tenantId: string): Promise<void> => {
    const data = await apiSwitchTenant(tenantId);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.user.tenant?.slug) {
      localStorage.setItem('lastTenantSlug', data.user.tenant.slug);
    }
    setUser(data.user as User);
    window.location.assign('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
};
