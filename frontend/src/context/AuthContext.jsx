import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('clocked-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      initAnonymous();
    }
  }, []);

  async function fetchMe() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch {
      // Token invalid — start fresh anonymous session
      localStorage.removeItem('clocked-token');
      setToken(null);
      initAnonymous();
    } finally {
      setLoading(false);
    }
  }

  async function initAnonymous() {
    try {
      const res = await api.post('/auth/anonymous');
      saveSession(res.data.token, res.data.user);
    } catch (err) {
      console.error('Failed to init anonymous session', err);
    } finally {
      setLoading(false);
    }
  }

  function saveSession(newToken, newUser) {
    localStorage.setItem('clocked-token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    saveSession(res.data.token, res.data.user);
    return res.data;
  }

  async function register(email, password) {
    const res = await api.post('/auth/register', { email, password });
    saveSession(res.data.token, res.data.user);
    return res.data;
  }

  function logout() {
    localStorage.removeItem('clocked-token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    initAnonymous();
  }

  const isSubscribed = user && ['ACTIVE', 'TRIALING'].includes(user.subscription_status);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isSubscribed, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
