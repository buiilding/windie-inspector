/**
 * Builds the canonical Inspector location for one durable session.
 *
 * A session is Windie's executable branch over a shared conversation tree.
 * URLs name that branch directly; the local API remains responsible for
 * resolving its conversation and current message head.
 */
export function sessionLocation(sessionId) {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new Error("a session location requires a session id");
  }

  return `/sessions/${encodeURIComponent(sessionId)}`;
}
