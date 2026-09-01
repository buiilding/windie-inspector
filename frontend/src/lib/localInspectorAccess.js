/** Browser-only helpers for selecting and restoring local Inspector access. */

export const LOCAL_ACCESS_STORAGE_KEY = "windie.localInspectorAccess";

/** Returns whether this frontend was loaded from a loopback development or packaged origin. */
export function isLocalInspectorOrigin(location = window.location) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
    location.hostname
  );
}

/** Reads the one-time launch code from a fragment that is never sent to an HTTP server. */
export function localLaunchCode(location = window.location) {
  const fragment = location.hash.startsWith("#")
    ? location.hash.slice(1)
    : location.hash;
  return new URLSearchParams(fragment).get("windie-local-code") || "";
}

/** Removes the consumed code without navigating or adding browser history. */
export function clearLocalLaunchCode() {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}
