import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { setApiAccessToken } from "@/lib/windieApi";
import { Button } from "@/components/ui/button";
import RuntimeAccessGate from "@/components/auth/RuntimeAccessGate";

function AuthFrame({ children }) {
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

function LoadingAuth() {
  return (
    <AuthFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Checking session…
      </p>
    </AuthFrame>
  );
}

function MissingConfiguration() {
  return (
    <AuthFrame>
      <ShieldCheck className="mb-4 size-5 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="text-lg font-medium">Sign-in is being configured</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The Inspector is not available until its account service is configured.
      </p>
    </AuthFrame>
  );
}

/**
 * Holds the Inspector behind Google sign-in. The WindieProvider is mounted only
 * after Supabase restores or creates a hosted account session, so unauthenticated
 * visitors never load the local-runtime client.
 */
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    let isCurrent = true;

    async function restoreSession() {
      const {
        data: { session: restoredSession },
      } = await supabase.auth.getSession();

      if (isCurrent) {
        setSession(restoredSession);
        setApiAccessToken(restoredSession?.access_token);
        setIsLoading(false);
      }
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isCurrent) {
        setSession(nextSession);
        setApiAccessToken(nextSession?.access_token);
        setIsLoading(false);
      }
    });

    return () => {
      isCurrent = false;
      setApiAccessToken(null);
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    if (!supabase) {
      return;
    }

    setIsSigningIn(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError("We could not start Google sign-in. Please try again shortly.");
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  if (!supabase) {
    return <MissingConfiguration />;
  }

  if (isLoading) {
    return <LoadingAuth />;
  }

  if (session) {
    return (
      <AuthProvider value={{ session, signOut }}>
        <RuntimeAccessGate>{children}</RuntimeAccessGate>
      </AuthProvider>
    );
  }

  return (
    <AuthFrame>
      <h1 className="text-lg font-medium">Sign in to Windie</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Continue with your Google account to open the Inspector.
      </p>

      <Button
        className="mt-6 w-full"
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={isSigningIn}
      >
        {isSigningIn ? "Opening Google…" : "Continue with Google"}
      </Button>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-7 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Your conversations, API keys, tools, and runtime stay on this computer.
      </p>
    </AuthFrame>
  );
}
