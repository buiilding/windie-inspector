import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Loader2, Power, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useWindie } from "@/context/WindieContext";
import {
  extensionVisual,
  providerOnboardingNote,
  ProviderSecretsForm,
} from "@/components/windie/ExtensionsPanel";

export default function ExtensionDetailPage({ providerId }) {
  const {
    theme,
    providerInstallations,
    setupProvider,
    enableProvider,
    disableProvider,
    repairProvider,
    uninstallProvider,
  } = useWindie();
  const [tab, setTab] = useState("overview");
  const [pending, setPending] = useState(false);
  const provider = providerInstallations.find((item) => item.providerId === providerId);
  const toolSchemas = useMemo(
    () => provider?.toolCatalog?.tools || [],
    [provider]
  );

  useEffect(() => {
    setTab("overview");
  }, [providerId]);

  if (!provider) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-background font-mono text-[11px] text-muted-foreground">
        extension unavailable
      </main>
    );
  }

  const { providerIcon, Icon, iconPresentation } = extensionVisual(provider.providerId, theme);
  const installed = Boolean(provider.installation);
  const state = provider.installation?.state;
  const repositoryUrl = provider.documentationUrl;

  const runAction = async (action) => {
    if (action === "uninstall" && !window.confirm("Remove this extension from Windie?")) return;
    setPending(true);
    try {
      const actions = {
        setup: setupProvider,
        enable: enableProvider,
        disable: disableProvider,
        repair: repairProvider,
        uninstall: uninstallProvider,
      };
      await actions[action](provider.providerId);
      const labels = { setup: "installed", enable: "enabled", disable: "disabled", repair: "repaired", uninstall: "removed" };
      toast.message(`extension ${labels[action]}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto windie-scroll">
        <div className="mx-auto w-full max-w-5xl px-8 py-8">
          <header className="flex items-start gap-5 border-b border-border pb-6">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden border border-border bg-surface">
              {providerIcon ? (
                <img
                  src={providerIcon}
                  alt=""
                  aria-hidden="true"
                  className={`${iconPresentation.size} object-contain`}
                  style={{ transform: `scale(${iconPresentation.scale})` }}
                />
              ) : (
                <Icon className="size-9" strokeWidth={1.35} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-sans text-2xl font-medium tracking-tight">{provider.displayName}</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{provider.providerId}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {state === "enabled" && (
                  <button type="button" disabled={pending} onClick={() => runAction("disable")} className="inline-flex h-8 items-center gap-1.5 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-surface-hover disabled:opacity-50">
                    <Power className="size-3" />
                    disable
                  </button>
                )}
                {state === "disabled" && (
                  <button type="button" disabled={pending} onClick={() => runAction("enable")} className="inline-flex h-8 items-center gap-1.5 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85 disabled:opacity-50">
                    <Power className="size-3" />
                    enable
                  </button>
                )}
                {state === "broken" && (
                  <button type="button" disabled={pending} onClick={() => runAction("repair")} className="inline-flex h-8 items-center gap-1.5 border border-accent bg-accent px-3 font-mono text-[10px] uppercase tracking-widest text-accent-foreground hover:opacity-85 disabled:opacity-50">
                    <Wrench className="size-3" />
                    repair
                  </button>
                )}
                {!installed && (
                  <button type="button" disabled={pending} onClick={() => runAction("setup")} className="inline-flex h-8 items-center gap-1.5 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85 disabled:opacity-50">
                    {pending ? <Loader2 className="size-3 animate-spin" /> : null}
                    install
                  </button>
                )}
                {installed && state !== "updating" && (
                  <button type="button" disabled={pending} onClick={() => runAction("uninstall")} className="inline-flex h-8 items-center gap-1.5 border border-border px-3 font-mono text-[10px] uppercase tracking-widest text-[hsl(var(--destructive))] hover:bg-surface-hover disabled:opacity-50">
                    <Trash2 className="size-3" />
                    remove
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="flex items-center gap-5 border-b border-border" role="tablist" aria-label="extension detail views">
            {[
              ["overview", "Overview"],
              ["tools", "Tools"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                data-testid={`extension-detail-tab-${id}`}
                onClick={() => setTab(id)}
                className={`border-b-2 px-1 py-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${tab === id ? "border-[hsl(var(--accent))] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_220px]">
              <article className="min-w-0">
                <h2 className="font-sans text-2xl font-medium tracking-tight">{provider.displayName} README</h2>
                {provider.readmeMarkdown ? (
                  <div className="provider-readme mt-5 text-[13px] leading-relaxed text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{provider.readmeMarkdown}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">{provider.description || "No extension README is available."}</p>
                )}
                {providerOnboardingNote(provider.providerId) ? <p data-testid={`provider-onboarding-detail-${provider.providerId}`} className="mt-5 border border-accent/30 bg-accent/8 px-3 py-3 text-[12px] leading-relaxed">{providerOnboardingNote(provider.providerId)}</p> : null}
                {provider.installation?.nextAction && <p className="mt-8 border border-accent/30 bg-accent/8 px-3 py-3 text-[12px] leading-relaxed">{provider.installation.nextAction}</p>}
                {provider.installation?.error && <p className="mt-3 border border-[hsl(var(--destructive))]/30 px-3 py-3 text-[12px] leading-relaxed text-[hsl(var(--destructive))]">{provider.installation.error}</p>}
                {(provider.secrets || []).length > 0 && <div className="mt-8 max-w-md"><ProviderSecretsForm providerId={provider.providerId} secrets={provider.secrets} disabled={pending} /></div>}
              </article>
              <aside className="space-y-5 font-mono text-[10px]">
                <div>
                  <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Installation</h3>
                  <dl className="space-y-2 border-t border-border pt-2 text-muted-foreground">
                    <div className="flex justify-between gap-3"><dt>Identifier</dt><dd className="text-right text-foreground">{provider.providerId}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Kind</dt><dd className="text-right text-foreground">{provider.kind || "MCP"}</dd></div>
                    <div className="flex justify-between gap-3"><dt>State</dt><dd className="text-right text-foreground">{state || "not installed"}</dd></div>
                  </dl>
                </div>
                {repositoryUrl && <div>
                  <h3 className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Resources</h3>
                  <a href={repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-foreground hover:text-[hsl(var(--accent))]">Documentation <ExternalLink className="size-3" /></a>
                </div>}
              </aside>
            </div>
          ) : (
            <div className="py-8">
              <h2 className="font-sans text-2xl font-medium tracking-tight">Tools</h2>
              <p className="mt-2 text-[13px] text-muted-foreground">Capabilities exposed by {provider.displayName}.</p>
              <div className="mt-6 divide-y divide-border border-y border-border">
                {toolSchemas.length === 0 ? <div className="py-5 font-mono text-[11px] text-muted-foreground">no discovered tools available</div> : toolSchemas.map((schema) => <div key={schema.name} className="py-4"><div className="font-mono text-[12px] text-foreground">{schema.providerToolName || schema.name}</div><div className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{schema.description || "No description available."}</div></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
