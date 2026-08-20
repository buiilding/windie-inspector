import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Windie from "@/pages/Windie";
import { useWindie } from "@/context/WindieContext";

/**
 * Resolves one canonical session URL before rendering the Inspector workspace.
 *
 * The route owns URL-to-session navigation only. It does not infer a
 * conversation from browser state: `openSession` asks the local API for the
 * authoritative session record and its conversation relationship.
 */
export default function SessionRoute() {
  const { sessionId } = useParams();
  const { openSession } = useWindie();
  const [state, setState] = useState({ status: "loading", error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", error: null });

    openSession(sessionId)
      .then(() => {
        if (!cancelled) setState({ status: "ready", error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [openSession, sessionId]);

  if (state.status === "ready") return <Windie />;

  return (
    <main className="min-h-full bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-sm items-center">
        <section className="w-full border border-border bg-card p-7 shadow-sm">
          <h1 className="text-lg font-medium">
            {state.status === "loading" ? "Opening session…" : "Session unavailable"}
          </h1>
          {state.status === "error" && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {state.error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
