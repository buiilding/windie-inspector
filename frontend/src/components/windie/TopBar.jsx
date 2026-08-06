import { useWindie } from "@/context/WindieContext";
import { Sun, Moon } from "lucide-react";

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

  return (
    <header
      data-testid="windie-topbar"
      className="relative z-50 h-9 shrink-0 pointer-events-none flex items-center px-3 gap-4 bg-background border-b border-border text-xs font-mono select-none"
    >
      <div className="flex items-center gap-2">
        <div className="size-2 bg-foreground" />
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
