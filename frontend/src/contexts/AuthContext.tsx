import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export type UserRole = 'Admin' | 'Sales' | 'User' | 'Builders Sales' | 'Architects / Interior Sales' | 'Contractors / End-to-End' | 'PMC';

export type SalesDept = 'builders' | 'architects' | 'contractors' | 'end-to-end';

interface User {
  email: string;
  role: UserRole;
  name: string;
  selectedDepartment?: SalesDept;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  setDepartment: (dept: SalesDept) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem('omada_user');
        const token = localStorage.getItem('omada_token');
        if (savedUser && token) {
           setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Failed to init auth');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res;
      
      localStorage.setItem('omada_token', token);
      localStorage.setItem('omada_user', JSON.stringify(user));
      
      setUser(user);
      
      toast.success(`Welcome back, ${user.name}`);
      return user;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const setDepartment = async (dept: SalesDept) => {
    if (user) {
      const newUser = { ...user, selectedDepartment: dept };
      setUser(newUser);
      localStorage.setItem('omada_user', JSON.stringify(newUser));
      // Optionally update in DB
      try {
        await api.patch(`/auth/department`, { department: dept });
      } catch (err) {
        console.error('Failed to sync department to server');
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('omada_token');
    localStorage.removeItem('omada_user');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setDepartment, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
