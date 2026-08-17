import { useMemo, useState } from "react";
import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWindie } from "@/context/WindieContext";
import {
  ChromeDevToolsConnectionDialog,
  ProviderCard,
} from "@/components/windie/ExtensionsPanel";

/**
 * Shows one installable plugin and the runtime components it contains.
 *
 * Plugin installation is the outer lifecycle. MCP enablement, repair,
 * credentials, and tool status stay inside the component section because they
 * are runtime concerns, not marketplace identity concerns.
 */
export default function ExtensionDetailPage({ pluginId }) {
  const {
    theme,
    plugins,
    installPlugin,
    uninstallPlugin,
    pendingPluginId,
    providerInstallations,
    toolProviderStatuses,
    setupProvider,
    configureProvider,
    enableProvider,
    disableProvider,
    repairProvider,
    uninstallProvider,
    refreshProviderInstallations,
    refreshAvailableTools,
  } = useWindie();
  const [pendingComponentId, setPendingComponentId] = useState(null);
  const [chromeDialog, setChromeDialog] = useState(null);

  const plugin = plugins.find((candidate) => candidate.id === pluginId);
  const componentIds = useMemo(
    () => new Set((plugin?.installed?.components || []).map((component) => component.id).filter(Boolean)),
    [plugin]
  );
  const providers = useMemo(
    () => providerInstallations.filter((provider) => componentIds.has(provider.providerId)),
    [componentIds, providerInstallations]
  );
  const toolStatusesById = useMemo(
    () => new Map((toolProviderStatuses || []).map((provider) => [provider.providerId, provider])),
    [toolProviderStatuses]
  );

  if (!plugin) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-background font-mono text-[11px] text-muted-foreground">
        plugin unavailable
      </main>
    );
  }

  const installed = Boolean(plugin.installed);
  const pendingPlugin = pendingPluginId === plugin.id;

  const refreshRuntime = async () => {
    await refreshProviderInstallations();
    await refreshAvailableTools();
  };

  const install = async () => {
    await installPlugin(plugin.id);
    await refreshRuntime();
  };

  const uninstall = async () => {
    if (!window.confirm(`Remove ${plugin.name} from Windie?`)) return;
    await uninstallPlugin(plugin.id);
    await refreshRuntime();
  };

  const runComponentAction = async (action, providerId, chromeMode = null, fromDialog = false) => {
    if ((action === "setup" || action === "configure") && providerId === "chrome-devtools" && !fromDialog) {
      setChromeDialog({ action, providerId });
      return;
    }
    if (action === "uninstall" && !window.confirm("Remove this MCP component from Windie?")) return;
    setPendingComponentId(providerId);
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
      const label = action === "setup" ? "installed" : action === "uninstall" ? "removed" : `${action}d`;
      toast.message(`component ${label}`);
      await refreshRuntime();
    } finally {
      setPendingComponentId(null);
    }
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto windie-scroll">
        <div className="mx-auto w-full max-w-5xl px-8 py-8">
          <header className="flex items-start gap-5 border-b border-border pb-6">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden border border-border bg-surface">
              {plugin.iconUrl ? (
                <img src={plugin.iconUrl} alt="" aria-hidden="true" className="size-12 object-contain" />
              ) : (
                <span className="font-mono text-xl text-muted-foreground">{plugin.name.slice(0, 1)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-sans text-2xl font-medium tracking-tight">{plugin.name}</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{plugin.id}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!installed ? (
                  <button
                    type="button"
                    disabled={pendingPlugin}
                    onClick={install}
                    className="inline-flex h-8 items-center gap-1.5 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85 disabled:opacity-50"
                  >
                    {pendingPlugin ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                    {pendingPlugin ? "installing" : "install plugin"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pendingPlugin}
                    onClick={uninstall}
                    className="inline-flex h-8 items-center gap-1.5 border border-[hsl(var(--destructive))]/50 px-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/8 disabled:opacity-50"
                  >
                    {pendingPlugin ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                    remove plugin
                  </button>
                )}
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {installed ? `installed · v${plugin.installed.version}` : `available · v${plugin.version || "?"}`}
                </span>
              </div>
            </div>
          </header>

          <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_220px]">
            <article className="min-w-0">
              <h2 className="font-sans text-2xl font-medium tracking-tight">About this plugin</h2>
              <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">{plugin.description}</p>
              {plugin.readmeUrl ? (
                <a href={plugin.readmeUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-foreground hover:text-accent">
                  read README <ExternalLink className="size-3" />
                </a>
              ) : null}

              <section className="mt-10">
                <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
                  <h2 className="font-sans text-2xl font-medium tracking-tight">Components</h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{plugin.components.join(" · ")}</span>
                </div>
                {!installed ? (
                  <p className="py-5 text-[12px] leading-relaxed text-muted-foreground">Install the plugin to activate and manage its components.</p>
                ) : providers.length === 0 ? (
                  <p className="py-5 text-[12px] leading-relaxed text-muted-foreground">This plugin has no executable MCP components.</p>
                ) : (
                  <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
                    {providers.map((provider) => (
                      <ProviderCard
                        key={provider.providerId}
                        provider={provider}
                        toolStatus={toolStatusesById.get(provider.providerId)}
                        pending={pendingComponentId === provider.providerId}
                        theme={theme}
                        onAction={runComponentAction}
                      />
                    ))}
                  </div>
                )}
              </section>
            </article>

            <aside className="space-y-5 font-mono text-[10px]">
              <div>
                <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Package</h3>
                <dl className="space-y-2 border-t border-border pt-2 text-muted-foreground">
                  <div className="flex justify-between gap-3"><dt>Publisher</dt><dd className="text-right text-foreground">{plugin.publisher}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Version</dt><dd className="text-right text-foreground">{plugin.version || "?"}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Components</dt><dd className="text-right text-foreground">{plugin.components.length}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Status</dt><dd className="text-right text-foreground">{plugin.status}</dd></div>
                </dl>
              </div>
              {plugin.capabilities.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Capabilities</h3>
                  <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                    {plugin.capabilities.map((capability) => <span key={capability} className="border border-accent/30 bg-accent/8 px-1.5 py-0.5 text-foreground">{capability}</span>)}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>
      {chromeDialog ? (
        <ChromeDevToolsConnectionDialog
          action={chromeDialog.action}
          currentMode={providers.find((provider) => provider.providerId === chromeDialog.providerId)?.chromeDevtoolsMode}
          onConfirm={(mode) => runComponentAction(chromeDialog.action, chromeDialog.providerId, mode, true)}
          onClose={() => setChromeDialog(null)}
        />
      ) : null}
    </main>
  );
}
