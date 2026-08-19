import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useWindie } from "@/context/WindieContext";

/** Loads and renders one plugin's hosted README as the detail-page preview. */
function ReadmePreview({ readmeUrl }) {
  const [state, setState] = useState({ status: "loading", content: "", error: null });

  useEffect(() => {
    if (!readmeUrl) {
      setState({ status: "empty", content: "", error: null });
      return undefined;
    }

    const controller = new AbortController();
    setState({ status: "loading", content: "", error: null });

    fetch(readmeUrl, {
      headers: { Accept: "text/markdown,text/plain;q=0.9,*/*;q=0.8" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`README request failed: ${response.status}`);
        }
        return response.text();
      })
      .then((content) => setState({ status: "ready", content, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({ status: "error", content: "", error: error.message || "README could not be loaded." });
        }
      });

    return () => controller.abort();
  }, [readmeUrl]);

  if (state.status === "loading") {
    return <div className="flex min-h-40 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><Loader2 className="size-3 animate-spin" /> loading README</div>;
  }
  if (state.status === "error") {
    return <div className="border border-[hsl(var(--destructive))]/30 px-3 py-3 font-mono text-[10px] leading-relaxed text-[hsl(var(--destructive))]">{state.error}</div>;
  }
  if (state.status === "empty" || !state.content.trim()) {
    return <div className="border border-border px-3 py-3 font-mono text-[10px] text-muted-foreground">README unavailable</div>;
  }

  return (
    <div className="windie-markdown font-sans text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {state.content}
      </ReactMarkdown>
    </div>
  );
}

/** Renders one labeled metadata row in the extension detail sidebar. */
function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3 px-2 py-2 odd:bg-surface/40">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-foreground">{value}</dd>
    </div>
  );
}

/** Renders one grouped section in the extension detail sidebar. */
function DetailSection({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 font-sans text-lg font-medium tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ResourceLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 text-foreground hover:text-accent">
      <ExternalLink className="size-4 shrink-0" strokeWidth={1.5} />
      <span>{label}</span>
    </a>
  );
}

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

  const [activeTab, setActiveTab] = useState("details");
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
                    {pendingPlugin ? "installing" : "install"}
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

          <div className="mt-6 flex items-center gap-6 border-b border-border" role="tablist" aria-label="plugin details">
            {["details", "tools"].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-1 pb-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${activeTab === tab ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_220px]">
            <article className="min-w-0">
              {activeTab === "details" ? <ReadmePreview readmeUrl={plugin.readmeUrl} /> : <div className="border border-border px-4 py-4 font-mono text-[10px] leading-relaxed text-muted-foreground">Static tool listings are not available yet.</div>}
            </article>

            <aside className="space-y-8 font-mono text-[10px]">
              <DetailSection title="Installation">
                <dl className="border-t border-border pt-2 text-muted-foreground">
                  <DetailRow label="Identifier" value={plugin.id} />
                  <DetailRow label="Version" value={plugin.version || "?"} />
                </dl>
              </DetailSection>

              <DetailSection title="Marketplace">
                <dl className="border-t border-border pt-2 text-muted-foreground">
                  <DetailRow label="Publisher" value={plugin.publisher} />
                </dl>
              </DetailSection>

              <DetailSection title="Categories">
                {plugin.capabilities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                    {plugin.capabilities.map((capability) => <span key={capability} className="border border-border px-2 py-1 text-foreground">{capability.replace(/[_-]+/g, " ")}</span>)}
                  </div>
                ) : <p className="border-t border-border pt-2 text-muted-foreground">No categories listed.</p>}
              </DetailSection>

              <DetailSection title="Resources">
                <div className="border-t border-border pt-2">
                  {plugin.readmeUrl ? <ResourceLink href={plugin.readmeUrl} label="README" /> : null}
                  {plugin.artifactUrl ? <ResourceLink href={plugin.artifactUrl} label="Package" /> : null}
                  {!plugin.readmeUrl && !plugin.artifactUrl ? <p className="text-muted-foreground">No resources listed.</p> : null}
                </div>
              </DetailSection>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
