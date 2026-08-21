import { useCallback, useEffect, useState } from "react";
import { Link2, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRuntimeAccess,
  pairRuntimeAccess,
} from "@/lib/windieApi";

function RuntimeFrame({ children }) {
  return (
    <main className="min-h-full bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-sm items-center">
        <section className="w-full border border-border bg-card p-7 shadow-sm">
          <div className="mb-7 flex items-center gap-2.5">
            <img
              src="/windie-icon-light.png"
              alt=""
              aria-hidden="true"
              className="size-6 object-contain"
              draggable="false"
            />
            <span className="font-mono text-sm font-semibold tracking-tight">
              windie
            </span>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

function CheckingRuntime() {
  return (
    <RuntimeFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Connecting to local Windie…
      </p>
    </RuntimeFrame>
  );
}

/**
 * Requires a signed-in account to explicitly pair with the local API before
 * mounting the Inspector. This makes the pairing action visible and prevents
 * application requests from reaching an unapproved runtime.
 */
export default function RuntimeAccessGate({ children }) {
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");
  const [isPairing, setIsPairing] = useState(false);

  const refreshAccess = useCallback(async () => {
    setError("");
    try {
      const nextAccess = await getRuntimeAccess();
      setAccess(nextAccess);
      return nextAccess;
    } catch (nextError) {
      setAccess(null);
      setError(nextError.message || "Windie could not reach the local runtime.");
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const approvePairing = useCallback(async () => {
    setIsPairing(true);
    setError("");
    try {
      const nextAccess = await pairRuntimeAccess();
      setAccess(nextAccess);
    } catch (nextError) {
      setError(nextError.message || "Windie could not pair this local runtime.");
    } finally {
      setIsPairing(false);
    }
  }, []);

  if (access?.state === "linked") return children;

  if (access?.state === "owned_by_another_account") {
    return (
      <RuntimeFrame>
        <MonitorSmartphone className="mb-4 size-5 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-lg font-medium">This Windie is paired elsewhere</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The local runtime on this computer is already connected to a different Windie account.
        </p>
      </RuntimeFrame>
    );
  }

  if (access?.state === "unpaired") {
    return (
      <RuntimeFrame>
        <Link2 className="mb-4 size-5 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-lg font-medium">Connect this local Windie</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Approve linking your signed-in Windie account to the runtime running on this computer.
        </p>
        <Button
          className="mt-6 w-full"
          type="button"
          onClick={() => void approvePairing()}
          disabled={isPairing}
        >
          {isPairing ? "Connecting…" : "Connect this computer"}
        </Button>
        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>
        ) : null}
      </RuntimeFrame>
    );
  }

  if (!error) return <CheckingRuntime />;

  return (
    <RuntimeFrame>
      <MonitorSmartphone className="mb-4 size-5 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="text-lg font-medium">Local Windie is unavailable</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Start Windie on this computer, then try again.
      </p>
      <pre className="mt-4 border border-border bg-background px-3 py-2 font-mono text-xs">windie start</pre>
      <Button className="mt-6 w-full" type="button" variant="outline" onClick={() => void refreshAccess()}>
        Try again
      </Button>
      <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>
    </RuntimeFrame>
  );
}
