import { useEffect, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import {
  exchangeLocalAccessCode,
  setLocalApiAccessToken,
} from "@/lib/windieApi";
import {
  LOCAL_ACCESS_STORAGE_KEY,
  clearLocalLaunchCode,
  localLaunchCode,
} from "@/lib/localInspectorAccess";

function LocalAccessFrame({ children }) {
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

/**
 * Exchanges a one-time launch fragment for a tab-scoped local API token before
 * mounting the runtime UI. No hosted identity or durable browser credential is
 * involved; closing the tab drops sessionStorage and an API restart invalidates
 * every issued token.
 */
export default function LocalAccessGate({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    const code = localLaunchCode();
    const storedToken = window.sessionStorage.getItem(LOCAL_ACCESS_STORAGE_KEY);

    if (!code && storedToken) {
      setLocalApiAccessToken(storedToken);
      setIsReady(true);
      return () => setLocalApiAccessToken(null);
    }

    if (!code) {
      setError("Open the Inspector through Windie to create local access.");
      return () => setLocalApiAccessToken(null);
    }

    exchangeLocalAccessCode(code)
      .then(({ access_token: accessToken }) => {
        if (!isCurrent) return;
        window.sessionStorage.setItem(LOCAL_ACCESS_STORAGE_KEY, accessToken);
        setLocalApiAccessToken(accessToken);
        clearLocalLaunchCode();
        setIsReady(true);
      })
      .catch((nextError) => {
        if (!isCurrent) return;
        window.sessionStorage.removeItem(LOCAL_ACCESS_STORAGE_KEY);
        setError(nextError.message || "Windie could not create local Inspector access.");
      });

    return () => {
      isCurrent = false;
      setLocalApiAccessToken(null);
    };
  }, []);

  if (isReady) return children;

  return (
    <LocalAccessFrame>
      <MonitorSmartphone className="mb-4 size-5 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="text-lg font-medium">Local Inspector access</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {error || "Connecting this browser tab to the local Windie runtime…"}
      </p>
      {error ? (
        <pre className="mt-4 border border-border bg-background px-3 py-2 font-mono text-xs">
          windie inspector open
        </pre>
      ) : null}
    </LocalAccessFrame>
  );
}
