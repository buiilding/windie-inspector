import { createContext, useContext } from "react";

const AuthContext = createContext(null);

/**
 * Provides the authenticated hosted-account session to Inspector presentation
 * components. The surrounding runtime-access gate forwards its short-lived
 * access token only to the browser machine's loopback API.
 */
export function AuthProvider({ value, children }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the hosted-account session exposed by the surrounding auth gate.
 */
export function useAuth() {
  const auth = useContext(AuthContext);

  if (auth === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return auth;
}
