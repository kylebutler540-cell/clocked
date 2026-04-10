import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

// ── Saved accounts helpers (persisted in localStorage) ────────────────────────
// Structure: [{ token, userId, email, displayName, avatarUrl }]
const ACCOUNTS_KEY = 'clocked-accounts';

function getSavedAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch { return []; }
}

function upsertSavedAccount(entry) {
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === entry.userId);
  if (idx >= 0) accounts[idx] = entry;
  else accounts.push(entry);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function removeSavedAccount(userId) {
  const accounts = getSavedAccounts().filter(a => a.userId !== userId);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Try to restore user from saved accounts cache instantly
function getInitialUser(token) {
  if (!token) return null;
  const saved = getSavedAccounts().find(a => a.token === token);
  if (!saved) return null;
  return {
    id: saved.userId,
    email: saved.email,
    display_name: saved.displayName,
    avatar_url: saved.avatarUrl,
    _fromCache: true,
  };
}

export function AuthProvider({ children }) {
  const storedToken = localStorage.getItem('clocked-token');
  const [user, setUser] = useState(() => getInitialUser(storedToken));
  const [token, setToken] = useState(() => storedToken);
  // If we have a cached user, skip the loading flash entirely
  const [loading, setLoading] = useState(!getInitialUser(storedToken));
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      initAnonymous();
    }
  }, []);

  async function fetchMe(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await api.get('/auth/me');
        // Replace cached user with fresh server data
        const freshUser = res.data.user;
        setUser(freshUser);
        // Update the cache with fresh data
        if (freshUser?.email) {
          const currentToken = localStorage.getItem('clocked-token');
          upsertSavedAccount({
            token: currentToken,
            userId: freshUser.id,
            email: freshUser.email,
            displayName: freshUser.display_name || freshUser.username || freshUser.email.split('@')[0],
            avatarUrl: freshUser.avatar_url || null,
          });
          setSavedAccounts(getSavedAccounts());
        }
        setLoading(false);
        return;
      } catch (err) {
        const status = err.response?.status;
        // 401 = token genuinely invalid — clear it, don't retry
        if (status === 401) {
          localStorage.removeItem('clocked-token');
          setToken(null);
          setUser(null);
          initAnonymous();
          return;
        }
        // Network/5xx — wait and retry
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        // All retries exhausted — keep cached user, just stop loading
        setLoading(false);
      }
    }
  }

  async function initAnonymous(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await api.post('/auth/anonymous');
        saveSession(res.data.token, res.data.user, false);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * attempt));
          continue;
        }
        console.error('Failed to init anonymous session after retries', err);
        setLoading(false);
      }
    }
  }

  function saveSession(newToken, newUser, persist = true) {
    localStorage.setItem('clocked-token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    // Only persist real accounts (have an email)
    if (persist && newUser?.email) {
      const entry = {
        token: newToken,
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name || newUser.username || newUser.email.split('@')[0],
        avatarUrl: newUser.avatar_url || null,
      };
      upsertSavedAccount(entry);
      setSavedAccounts(getSavedAccounts());
    }
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

  async function loginWithGoogle(credential) {
    const res = await api.post('/auth/google', { credential });
    saveSession(res.data.token, res.data.user);
    return res.data;
  }

  // Switch to a saved account by its stored token
  async function switchToAccount(account) {
    localStorage.setItem('clocked-token', account.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${account.token}`;
    setToken(account.token);
    setLoading(true);
    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data.user;
      setUser(freshUser);
      // Update the saved account with fresh data
      const entry = {
        token: account.token,
        userId: freshUser.id,
        email: freshUser.email,
        displayName: freshUser.display_name || freshUser.username || freshUser.email?.split('@')[0] || 'Account',
        avatarUrl: freshUser.avatar_url || null,
      };
      upsertSavedAccount(entry);
      setSavedAccounts(getSavedAccounts());
    } catch {
      // Token expired — remove from saved accounts
      removeSavedAccount(account.userId);
      setSavedAccounts(getSavedAccounts());
      // Fall through to re-auth
      localStorage.removeItem('clocked-token');
      setToken(null);
      initAnonymous();
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('clocked-token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    initAnonymous();
  }

  // Update savedAccounts whenever user profile changes (e.g. after profile setup)
  function setUserAndSync(newUser) {
    setUser(newUser);
    if (newUser?.email && token) {
      const entry = {
        token,
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name || newUser.username || newUser.email.split('@')[0],
        avatarUrl: newUser.avatar_url || null,
      };
      upsertSavedAccount(entry);
      setSavedAccounts(getSavedAccounts());
    }
  }

  const isSubscribed = user && ['ACTIVE', 'TRIALING'].includes(user.subscription_status);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, loginWithGoogle, logout,
      isSubscribed,
      setUser: setUserAndSync,
      savedAccounts,
      switchToAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
