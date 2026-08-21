import { useWindie } from "@/context/WindieContext";
import { useAuth } from "@/context/AuthContext";
import { Sun, Moon, LogOut } from "lucide-react";

function formatTokenCount(value) {
  if (value == null) return "--";
  if (value >= 1_000_000) return `${Number(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `${Number(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

const TOKEN_METER_TITLE = "Token count over selected model context";

export default function TopBar() {
  const {
    activeConv,
    theme,
    setTheme,
    tokenMeter,
  } = useWindie();
  const { session, signOut } = useAuth();

  return (
    <header
      data-testid="windie-topbar"
      className="relative z-50 h-9 shrink-0 pointer-events-none flex items-center px-3 gap-4 bg-background border-b border-border text-xs font-mono select-none"
    >
      <div className="flex items-center gap-2">
        <img
          src="/windie-icon-light.png"
          alt=""
          aria-hidden="true"
          className="size-4 object-contain"
          draggable="false"
        />
        <span className="font-semibold tracking-tight text-sm font-sans">windie</span>
      </div>

      <div className="flex-1" />

      <div
        className="flex items-center gap-1.5"
        title={TOKEN_METER_TITLE}
      >
        <span className="uppercase tracking-widest">tokens</span>
        <span className="text-foreground">
          {formatTokenCount(tokenMeter?.used)} / {formatTokenCount(tokenMeter?.max)}
        </span>
      </div>

      <span
        className="max-w-40 truncate text-muted-foreground"
        title={session.user.email}
      >
        {session.user.email}
      </span>

      <button
        onClick={() => void signOut()}
        aria-label="sign out"
        className="pointer-events-auto flex items-center justify-center size-7 border border-border hover:bg-surface-hover transition-colors"
      >
        <LogOut className="size-3.5" strokeWidth={1.75} />
      </button>

      <button
        data-testid="topbar-toggle-theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="toggle theme"
        className="pointer-events-auto flex items-center justify-center size-7 border border-border hover:bg-surface-hover transition-colors"
      >
        {theme === "dark" ? (
          <Sun className="size-3.5" strokeWidth={1.75} />
        ) : (
          <Moon className="size-3.5" strokeWidth={1.75} />
        )}
      </button>
    </header>
  );
}
