import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { cacheClear, lsClear } from '../lib/cache';
import { clearFeedCache } from '../components/Feed';
import { clearPostStore } from '../lib/postStore';
import { clearPollStore } from '../lib/pollStore';

const AuthContext = createContext();

const ACCOUNTS_KEY = 'clocked-accounts';

function getSavedAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); } catch { return []; }
}

function upsertSavedAccount(entry) {
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === entry.userId);
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...entry };
  else accounts.push(entry);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function removeSavedAccount(userId) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(getSavedAccounts().filter(a => a.userId !== userId)));
}

// Decode JWT payload without verifying — just to read userId
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch { return null; }
}

// Instantly restore user from cache using userId from JWT — works even if token changed
// NOTE: no side effects here — called inside useState initializer which runs twice in StrictMode
function getInitialUser(token) {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload?.userId) return null;
  const saved = getSavedAccounts().find(a => a.userId === payload.userId);
  if (!saved) return null;
  const ADMIN_EMAILS = ['kylebutler540@gmail.com', 'clockedreports@gmail.com'];
  return {
    id: saved.userId,
    email: saved.email,
    is_admin: ADMIN_EMAILS.includes(saved.email),
    display_name: saved.displayName,
    avatar_url: saved.avatarUrl,
    _fromCache: true,
  };
}

export function AuthProvider({ children }) {
  // If stored token is anonymous but we have a real saved account, restore the real one
  function getBestToken() {
    const stored = localStorage.getItem('clocked-token');
    if (!stored) return null;
    const payload = decodeJwtPayload(stored);
    if (!payload?.userId) return stored;
    // Check if this token belongs to a real (email) account
    const saved = getSavedAccounts();
    const matchedAccount = saved.find(a => a.userId === payload.userId);
    if (matchedAccount?.email) return stored; // real account, keep it
    // Token is anon — check if we have a real saved account to restore
    const realAccount = saved.find(a => a.email && a.token);
    if (realAccount) {
      localStorage.setItem('clocked-token', realAccount.token);
      return realAccount.token;
    }
    return stored; // no real account to restore, use what we have
  }

  const storedToken = getBestToken();
  const cachedUser = getInitialUser(storedToken);

  // Set auth header immediately before any state/effect runs
  if (storedToken) api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

  const [user, setUser] = useState(() => cachedUser);
  const [token, setToken] = useState(() => storedToken);
  // If we have a cached user, loading is immediately false — no downstream waiting
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());

  useEffect(() => {
    if (storedToken) {
      // Sync saved account token if needed (was split out of getInitialUser to avoid StrictMode issues)
      const payload = decodeJwtPayload(storedToken);
      if (payload?.userId) {
        const saved = getSavedAccounts().find(a => a.userId === payload.userId);
        if (saved && saved.token !== storedToken) {
          upsertSavedAccount({ ...saved, token: storedToken });
        }
      }
      fetchMe();
    } else {
      initAnonymous();
    }
  }, []); // eslint-disable-line

  async function fetchMe(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await api.get('/auth/me');
        const freshUser = res.data.user;
        setUser(freshUser);
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
        } else {
          // Anon user resolved — if there's a real saved account, restore it
          // This handles the case where an anon token replaced a real one
          const realAccounts = getSavedAccounts().filter(a => a.email && a.token);
          if (realAccounts.length > 0) {
            const best = realAccounts[0];
            localStorage.setItem('clocked-token', best.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${best.token}`;
            setToken(best.token);
            setTimeout(() => fetchMe(), 50);
            return;
          }
        }
        setLoading(false);
        return;
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          // Token invalid — try to restore a real saved account before going anon
          const realAccounts = getSavedAccounts().filter(a => a.email && a.token);
          const currentUserId = decodeJwtPayload(localStorage.getItem('clocked-token'))?.userId;
          const otherReal = realAccounts.find(a => a.userId !== currentUserId);
          if (otherReal) {
            // Restore another real account's token
            localStorage.setItem('clocked-token', otherReal.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${otherReal.token}`;
            setToken(otherReal.token);
            setLoading(false);
            fetchMe();
          } else {
            localStorage.removeItem('clocked-token');
            setToken(null);
            setUser(null);
            initAnonymous();
          }
          return;
        }
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        // All retries failed — keep whatever user we have, never wipe to null
        // The backend might be temporarily slow; don't log the user out
        setLoading(false);
      }
    }
  }

  async function initAnonymous(retries = 3) {
    // NEVER overwrite a real account's token with an anonymous one
    // BUT: if the user explicitly logged out, don't auto-restore — let them choose
    const explicitLogout = localStorage.getItem('clocked-explicit-logout');
    const realAccounts = getSavedAccounts().filter(a => a.email && a.token);
    if (realAccounts.length > 0 && !explicitLogout) {
      // Restore best real account (normal app startup)
      const best = realAccounts[0];
      localStorage.setItem('clocked-token', best.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${best.token}`;
      setToken(best.token);
      setLoading(false);
      fetchMe(); // verify token still valid
      return;
    }
    const existing = localStorage.getItem('clocked-token');
    if (existing) {
      const payload = decodeJwtPayload(existing);
      if (payload?.userId) {
        const saved = getSavedAccounts().find(a => a.userId === payload.userId);
        if (saved?.email) {
          setLoading(false);
          return;
        }
      }
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await api.post('/auth/anonymous');
        saveSession(res.data.token, res.data.user, false);
        setLoading(false);
        return;
      } catch {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 800 * attempt));
          continue;
        }
        setLoading(false);
      }
    }
  }

  function saveSession(newToken, newUser, persist = true) {
    // Clear explicit-logout flag whenever a real session is saved
    if (newUser?.email) localStorage.removeItem('clocked-explicit-logout');
    // Never overwrite a real user's token with an anon session
    // But ONLY block if we're not explicitly logging out (persist=false, no email)
    if (!persist && !newUser?.email) {
      const realAccounts = getSavedAccounts().filter(a => a.email);
      const currentToken = localStorage.getItem('clocked-token');
      if (currentToken && realAccounts.length > 0) {
        // Still update API header to keep requests working
        api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
        // Don't write anon token or update user state
        return;
      }
    }
    localStorage.setItem('clocked-token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    if (persist && newUser?.email) {
      upsertSavedAccount({
        token: newToken,
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name || newUser.username || newUser.email.split('@')[0],
        avatarUrl: newUser.avatar_url || null,
      });
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

  async function switchToAccount(account) {
    // Clear explicit-logout flag — user is actively choosing an account
    localStorage.removeItem('clocked-explicit-logout');
    // Clear ALL caches — in-memory, feed, post store, and localStorage
    cacheClear();
    clearFeedCache();
    clearPostStore();
    clearPollStore(); // prevent previous account's vote state from leaking
    lsClear(''); // clears all clocked_c_ prefixed keys
    localStorage.removeItem('clocked_notifications');
    localStorage.removeItem('clocked_unread_count');
    // Clear old user immediately so no stale data can render
    setUser(null);
    // Signal all account-scoped components to reset
    window.dispatchEvent(new CustomEvent('account:switching'));

    localStorage.setItem('clocked-token', account.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${account.token}`;
    setToken(account.token);
    setLoading(true);
    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data.user;
      setUser(freshUser);
      // Update saved account with latest data and token
      upsertSavedAccount({
        token: account.token,
        userId: freshUser.id,
        email: freshUser.email,
        displayName: freshUser.display_name || freshUser.username || freshUser.email?.split('@')[0] || 'Account',
        avatarUrl: freshUser.avatar_url || null,
      });
      setSavedAccounts(getSavedAccounts());
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        // Token expired — remove this account from saved list but DON'T log user out
        // Just fall back to whatever was active before
        removeSavedAccount(account.userId);
        setSavedAccounts(getSavedAccounts());
        // Restore previous token if we have one
        const realAccounts = getSavedAccounts().filter(a => a.email && a.token);
        if (realAccounts.length > 0) {
          const best = realAccounts[0];
          localStorage.setItem('clocked-token', best.token);
          api.defaults.headers.common['Authorization'] = `Bearer ${best.token}`;
          setToken(best.token);
          await fetchMe();
        } else {
          localStorage.removeItem('clocked-token');
          setToken(null);
          initAnonymous();
        }
      }
      // On network errors: keep current state, don't wipe anything
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    // Remove ONLY the current account from the saved list — leave all other accounts intact
    const currentUserId = user?.id;
    if (currentUserId) removeSavedAccount(currentUserId);

    // Mark as explicitly logged out so initAnonymous doesn't auto-restore another account
    localStorage.setItem('clocked-explicit-logout', '1');

    // Clear current session token and account-scoped data
    localStorage.removeItem('clocked-token');
    localStorage.removeItem('clocked_notifications');
    localStorage.removeItem('clocked_unread_count');
    cacheClear();
    clearFeedCache();
    clearPostStore();
    clearPollStore(); // prevent previous account's vote state from leaking
    lsClear('');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);

    // Update saved accounts list (current account removed, others stay)
    const remaining = getSavedAccounts();
    setSavedAccounts(remaining);
  }

  function setUserAndSync(newUser) {
    setUser(newUser);
    if (newUser?.email && token) {
      upsertSavedAccount({
        token,
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name || newUser.username || newUser.email.split('@')[0],
        avatarUrl: newUser.avatar_url || null,
      });
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
