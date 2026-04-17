import React, { createContext, useContext, useState, useCallback } from 'react';

const MessagingContext = createContext({
  fullscreen: false,
  setFullscreen: () => {},
  activeThreadUserId: null,
  openThread: () => {},
  closeThread: () => {},
});

export function MessagingProvider({ children }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [activeThreadUserId, setActiveThreadUserId] = useState(null);

  const openThread = useCallback((userId) => {
    setActiveThreadUserId(userId);
    setFullscreen(true);
  }, []);

  const closeThread = useCallback(() => {
    setActiveThreadUserId(null);
    setFullscreen(false);
  }, []);

  return (
    <MessagingContext.Provider value={{ fullscreen, setFullscreen, activeThreadUserId, openThread, closeThread }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  return useContext(MessagingContext);
}
