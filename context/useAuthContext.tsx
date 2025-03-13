"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (token) setSessionToken(token);
  }, []);

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem("sessionToken", sessionToken);
    } else {
      localStorage.removeItem("sessionToken");
    }
  }, [sessionToken]);

  const clearSession = () => {
    setSessionToken(null);
    localStorage.removeItem("sessionToken");
  };

  return (
    <AuthContext.Provider value={{ sessionToken, setSessionToken, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider");
  }
  return context;
}
