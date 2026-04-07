import React, { createContext, useContext, useState } from 'react';

const MessagingContext = createContext({ fullscreen: false, setFullscreen: () => {} });

export function MessagingProvider({ children }) {
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <MessagingContext.Provider value={{ fullscreen, setFullscreen }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  return useContext(MessagingContext);
}
