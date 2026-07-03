import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  username: string;
  phone: string;
  avatar: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (username: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const API = 'https://novachartbox.onrender.com/api';
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('novachart_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await axios.post(`${API}/auth/login`, { phone, password });
    setUser(res.data);
    localStorage.setItem('novachart_user', JSON.stringify(res.data));
  };

  const register = async (username: string, phone: string, password: string) => {
    const res = await axios.post(`${API}/auth/register`, { username, phone, password });
    setUser(res.data);
    localStorage.setItem('novachart_user', JSON.stringify(res.data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('novachart_user');
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext)!;
export { API };
