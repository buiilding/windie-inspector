import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  PackageOpen,
  Power,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { checkChromeDevtoolsRemoteDebugging, setEnvValues } from "@/lib/windieApi";
import { useWindie } from "@/context/WindieContext";
import cuaDarkLogo from "@/assets/provider-icons/cua-dark.svg";
import cuaLightLogo from "@/assets/provider-icons/cua-light.svg";
import desktopCommanderLogo from "@/assets/provider-icons/desktop-commander.svg";
import blenderLogo from "@/assets/provider-icons/blender.svg";
import brightDataLogo from "@/assets/provider-icons/brightdata.svg";
import basicMemoryDarkLogo from "@/assets/provider-icons/basic-memory-dark.svg";
import basicMemoryLightLogo from "@/assets/provider-icons/basic-memory-light.svg";
import parallelDarkLogo from "@/assets/provider-icons/parallel-dark.svg";
import parallelLightLogo from "@/assets/provider-icons/parallel-light.svg";
import chromeDevtoolsLogo from "@/assets/provider-icons/chrome-devtools.svg";

const providerIcons = {
  "desktop-commander": desktopCommanderLogo,
  "blender-mcp": blenderLogo,
  brightdata: brightDataLogo,
  "chrome-devtools": chromeDevtoolsLogo,
};

export function providerOnboardingNote(providerId, chromeDevtoolsMode = "managed") {
  if (providerId === "parallel-search") {
    return "Parallel Search works anonymously for basic usage. Add a Parallel API key for higher rate limits; it is stored locally in ~/.windie/.env.";
  }
  if (providerId !== "chrome-devtools") return null;

  if (chromeDevtoolsMode === "existing") {
    return "Windie connects to your already-running Chrome only after you enable remote debugging and approve Chrome DevTools MCP's request. Configure the provider to switch back to a Windie-managed profile.";
  }
  return "Windie opens a separate persistent Chrome profile. Log into websites once, and Windie will reuse that browser session in future runs. Your normal Chrome profile and open tabs are not used.";
}

export function providerStatus(provider, toolStatus) {
  const state = provider.installation?.state;
  const readiness = provider.installation?.readiness;
  if (!state) {
    return { label: "not installed", tone: "muted", icon: PackageOpen };
  }
  if (state === "enabled") {
    return { label: "enabled", tone: "good", icon: CheckCircle2 };
  }
  if (state === "disabled") {
    return { label: "disabled", tone: "muted", icon: Power };
  }
  if (state === "broken") {
    const labels = {
      missing_runtime: "runtime missing",
      package_setup_failed: "provider package failed",
      provider_startup_failed: "MCP startup failed",
      external_app_required: "app required",
      permission_required: "permission needed",
      missing_secret: "credential needed",
      authentication_failed: "credential rejected",
      unsupported_platform: "unsupported",
    };
    return { label: labels[readiness] || "needs repair", tone: "bad", icon: AlertTriangle };
  }
  if (state === "updating") {
    return { label: "installing", tone: "accent", icon: Loader2 };
  }
  if (toolStatus && !toolStatus.available) {
    return { label: "not responding", tone: "bad", icon: AlertTriangle };
  }
  return { label: "installed", tone: "muted", icon: PackageOpen };
}

function StatusBadge({ status }) {
  const StatusIcon = status.icon;
  const tone = {
    good: "text-[hsl(var(--tool-call))] border-[hsl(var(--tool-call))]/30 bg-[hsl(var(--tool-call))]/8",
    bad: "text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8",
    accent: "text-accent border-accent/30 bg-accent/8",
    muted: "text-muted-foreground border-border bg-surface/40",
  }[status.tone];

  return (
    <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${tone}`}>
      <StatusIcon className={`size-3 ${status.tone === "accent" ? "animate-spin" : ""}`} strokeWidth={1.75} />
      {status.label}
    </span>
  );
}

export function providerIconPresentation(providerId, compact = false) {
  if (compact) {
    return {
      size: "size-10",
      scale: providerId === "desktop-commander" ? 1.05 : 0.85,
      offsetY: providerId === "desktop-commander" ? -1 : 0,
    };
  }
  if (providerId === "desktop-commander" || providerId === "basic-memory") {
    return { size: "size-10", scale: 1.35 };
  }

  return { size: "size-7", scale: 1 };
}

export function extensionVisual(providerId, theme) {
  const providerIcon = providerId === "cua-driver"
    ? theme === "dark" ? cuaDarkLogo : cuaLightLogo
    : providerId === "basic-memory"
      ? theme === "dark" ? basicMemoryDarkLogo : basicMemoryLightLogo
      : providerId === "parallel-search"
        ? theme === "dark" ? parallelDarkLogo : parallelLightLogo
      : providerIcons[providerId];
  return {
    providerIcon,
    Icon: providerIcon || ShieldCheck,
    iconPresentation: providerIconPresentation(providerId),
  };
}

export function ProviderSecretsForm({ providerId, secrets, disabled }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(secrets.map((secret) => [secret.env_key, ""]))
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const filled = secrets.filter((secret) => values[secret.env_key]?.trim());
  const missingRequired = secrets.some(
    (secret) => secret.required && !values[secret.env_key]?.trim()
  );

  const save = async () => {
    if (pending || filled.length === 0 || missingRequired) return;
    setPending(true);
    try {
      await setEnvValues(
        Object.fromEntries(
          filled.map((secret) => [secret.env_key, values[secret.env_key].trim()])
        )
      );
      setSaved(true);
      setValues(Object.fromEntries(secrets.map((secret) => [secret.env_key, ""])));
      toast.message("provider secret saved", { description: providerId });
    } catch (error) {
      toast.error("failed to save provider secret", {
        description: error?.message || String(error),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-w-0 space-y-2 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <KeyRound className="size-3" strokeWidth={1.75} />
        credentials · stored in ~/.windie/.env
      </div>
      {secrets.map((secret) => (
        <div key={secret.env_key} className="min-w-0 space-y-1">
          <label
            htmlFor={`secret-${providerId}-${secret.env_key}`}
            className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground"
          >
            {secret.description}
            {secret.required ? "" : " · optional"}
          </label>
          <input
            id={`secret-${providerId}-${secret.env_key}`}
            type="password"
            data-testid={`secret-input-${providerId}-${secret.env_key}`}
            value={values[secret.env_key]}
            disabled={disabled || pending}
            onChange={(event) => {
              setValues((current) => ({
                ...current,
                [secret.env_key]: event.target.value,
              }));
              setSaved(false);
            }}
            placeholder={secret.env_key}
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            className="h-8 min-w-0 max-w-full w-full border border-border bg-background px-2 font-mono text-[11px] outline-none focus:border-foreground disabled:opacity-50"
          />
        </div>
      ))}
      <div className="flex items-center justify-end">
        <button
          type="button"
          data-testid={`secret-save-${providerId}`}
          disabled={disabled || pending || filled.length === 0 || missingRequired}
          onClick={save}
          className="inline-flex h-7 items-center gap-1.5 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <Check className="size-3" />
          )}
          {pending ? "saving" : saved ? "saved" : "save"}
        </button>
      </div>
    </div>
  );
}

export function ChromeDevToolsConnectionDialog({
  action,
  currentMode = "managed",
  onConfirm,
  onClose,
}) {
  const [mode, setMode] = useState(currentMode || "managed");
  const [stage, setStage] = useState("choice");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stage !== "waiting_for_chrome") return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const result = await checkChromeDevtoolsRemoteDebugging();
        if (cancelled) return;
        if (result.available) {
          setStage("connecting");
          try {
            await onConfirm("existing");
            if (!cancelled) onClose();
          } catch (submitError) {
            if (!cancelled) {
              setStage("error");
              setError(submitError.message);
            }
          }
          return;
        }
      } catch (pollError) {
        if (!cancelled) setError(pollError.message);
      }
      if (!cancelled) timer = window.setTimeout(poll, 700);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [onClose, onConfirm, stage]);

  const chooseManaged = async () => {
    setStage("connecting");
    setError(null);
    try {
      await onConfirm("managed");
      onClose();
    } catch (submitError) {
      setStage("error");
      setError(submitError.message);
    }
  };

  const openChromeSettings = () => {
    setError(null);
    setStage("waiting_for_chrome");
    window.open("chrome://inspect/#remote-debugging", "_blank", "noopener,noreferrer");
  };

  const title = action === "configure" ? "Configure Chrome DevTools" : "Install Chrome DevTools";
  const connecting = stage === "connecting";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-border bg-background p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-sans text-lg font-medium tracking-tight">{title}</h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              choose browser ownership
            </p>
          </div>
          {stage !== "connecting" ? (
            <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              close
            </button>
          ) : null}
        </div>

        {stage === "choice" || stage === "error" ? (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={chooseManaged}
              className={`w-full border px-3 py-3 text-left ${mode === "managed" ? "border-foreground bg-surface" : "border-border hover:bg-surface-hover"}`}
            >
              <span className="block font-mono text-[11px] uppercase tracking-widest">Use Windie-managed Chrome</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Windie starts a separate persistent profile. Your normal Chrome tabs and cookies stay isolated.</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`w-full border px-3 py-3 text-left ${mode === "existing" ? "border-foreground bg-surface" : "border-border hover:bg-surface-hover"}`}
            >
              <span className="block font-mono text-[11px] uppercase tracking-widest">Use my existing Chrome</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Windie can inspect and control your currently running Chrome after you explicitly approve the connection.</span>
            </button>
            {mode === "existing" && (
              <div className="border border-accent/30 bg-accent/8 px-3 py-3 text-[11px] leading-relaxed">
                <p>Open Chrome's remote-debugging settings, enable the checkbox, then leave Chrome running.</p>
                <button type="button" onClick={openChromeSettings} className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-foreground underline underline-offset-4">
                  open Chrome remote debugging
                  <ExternalLink className="size-3" />
                </button>
              </div>
            )}
            {error ? <p className="border border-[hsl(var(--destructive))]/30 px-3 py-2 text-[11px] text-[hsl(var(--destructive))]">{error}</p> : null}
          </div>
        ) : null}

        {stage === "waiting_for_chrome" ? (
          <div className="mt-6 space-y-3 border border-accent/30 bg-accent/8 px-4 py-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest">
              <Loader2 className="size-3 animate-spin" />
              waiting for server confirmation
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">In Chrome, enable “Allow remote debugging for this browser instance.” Windie is checking 127.0.0.1:9222.</p>
            <button type="button" onClick={onClose} className="h-8 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-surface-hover hover:text-foreground">cancel</button>
          </div>
        ) : null}

        {stage === "connecting" ? (
          <div className="mt-6 space-y-3 border border-accent/30 bg-accent/8 px-4 py-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest">
              <Loader2 className="size-3 animate-spin" />
              waiting for Chrome approval
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Chrome DevTools MCP is requesting access. Approve the connection in Chrome, then Windie will verify the MCP tools.</p>
          </div>
        ) : null}

        {stage === "error" ? (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => { setStage("choice"); setError(null); }} className="h-8 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background">try again</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProviderCard({ provider, toolStatus, pending, theme, onAction }) {
  const providerIcon = provider.providerId === "cua-driver"
    ? theme === "dark" ? cuaDarkLogo : cuaLightLogo
    : provider.providerId === "basic-memory"
      ? theme === "dark" ? basicMemoryDarkLogo : basicMemoryLightLogo
    : providerIcons[provider.providerId];
  const iconPresentation = providerIconPresentation(provider.providerId);
  const Icon = providerIcon || ShieldCheck;
  const status = providerStatus(provider, toolStatus);
  const installed = Boolean(provider.installation);
  const state = provider.installation?.state;
  const setupAvailable = (provider.kind || "mcp").toLowerCase() === "mcp";
  const repositoryUrl = provider.documentationUrl;
  const repositoryLabel = "documentation";

  return (
    <article className="group min-w-0 flex flex-col border border-border bg-card/60 transition-colors hover:border-muted-foreground/50 hover:bg-card">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden border border-border bg-surface text-foreground shadow-sm">
          {providerIcon ? (
            <img
              src={providerIcon}
              alt=""
              aria-hidden="true"
              className={`${iconPresentation.size} object-contain`}
              style={{ transform: `scale(${iconPresentation.scale})` }}
            />
          ) : (
            <Icon className="size-6" strokeWidth={1.35} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-sans text-base font-medium tracking-tight text-foreground">{provider.displayName}</h3>
              <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{provider.providerId}</p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-[12px] leading-relaxed text-muted-foreground">{provider.description}</p>

        {providerOnboardingNote(provider.providerId, provider.chromeDevtoolsMode) ? (
          <div
            data-testid={`provider-onboarding-${provider.providerId}`}
            className="border border-accent/30 bg-accent/8 px-3 py-2 text-[11px] leading-relaxed text-foreground"
          >
            {providerOnboardingNote(provider.providerId, provider.chromeDevtoolsMode)}
          </div>
        ) : null}

        {provider.installation?.nextAction ? (
          <div className="border border-accent/30 bg-accent/8 px-3 py-2 text-[11px] leading-relaxed text-foreground">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">next action</span>
            <div className="mt-1">{provider.installation.nextAction}</div>
          </div>
        ) : null}

        {provider.installation?.error ? (
          <details className="border border-border bg-surface/30 px-3 py-2">
            <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-widest text-muted-foreground">setup detail</summary>
            <p className="mt-2 break-words text-[11px] leading-relaxed text-muted-foreground">{provider.installation.error}</p>
          </details>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{provider.kind || "mcp"}</span>
          {repositoryUrl ? (
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              title={repositoryUrl}
              className="inline-flex min-w-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="truncate normal-case tracking-normal">{repositoryLabel}</span>
              <ExternalLink className="size-3 shrink-0" strokeWidth={1.75} />
            </a>
          ) : null}
        </div>

        {(provider.secrets || []).length > 0 && (
          <ProviderSecretsForm
            providerId={provider.providerId}
            secrets={provider.secrets}
            disabled={pending}
          />
        )}
      </div>

      <div className="flex min-h-12 items-center gap-2 border-t border-border bg-surface/25 px-4 py-2">
        {!installed ? (
          <button
            type="button"
            disabled={pending || !setupAvailable}
            onClick={() => onAction("setup", provider.providerId)}
            className={`inline-flex h-8 flex-1 items-center justify-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-widest transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${setupAvailable ? "border-foreground bg-foreground text-background hover:opacity-85" : "border-border text-muted-foreground"}`}
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : setupAvailable ? <Download className="size-3" /> : null}
            {pending ? "installing" : setupAvailable ? "install" : "install unavailable"}
          </button>
        ) : state === "updating" || pending ? (
          <div className="flex flex-1 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            working
          </div>
        ) : state === "broken" ? (
          <button
            type="button"
            onClick={() => onAction("repair", provider.providerId)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-accent bg-accent px-3 font-mono text-[10px] uppercase tracking-widest text-accent-foreground hover:opacity-85"
          >
            <Wrench className="size-3" />
            repair
          </button>
        ) : state === "enabled" ? (
          <button
            type="button"
            onClick={() => onAction("disable", provider.providerId)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <Power className="size-3" />
            disable
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAction("enable", provider.providerId)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85"
          >
            <Check className="size-3" />
            enable
          </button>
        )}

        {installed && state !== "updating" && !pending && (
          <>
            {provider.providerId === "chrome-devtools" ? (
              <button
                type="button"
                title="configure Chrome profile"
                onClick={() => onAction("configure", provider.providerId)}
                className="grid size-8 place-items-center border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                <Settings className="size-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              title="repair extension"
              onClick={() => onAction("repair", provider.providerId)}
              className="grid size-8 place-items-center border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            >
              <Wrench className="size-3.5" />
            </button>
            <button
              type="button"
              title="remove extension"
              onClick={() => onAction("uninstall", provider.providerId)}
              className="grid size-8 place-items-center border border-border text-muted-foreground hover:border-[hsl(var(--destructive))]/50 hover:bg-[hsl(var(--destructive))]/8 hover:text-[hsl(var(--destructive))]"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function FullExtensionsPanel() {
  const {
    theme,
    providerInstallations,
    providerInstallationsLoading,
    toolProviderStatuses,
    setupProvider,
    configureProvider,
    enableProvider,
    disableProvider,
    repairProvider,
    uninstallProvider,
  } = useWindie();
  const [pendingProviderId, setPendingProviderId] = useState(null);
  const [chromeDialog, setChromeDialog] = useState(null);
  const [catalog, setCatalog] = useState("mcps");

  const toolStatusesById = useMemo(
    () => new Map((toolProviderStatuses || []).map((provider) => [provider.providerId, provider])),
    [toolProviderStatuses]
  );

  const catalogs = [
    { id: "mcps", label: "MCPs", count: providerInstallations.length },
    { id: "skills", label: "Skills", count: 0 },
    { id: "plugins", label: "Plugins", count: 0 },
  ];

  const catalogLabel = catalogs.find((entry) => entry.id === catalog)?.label || "MCPs";

  const runAction = async (action, providerId, chromeMode = null, fromDialog = false) => {
    if ((action === "setup" || action === "configure") && providerId === "chrome-devtools" && !fromDialog) {
      setChromeDialog({ action, providerId });
      return;
    }
    if (action === "uninstall" && !window.confirm("Remove this extension from Windie?")) return;
    setPendingProviderId(providerId);
    try {
      const actions = {
        setup: (id) => setupProvider(id, chromeMode),
        configure: (id) => configureProvider(id, chromeMode),
        enable: enableProvider,
        disable: disableProvider,
        repair: repairProvider,
        uninstall: uninstallProvider,
      };
      await actions[action](providerId);
      const labels = {
        setup: "installed",
        enable: "enabled",
        disable: "disabled",
        repair: "repaired",
        uninstall: "removed",
        configure: "reconfigured",
      };
      toast.message(`extension ${labels[action]}`);
    } finally {
      setPendingProviderId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="p-5">
        <div className="mb-5 flex items-center gap-1 border-b border-border pb-3" role="tablist" aria-label="extension catalogs">
          {catalogs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={catalog === entry.id}
              data-testid={`extensions-catalog-${entry.id}`}
              onClick={() => setCatalog(entry.id)}
              className={`h-8 px-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${catalog === entry.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}
            >
              {entry.label}
              <span className="ml-1.5 opacity-60">{entry.count}</span>
            </button>
          ))}
        </div>

        {catalog !== "mcps" ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <PackageOpen className="size-7 text-muted-foreground" strokeWidth={1.25} />
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">no {catalogLabel.toLowerCase()} installed</div>
            <p className="max-w-sm text-[12px] text-muted-foreground">This catalog is ready for future {catalogLabel.toLowerCase()} packages.</p>
          </div>
        ) : providerInstallationsLoading && providerInstallations.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            loading MCPs
          </div>
        ) : providerInstallations.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <PackageOpen className="size-7 text-muted-foreground" strokeWidth={1.25} />
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">no MCPs found</div>
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            {providerInstallations.map((provider) => (
              <ProviderCard
                key={provider.providerId}
                provider={provider}
                toolStatus={toolStatusesById.get(provider.providerId)}
                pending={pendingProviderId === provider.providerId}
                theme={theme}
                onAction={runAction}
              />
            ))}
          </div>
        )}
      </div>
      {chromeDialog ? (
        <ChromeDevToolsConnectionDialog
          action={chromeDialog.action}
          currentMode={providerInstallations.find((provider) => provider.providerId === chromeDialog.providerId)?.chromeDevtoolsMode}
          onConfirm={(mode) => runAction(chromeDialog.action, chromeDialog.providerId, mode, true)}
          onClose={() => setChromeDialog(null)}
        />
      ) : null}
    </div>
  );
}

function SidebarExtensions({ onSelectExtension, selectedExtensionId }) {
  const {
    theme,
    providerInstallations,
    providerInstallationsLoading,
    setupProvider,
    configureProvider,
    enableProvider,
    disableProvider,
    repairProvider,
    uninstallProvider,
    refreshProviderInstallations,
  } = useWindie();
  const [query, setQuery] = useState("");
  const [installedExpanded, setInstalledExpanded] = useState(true);
  const [availableExpanded, setAvailableExpanded] = useState(true);
  const [pendingProviderId, setPendingProviderId] = useState(null);
  const [openMenuProviderId, setOpenMenuProviderId] = useState(null);
  const [chromeDialog, setChromeDialog] = useState(null);
  const menuRef = useRef(null);
  const installed = useMemo(
    () => providerInstallations.filter((provider) => Boolean(provider.installation)),
    [providerInstallations]
  );
  const available = useMemo(
    () => providerInstallations.filter((provider) => !provider.installation),
    [providerInstallations]
  );
  const matchesQuery = (provider) => {
    const value = query.trim().toLowerCase();
    return !value || [provider.displayName, provider.providerId, provider.description]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(value));
  };
  const filteredInstalled = installed.filter(matchesQuery);
  const filteredAvailable = available.filter(matchesQuery);

  useEffect(() => {
    if (!openMenuProviderId) return undefined;
    const handleClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpenMenuProviderId(null);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpenMenuProviderId(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenuProviderId]);

  const install = async (provider, chromeMode = null, fromDialog = false) => {
    if (provider.providerId === "chrome-devtools" && !fromDialog) {
      setChromeDialog({ action: "setup", providerId: provider.providerId });
      return;
    }
    setPendingProviderId(provider.providerId);
    try {
      await setupProvider(provider.providerId, chromeMode);
      toast.message("extension installed");
    } finally {
      setPendingProviderId(null);
    }
  };

  const runAction = async (action, providerId, chromeMode = null, fromDialog = false) => {
    if (action === "configure" && providerId === "chrome-devtools" && !fromDialog) {
      setChromeDialog({ action, providerId });
      return;
    }
    if (action === "uninstall" && !window.confirm("Remove this extension from Windie?")) return;
    setPendingProviderId(providerId);
    try {
      const actions = {
        enable: enableProvider,
        disable: disableProvider,
        repair: repairProvider,
        configure: (id) => configureProvider(id, chromeMode),
        uninstall: uninstallProvider,
      };
      await actions[action](providerId);
      const labels = { enable: "enabled", disable: "disabled", repair: "repaired", configure: "reconfigured", uninstall: "removed" };
      toast.message(`extension ${labels[action]}`);
      setOpenMenuProviderId(null);
    } finally {
      setPendingProviderId(null);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="font-sans text-base font-medium tracking-tight">Extensions</span>
        <button
          type="button"
          data-testid="extensions-refresh"
          aria-label="refresh extensions"
          title="refresh extensions"
          onClick={() => refreshProviderInstallations()}
          className="grid size-7 place-items-center text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          <RefreshCw className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border px-3">
        <input
          data-testid="extensions-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search extensions"
          className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto windie-scroll">
        <button
          type="button"
          aria-expanded={installedExpanded}
          onClick={() => setInstalledExpanded((current) => !current)}
          className="flex w-full items-center justify-between border-b border-border px-3 py-3 text-left hover:bg-surface-hover"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Installed</span>
            <span className="grid size-5 place-items-center rounded-full bg-surface text-[9px] text-foreground">{installed.length}</span>
          </span>
          {installedExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </button>
        {installedExpanded && providerInstallationsLoading && installed.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-3 py-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            loading extensions
          </div>
        ) : installedExpanded && filteredInstalled.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[10px] text-muted-foreground">
            {query ? "no installed extensions match" : "no installed extensions"}
          </div>
        ) : installedExpanded ? (
          <div className="divide-y divide-border border-y border-border">
            {filteredInstalled.map((provider) => {
              const { providerIcon, Icon } = extensionVisual(provider.providerId, theme);
              const compactIconPresentation = providerIconPresentation(provider.providerId, true);
              const state = provider.installation?.state;
              return (
                <div
                  key={provider.providerId}
                  data-testid={`extension-row-${provider.providerId}`}
                  className={`relative flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-hover ${selectedExtensionId === provider.providerId ? "bg-surface" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectExtension?.(provider.providerId)}
                    className="flex min-w-0 flex-1 items-start gap-3 pr-8 text-left"
                  >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden text-foreground">
                    {providerIcon ? <img src={providerIcon} alt="" aria-hidden="true" className={`${compactIconPresentation.size} object-contain`} style={{ transform: `translateY(${compactIconPresentation.offsetY}px) scale(${compactIconPresentation.scale})` }} /> : <Icon className="size-4" strokeWidth={1.35} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[13px] font-medium text-foreground">{provider.displayName}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{provider.description || "No description available."}</span>
                    <span className="block truncate font-sans text-[11px] font-medium text-muted-foreground">{provider.author || provider.providerId}</span>
                  </span>
                  </button>
                  <div
                    ref={openMenuProviderId === provider.providerId ? menuRef : null}
                    className="absolute bottom-1.5 right-3"
                  >
                    <button
                      type="button"
                      aria-label={`settings for ${provider.displayName}`}
                      aria-expanded={openMenuProviderId === provider.providerId}
                      disabled={pendingProviderId === provider.providerId}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuProviderId((current) => current === provider.providerId ? null : provider.providerId);
                      }}
                      className="grid size-6 place-items-center text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                    >
                      <Settings className="size-3.5" strokeWidth={1.75} />
                    </button>
                    {openMenuProviderId === provider.providerId && (
                      <div className="absolute right-0 top-[calc(100%-0.25rem)] z-20 w-36 border border-border bg-popover py-1 shadow-md">
                        <button
                          type="button"
                          onClick={() => runAction(state === "disabled" ? "enable" : "disable", provider.providerId)}
                          className="flex w-full items-center px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest hover:bg-surface-hover"
                        >
                          {state === "disabled" ? "enable" : "disable"}
                        </button>
                        {state === "broken" && (
                          <button
                            type="button"
                            onClick={() => runAction("repair", provider.providerId)}
                            className="flex w-full items-center px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest hover:bg-surface-hover"
                          >
                            repair
                          </button>
                        )}
                        {provider.providerId === "chrome-devtools" && (
                          <button
                            type="button"
                            onClick={() => runAction("configure", provider.providerId)}
                            className="flex w-full items-center px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest hover:bg-surface-hover"
                          >
                            configure
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => runAction("uninstall", provider.providerId)}
                          className="flex w-full items-center px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--destructive))] hover:bg-surface-hover"
                        >
                          uninstall
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          aria-expanded={availableExpanded}
          onClick={() => setAvailableExpanded((current) => !current)}
          className="flex w-full items-center justify-between border-b border-border px-3 py-3 text-left hover:bg-surface-hover"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Available</span>
            <span className="grid size-5 place-items-center rounded-full bg-surface text-[9px] text-foreground">{available.length}</span>
          </span>
          {availableExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </button>
        {availableExpanded && (filteredAvailable.length === 0 ? (
          <div className="px-3 py-4 font-mono text-[10px] text-muted-foreground">
            {query ? "no available extensions match" : "no available extensions"}
          </div>
        ) : (
          <div className="divide-y divide-border border-b border-border">
            {filteredAvailable.map((provider) => {
              const { providerIcon, Icon } = extensionVisual(provider.providerId, theme);
              const compactIconPresentation = providerIconPresentation(provider.providerId, true);
              const setupAvailable = (provider.kind || "mcp").toLowerCase() === "mcp";
              return (
                <div
                  key={provider.providerId}
                  data-testid={`extension-available-row-${provider.providerId}`}
                  className={`flex w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-hover ${selectedExtensionId === provider.providerId ? "bg-surface" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectExtension?.(provider.providerId)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden text-foreground">
                      {providerIcon ? <img src={providerIcon} alt="" aria-hidden="true" className={`${compactIconPresentation.size} object-contain`} style={{ transform: `translateY(${compactIconPresentation.offsetY}px) scale(${compactIconPresentation.scale})` }} /> : <Icon className="size-4" strokeWidth={1.35} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-sans text-[13px] font-medium text-foreground">{provider.displayName}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{provider.description || "No description available."}</span>
                      <span className="block truncate font-sans text-[11px] font-medium text-muted-foreground">{provider.author || provider.providerId}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!setupAvailable || pendingProviderId === provider.providerId}
                    onClick={() => install(provider)}
                    className="inline-flex h-7 shrink-0 items-center justify-center gap-1 border border-foreground px-2.5 font-mono text-[9px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingProviderId === provider.providerId ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                    {setupAvailable ? "install" : "unavailable"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {chromeDialog ? (
        <ChromeDevToolsConnectionDialog
          action={chromeDialog.action}
          currentMode={providerInstallations.find((provider) => provider.providerId === chromeDialog.providerId)?.chromeDevtoolsMode}
          onConfirm={(mode) => chromeDialog.action === "setup"
            ? install(providerInstallations.find((provider) => provider.providerId === chromeDialog.providerId), mode, true)
            : runAction(chromeDialog.action, chromeDialog.providerId, mode, true)}
          onClose={() => setChromeDialog(null)}
        />
      ) : null}
    </div>
  );
}

export default function ExtensionsPanel({ variant = "full", onSelectExtension, selectedExtensionId }) {
  if (variant === "sidebar") {
    return <SidebarExtensions onSelectExtension={onSelectExtension} selectedExtensionId={selectedExtensionId} />;
  }
  return <FullExtensionsPanel />;
}
