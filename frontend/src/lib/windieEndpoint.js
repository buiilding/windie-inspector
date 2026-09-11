/** Browser endpoint selection for local Inspector and public demo builds. */

export const LOCAL_WINDIE_API_BASE = "http://127.0.0.1:8787";
export const PUBLIC_DEMO_API_BASE = "https://api-demo.windieos.com";

/** Returns whether the Inspector is running as the anonymous public demo. */
export function isPublicDemoInspectorOrigin(location = window.location) {
  return location.hostname === "app.windieos.com";
}

/** Resolves the API endpoint without changing the local Inspector default. */
export function resolveWindieApiBase({
  location = typeof window !== "undefined" ? window.location : null,
  runtimeOverride =
    typeof window !== "undefined" ? window.__WINDIE_API_URL__ : null,
  buildOverride = process.env.REACT_APP_WINDIE_API_URL,
} = {}) {
  if (location && isPublicDemoInspectorOrigin(location)) {
    return PUBLIC_DEMO_API_BASE;
  }
  if (runtimeOverride) return runtimeOverride;
  if (buildOverride) return buildOverride;
  return LOCAL_WINDIE_API_BASE;
}

export const WINDIE_API_BASE = resolveWindieApiBase();
