import { createContext, useContext } from "react";

const AuthContext = createContext(null);

/** Stable access modes exposed to presentation components. */
export const AUTH_KIND = Object.freeze({
  LOCAL: "local",
  HOSTED: "hosted",
  PUBLIC_DEMO: "public_demo",
});

/**
 * Provides the Inspector's explicit local-capability, hosted-account, or
 * anonymous public-demo access mode to presentation components. Access tokens
 * remain owned by the surrounding gates and are never stored here.
 */
export function AuthProvider({ value, children }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the access mode exposed by the surrounding auth gate.
 */
export function useAuth() {
  const auth = useContext(AuthContext);

  if (auth === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return auth;
}
