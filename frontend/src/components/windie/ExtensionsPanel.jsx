import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  checkChromeDevtoolsRemoteDebugging,
  openChromeDevtoolsRemoteDebugging,
  setEnvValues,
} from "@/lib/windieApi";
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
  if (!state) return { label: "not installed", tone: "muted", icon: PackageOpen };
  if (state === "enabled") return { label: "enabled", tone: "good", icon: CheckCircle2 };
  if (state === "disabled") return { label: "disabled", tone: "muted", icon: Power };
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
  if (state === "updating") return { label: "installing", tone: "accent", icon: Loader2 };
  if (toolStatus && !toolStatus.available) return { label: "not responding", tone: "bad", icon: AlertTriangle };
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
  if (providerId === "desktop-commander" || providerId === "basic-memory") return { size: "size-10", scale: 1.35 };
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
  const [values, setValues] = useState(() => Object.fromEntries(secrets.map((secret) => [secret.env_key, ""])));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const filled = secrets.filter((secret) => values[secret.env_key]?.trim());
  const missingRequired = secrets.some((secret) => secret.required && !values[secret.env_key]?.trim());

  const save = async () => {
    if (pending || filled.length === 0 || missingRequired) return;
    setPending(true);
    try {
      await setEnvValues(Object.fromEntries(filled.map((secret) => [secret.env_key, values[secret.env_key].trim()])));
      setSaved(true);
      setValues(Object.fromEntries(secrets.map((secret) => [secret.env_key, ""])));
      toast.message("provider secret saved", { description: providerId });
    } catch (error) {
      toast.error("failed to save provider secret", { description: error?.message || String(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-w-0 space-y-2 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground"><KeyRound className="size-3" strokeWidth={1.75} /> credentials · stored in ~/.windie/.env</div>
      {secrets.map((secret) => (
        <div key={secret.env_key} className="min-w-0 space-y-1">
          <label htmlFor={`secret-${providerId}-${secret.env_key}`} className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{secret.description}{secret.required ? "" : " · optional"}</label>
          <input
            id={`secret-${providerId}-${secret.env_key}`}
            type="password"
            data-testid={`secret-input-${providerId}-${secret.env_key}`}
            value={values[secret.env_key]}
            disabled={disabled || pending}
            onChange={(event) => { setValues((current) => ({ ...current, [secret.env_key]: event.target.value })); setSaved(false); }}
            placeholder={secret.env_key}
            autoComplete="new-password"
            data-1p-ignore
            data-lpignore="true"
            className="h-8 min-w-0 w-full border border-border bg-background px-2 font-mono text-[11px] outline-none focus:border-foreground disabled:opacity-50"
          />
        </div>
      ))}
      <div className="flex items-center justify-end">
        <button type="button" data-testid={`secret-save-${providerId}`} disabled={disabled || pending || filled.length === 0 || missingRequired} onClick={save} className="inline-flex h-7 items-center gap-1.5 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <Loader2 className="size-3 animate-spin" /> : saved ? <CheckCircle2 className="size-3" /> : <Check className="size-3" />}
          {pending ? "saving" : saved ? "saved" : "save"}
        </button>
      </div>
    </div>
  );
}

export function ChromeDevToolsConnectionDialog({ action, currentMode = "managed", onConfirm, onClose }) {
  const [mode, setMode] = useState(currentMode || "managed");
  const [stage, setStage] = useState("choice");
  const [error, setError] = useState(null);

  const startExistingSetup = useCallback(() => {
    onClose();
    void onConfirm("existing").catch(() => {});
  }, [onClose, onConfirm]);

  useEffect(() => {
    if (stage !== "waiting_for_chrome") return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const status = await checkChromeDevtoolsRemoteDebugging();
        if (cancelled) return;
        if (status.available) return startExistingSetup();
      } catch (checkError) {
        if (!cancelled) { setStage("error"); setError(checkError.message); }
        return;
      }
      if (!cancelled) timer = window.setTimeout(poll, 700);
    };
    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [stage, startExistingSetup]);

  const chooseManaged = async () => {
    setStage("connecting");
    setError(null);
    try { await onConfirm("managed"); onClose(); } catch (submitError) { setStage("error"); setError(submitError.message); }
  };
  const chooseExisting = async () => {
    setMode("existing");
    setError(null);
    setStage("checking_chrome");
    try {
      const status = await checkChromeDevtoolsRemoteDebugging();
      if (status.available) startExistingSetup();
      else setStage("choice");
    } catch (checkError) { setStage("error"); setError(checkError.message); }
  };
  const openChromeSettings = async () => {
    setError(null);
    setStage("waiting_for_chrome");
    try { await openChromeDevtoolsRemoteDebugging(); } catch (openError) { setStage("error"); setError(openError.message); }
  };
  const title = action === "configure" ? "Configure Chrome DevTools" : "Install Chrome DevTools";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-border bg-background p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-sans text-lg font-medium tracking-tight">{title}</h2><p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">choose browser ownership</p></div>{stage !== "connecting" ? <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">close</button> : null}</div>
        {stage === "choice" || stage === "error" ? <div className="mt-5 space-y-3">
          <button type="button" onClick={chooseManaged} className={`w-full border px-3 py-3 text-left ${mode === "managed" ? "border-foreground bg-surface" : "border-border hover:bg-surface-hover"}`}><span className="block font-mono text-[11px] uppercase tracking-widest">Use Windie-managed Chrome</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Windie starts a separate persistent profile. Your normal Chrome tabs and cookies stay isolated.</span></button>
          <button type="button" onClick={chooseExisting} className={`w-full border px-3 py-3 text-left ${mode === "existing" ? "border-foreground bg-surface" : "border-border hover:bg-surface-hover"}`}><span className="block font-mono text-[11px] uppercase tracking-widest">Use my existing Chrome</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Windie can inspect and control your currently running Chrome after you explicitly approve the connection.</span></button>
          {mode === "existing" ? <div className="border border-accent/30 bg-accent/8 px-3 py-3 text-[11px] leading-relaxed"><p>Open Chrome's remote-debugging settings, enable the checkbox, then leave Chrome running.</p><button type="button" onClick={openChromeSettings} className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-foreground underline underline-offset-4">open Chrome remote debugging <ExternalLink className="size-3" /></button></div> : null}
          {error ? <p className="border border-[hsl(var(--destructive))]/30 px-3 py-2 text-[11px] text-[hsl(var(--destructive))]">{error}</p> : null}
        </div> : null}
        {stage === "checking_chrome" ? <div className="mt-6 space-y-3 border border-accent/30 bg-accent/8 px-4 py-4"><div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest"><Loader2 className="size-3 animate-spin" /> checking Chrome remote debugging</div><p className="text-[11px] leading-relaxed text-muted-foreground">Checking whether Chrome is already listening on 127.0.0.1:9222.</p></div> : null}
        {stage === "waiting_for_chrome" ? <div className="mt-6 space-y-3 border border-accent/30 bg-accent/8 px-4 py-4"><div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest"><Loader2 className="size-3 animate-spin" /> waiting for Chrome remote debugging</div><p className="text-[11px] leading-relaxed text-muted-foreground">Enable “Allow remote debugging for this browser instance” in Chrome. Windie will continue automatically when 127.0.0.1:9222 is available.</p><button type="button" onClick={onClose} className="h-8 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-surface-hover hover:text-foreground">cancel</button></div> : null}
        {stage === "connecting" ? <div className="mt-6 space-y-3 border border-accent/30 bg-accent/8 px-4 py-4"><div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest"><Loader2 className="size-3 animate-spin" /> waiting for Chrome approval</div><p className="text-[11px] leading-relaxed text-muted-foreground">Enable “Allow remote debugging for this browser instance” in Chrome, then approve the Chrome DevTools MCP request. Windie will verify the MCP tools after approval.</p><button type="button" onClick={onClose} className="h-8 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-surface-hover hover:text-foreground">cancel</button></div> : null}
        {stage === "error" ? <div className="mt-4 flex justify-end"><button type="button" onClick={() => { setStage("choice"); setError(null); }} className="h-8 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background">try again</button></div> : null}
      </div>
    </div>
  );
}

export function ProviderCard({ provider, toolStatus, pending, theme, onAction }) {
  const { providerIcon, Icon, iconPresentation } = extensionVisual(provider.providerId, theme);
  const status = providerStatus(provider, toolStatus);
  const installed = Boolean(provider.installation);
  const state = provider.installation?.state;
  const repositoryUrl = provider.documentationUrl;
  return (
    <article className="group min-w-0 flex flex-col border border-border bg-card/60 transition-colors hover:border-muted-foreground/50 hover:bg-card">
      <div className="flex items-start gap-3 border-b border-border p-4"><div className="grid size-12 shrink-0 place-items-center overflow-hidden border border-border bg-surface text-foreground shadow-sm">{providerIcon ? <img src={providerIcon} alt="" aria-hidden="true" className={`${iconPresentation.size} object-contain`} style={{ transform: `scale(${iconPresentation.scale})` }} /> : <Icon className="size-6" strokeWidth={1.35} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-sans text-base font-medium tracking-tight text-foreground">{provider.displayName}</h3><p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{provider.providerId}</p></div><StatusBadge status={status} /></div></div></div>
      <div className="flex flex-1 flex-col gap-4 p-4"><p className="text-[12px] leading-relaxed text-muted-foreground">{provider.description}</p>{providerOnboardingNote(provider.providerId, provider.chromeDevtoolsMode) ? <div data-testid={`provider-onboarding-${provider.providerId}`} className="border border-accent/30 bg-accent/8 px-3 py-2 text-[11px] leading-relaxed text-foreground">{providerOnboardingNote(provider.providerId, provider.chromeDevtoolsMode)}</div> : null}{provider.installation?.nextAction ? <div className="border border-accent/30 bg-accent/8 px-3 py-2 text-[11px] leading-relaxed text-foreground"><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">next action</span><div className="mt-1">{provider.installation.nextAction}</div></div> : null}{provider.installation?.error ? <details className="border border-border bg-surface/30 px-3 py-2"><summary className="cursor-pointer font-mono text-[9px] uppercase tracking-widest text-muted-foreground">setup detail</summary><p className="mt-2 break-words text-[11px] leading-relaxed text-muted-foreground">{provider.installation.error}</p></details> : null}<div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><span>{provider.kind || "mcp"}</span>{repositoryUrl ? <a href={repositoryUrl} target="_blank" rel="noreferrer" title={repositoryUrl} className="inline-flex min-w-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"><span className="truncate normal-case tracking-normal">documentation</span><ExternalLink className="size-3 shrink-0" strokeWidth={1.75} /></a> : null}</div>{(provider.secrets || []).length > 0 ? <ProviderSecretsForm providerId={provider.providerId} secrets={provider.secrets} disabled={pending} /> : null}</div>
      <div className="flex min-h-12 items-center gap-2 border-t border-border bg-surface/25 px-4 py-2">
        {!installed ? <button type="button" disabled={pending} onClick={() => onAction("setup", provider.providerId)} className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85 disabled:opacity-50">{pending ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}install</button> : state === "updating" || pending ? <div className="flex flex-1 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><Loader2 className="size-3 animate-spin" /> working</div> : state === "broken" ? <button type="button" onClick={() => onAction("repair", provider.providerId)} className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-accent bg-accent px-3 font-mono text-[10px] uppercase tracking-widest text-accent-foreground hover:opacity-85"><Wrench className="size-3" /> repair</button> : state === "enabled" ? <button type="button" onClick={() => onAction("disable", provider.providerId)} className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-surface-hover hover:text-foreground"><Power className="size-3" /> disable</button> : <button type="button" onClick={() => onAction("enable", provider.providerId)} className="inline-flex h-8 flex-1 items-center justify-center gap-2 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85"><Check className="size-3" /> enable</button>}
        {installed && state !== "updating" && !pending ? <>{provider.providerId === "chrome-devtools" ? <button type="button" title="configure Chrome profile" onClick={() => onAction("configure", provider.providerId)} className="grid size-8 place-items-center border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"><Settings className="size-3.5" /></button> : null}<button type="button" title="repair extension" onClick={() => onAction("repair", provider.providerId)} className="grid size-8 place-items-center border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"><Wrench className="size-3.5" /></button><button type="button" title="remove MCP component" onClick={() => onAction("uninstall", provider.providerId)} className="grid size-8 place-items-center border border-border text-muted-foreground hover:border-[hsl(var(--destructive))]/50 hover:bg-[hsl(var(--destructive))]/8 hover:text-[hsl(var(--destructive))]"><Trash2 className="size-3.5" /></button></> : null}
      </div>
    </article>
  );
}

function MarketplacePluginRow({ plugin, pending, onInstall, onUninstall, onOpen }) {
  const installed = Boolean(plugin.installed);
  return (
    <article data-testid={`marketplace-plugin-${plugin.id}`} className="flex min-w-0 items-center gap-4 border-b border-border px-4 py-3 transition-colors hover:bg-surface-hover">
      <button type="button" disabled={!onOpen} onClick={() => onOpen?.(plugin.id)} className="grid size-10 shrink-0 place-items-center overflow-hidden bg-transparent p-0 text-left disabled:cursor-default">{plugin.iconUrl ? <img src={plugin.iconUrl} alt="" aria-hidden="true" className="max-h-10 max-w-10 object-contain" /> : <ShieldCheck className="size-6 text-foreground" strokeWidth={1.35} />}</button>
      <button type="button" disabled={!onOpen} onClick={() => onOpen?.(plugin.id)} className="min-w-0 flex-1 text-left disabled:cursor-default"><h3 className="truncate font-sans text-base font-medium tracking-tight text-foreground">{plugin.name}</h3><p className="mt-0.5 truncate text-[12px] leading-relaxed text-muted-foreground">{plugin.description}</p><p className="truncate text-[12px] font-medium text-muted-foreground">{plugin.publisher}</p></button>
      {installed ? <button type="button" data-testid={`marketplace-uninstall-${plugin.id}`} disabled={pending} onClick={() => onUninstall(plugin.id)} className="inline-flex h-7 shrink-0 items-center justify-center gap-1 border border-[hsl(var(--destructive))]/50 px-2.5 font-mono text-[9px] uppercase tracking-widest text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/8 disabled:opacity-50">{pending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />} remove</button> : <button type="button" data-testid={`marketplace-install-${plugin.id}`} disabled={pending} onClick={() => onInstall(plugin.id)} className="inline-flex h-7 shrink-0 items-center justify-center gap-1 border border-foreground px-2.5 font-mono text-[9px] uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background disabled:opacity-50">{pending ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}{pending ? "installing" : "install"}</button>}
    </article>
  );
}

function MarketplacePanel({ plugins, loading, pendingPluginId, query = "", onlyInstalled = false, onInstall, onUninstall, onOpen }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = plugins.filter((plugin) => {
    if (onlyInstalled && !plugin.installed) return false;
    return !normalizedQuery || [plugin.name, plugin.id, plugin.description, plugin.publisher, ...plugin.capabilities].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedQuery));
  });
  if (loading && plugins.length === 0) return <div className="flex min-h-48 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><Loader2 className="size-3 animate-spin" /> loading marketplace</div>;
  if (filtered.length === 0) return <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center"><PackageOpen className="size-7 text-muted-foreground" strokeWidth={1.25} /><div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{normalizedQuery ? "no plugins match" : onlyInstalled ? "no installed plugins" : "marketplace is empty"}</div></div>;
  return <div className="min-w-0 border-t border-border">{filtered.map((plugin) => <MarketplacePluginRow key={plugin.id} plugin={plugin} pending={pendingPluginId === plugin.id} onInstall={onInstall} onUninstall={onUninstall} onOpen={onOpen} />)}</div>;
}

function PluginRow({ plugin, selected, onSelect }) {
  return <button type="button" data-testid={`plugin-row-${plugin.id}`} onClick={() => onSelect?.(plugin.id)} className={`flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-surface-hover ${selected ? "bg-surface" : ""}`}><span className="grid size-10 shrink-0 place-items-center overflow-hidden border border-border bg-surface text-foreground">{plugin.iconUrl ? <img src={plugin.iconUrl} alt="" aria-hidden="true" className="size-7 object-contain" /> : <ShieldCheck className="size-4" strokeWidth={1.35} />}</span><span className="min-w-0 flex-1"><span className="block truncate font-sans text-[13px] font-medium text-foreground">{plugin.name}</span><span className="block truncate text-[11px] text-muted-foreground">{plugin.description || "No description available."}</span><span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{plugin.components.join(" · ")} · v{plugin.installed.version}</span></span></button>;
}

function pluginActionHandlers({ installPlugin, uninstallPlugin, refreshProviderInstallations, refreshAvailableTools }) {
  const refreshRuntime = async () => { await refreshProviderInstallations(); await refreshAvailableTools(); };
  return {
    install: async (pluginId) => { await installPlugin(pluginId); await refreshRuntime(); },
    uninstall: async (pluginId) => { if (!window.confirm("Remove this plugin from Windie?")) return; await uninstallPlugin(pluginId); await refreshRuntime(); },
  };
}

function FullExtensionsPanel() {
  const { plugins, pluginsLoading, pendingPluginId, installPlugin, uninstallPlugin, refreshProviderInstallations, refreshAvailableTools } = useWindie();
  const [catalog, setCatalog] = useState("marketplace");
  const actions = pluginActionHandlers({ installPlugin, uninstallPlugin, refreshProviderInstallations, refreshAvailableTools });
  const catalogs = [{ id: "marketplace", label: "Marketplace", count: plugins.length }, { id: "installed", label: "Installed Plugins", count: plugins.filter((plugin) => plugin.installed).length }];
  return <div className="flex flex-col"><div className="p-5"><div className="mb-5 flex items-center gap-1 border-b border-border pb-3" role="tablist" aria-label="plugin catalogs">{catalogs.map((entry) => <button key={entry.id} type="button" role="tab" aria-selected={catalog === entry.id} data-testid={`extensions-catalog-${entry.id}`} onClick={() => setCatalog(entry.id)} className={`h-8 px-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${catalog === entry.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}>{entry.label}<span className="ml-1.5 opacity-60">{entry.count}</span></button>)}</div><MarketplacePanel plugins={plugins} loading={pluginsLoading} pendingPluginId={pendingPluginId} onlyInstalled={catalog === "installed"} onInstall={actions.install} onUninstall={actions.uninstall} /></div></div>;
}

function SidebarExtensions({ onSelectExtension, selectedExtensionId }) {
  const { plugins, pluginsLoading, pendingPluginId, installPlugin, uninstallPlugin, refreshPlugins, refreshProviderInstallations, refreshAvailableTools } = useWindie();
  const [query, setQuery] = useState("");
  const [catalogView, setCatalogView] = useState("marketplace");
  const [installedExpanded, setInstalledExpanded] = useState(true);
  const actions = pluginActionHandlers({ installPlugin, uninstallPlugin, refreshProviderInstallations, refreshAvailableTools });
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (plugin) => !normalizedQuery || [plugin.name, plugin.id, plugin.description, plugin.publisher, ...plugin.capabilities].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedQuery));
  const installed = plugins.filter((plugin) => plugin.installed && matches(plugin));
  return <div className="relative flex h-full min-h-0 flex-col bg-background"><div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3"><span className="font-sans text-base font-medium tracking-tight">Extensions</span><button type="button" data-testid="extensions-refresh" aria-label="refresh extensions" title="refresh extensions" onClick={() => { refreshPlugins(); refreshProviderInstallations(); refreshAvailableTools(); }} className="grid size-7 place-items-center text-muted-foreground hover:bg-surface-hover hover:text-foreground"><RefreshCw className="size-3.5" strokeWidth={1.75} /></button></div><div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-3">{[["marketplace", "Marketplace", plugins.length], ["installed", "Installed Plugins", plugins.filter((plugin) => plugin.installed).length]].map(([id, label, count]) => <button key={id} type="button" data-testid={`extensions-view-${id}`} aria-pressed={catalogView === id} onClick={() => setCatalogView(id)} className={`h-7 px-2 font-mono text-[9px] uppercase tracking-widest ${catalogView === id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}>{label} <span className="opacity-60">{count}</span></button>)}</div><div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border px-3"><input data-testid="extensions-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plugins" className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground/60" /></div><div className="min-h-0 flex-1 overflow-y-auto windie-scroll">{catalogView === "marketplace" ? <div className="p-3"><MarketplacePanel plugins={plugins} loading={pluginsLoading} pendingPluginId={pendingPluginId} query={query} onInstall={actions.install} onUninstall={actions.uninstall} onOpen={onSelectExtension} /></div> : <><button type="button" aria-expanded={installedExpanded} onClick={() => setInstalledExpanded((current) => !current)} className="flex w-full items-center justify-between border-b border-border px-3 py-3 text-left hover:bg-surface-hover"><span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><span>Installed plugins</span><span className="grid size-5 place-items-center rounded-full bg-surface text-[9px] text-foreground">{installed.length}</span></span>{installedExpanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}</button>{installedExpanded && pluginsLoading && plugins.length === 0 ? <div className="flex items-center justify-center gap-2 px-3 py-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><Loader2 className="size-3 animate-spin" /> loading plugins</div> : installedExpanded && installed.length === 0 ? <div className="px-3 py-4 font-mono text-[10px] text-muted-foreground">{query ? "no installed plugins match" : "no installed plugins"}</div> : installedExpanded ? <div className="divide-y divide-border border-y border-border">{installed.map((plugin) => <PluginRow key={plugin.id} plugin={plugin} selected={selectedExtensionId === plugin.id} onSelect={onSelectExtension} />)}</div> : null}</>}</div></div>;
}

export default function ExtensionsPanel({ variant = "full", onSelectExtension, selectedExtensionId }) {
  if (variant === "sidebar") return <SidebarExtensions onSelectExtension={onSelectExtension} selectedExtensionId={selectedExtensionId} />;
  return <FullExtensionsPanel />;
}
