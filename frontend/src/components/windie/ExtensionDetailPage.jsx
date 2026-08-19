import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useWindie } from "@/context/WindieContext";

/**
 * Shows one installable plugin and its marketplace presentation metadata.
 */
export default function ExtensionDetailPage({ pluginId }) {
  const {
    plugins,
    installPlugin,
    uninstallPlugin,
    pendingPluginId,
  } = useWindie();

  const plugin = plugins.find((candidate) => candidate.id === pluginId);

  if (!plugin) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-background font-mono text-[11px] text-muted-foreground">
        plugin unavailable
      </main>
    );
  }

  const installed = Boolean(plugin.installed);
  const pendingPlugin = pendingPluginId === plugin.id;

  const install = async () => {
    await installPlugin(plugin.id);
  };

  const uninstall = async () => {
    if (!window.confirm(`Remove ${plugin.name} from Windie?`)) return;
    await uninstallPlugin(plugin.id);
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

            </article>

            <aside className="space-y-5 font-mono text-[10px]">
              <div>
                <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Package</h3>
                <dl className="space-y-2 border-t border-border pt-2 text-muted-foreground">
                  <div className="flex justify-between gap-3"><dt>Publisher</dt><dd className="text-right text-foreground">{plugin.publisher}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Version</dt><dd className="text-right text-foreground">{plugin.version || "?"}</dd></div>
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
    </main>
  );
}
