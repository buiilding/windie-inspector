import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWindie } from "@/context/WindieContext";

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface/60"
      >
        <span className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {title}
          </span>
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

export default function SettingsPanel() {
  const {
    activeConv,
    setSystemPrompt,
    setToolApprovalMode,
    toolSchemas,
    availableToolSchemas,
    availableToolsLoading,
    addToolSchema,
    addToolSchemas,
    removeToolSchema,
    removeToolSchemas,
    toolProviderStatuses,
  } = useWindie();
  const [systemPrompt, setSystemPromptDraft] = useState(activeConv?.systemPrompt || "");
  const [pendingActions, setPendingActions] = useState([]);
  const [collapsedProviders, setCollapsedProviders] = useState(new Set());
  const pendingRef = useRef(new Set());

  useEffect(() => {
    setSystemPromptDraft(activeConv?.systemPrompt || "");
  }, [activeConv?.id, activeConv?.systemPrompt]);

  const attachedNames = useMemo(
    () => new Set(toolSchemas.map((schema) => schema.name)),
    [toolSchemas]
  );
  const pendingSet = useMemo(() => new Set(pendingActions), [pendingActions]);
  const groupedTools = useMemo(() => {
    const groups = new Map();
    for (const schema of availableToolSchemas) {
      const providerId = schema.providerId || "unknown";
      if (!groups.has(providerId)) groups.set(providerId, []);
      groups.get(providerId).push(schema);
    }
    return [...groups.entries()].map(([providerId, tools]) => ({ providerId, tools }));
  }, [availableToolSchemas]);
  const unavailableProviders = useMemo(
    () => (toolProviderStatuses || []).filter((provider) => !provider.available),
    [toolProviderStatuses]
  );

  const setPending = (key, pending) => {
    const next = new Set(pendingRef.current);
    if (pending) next.add(key);
    else next.delete(key);
    pendingRef.current = next;
    setPendingActions([...next]);
  };

  const runAction = async (key, action, message, description) => {
    if (pendingRef.current.has(key)) return;
    setPending(key, true);
    try {
      await action();
      toast.message(message, description ? { description } : undefined);
    } finally {
      setPending(key, false);
    }
  };

  const saveSystemPrompt = async () => {
    if (!activeConv) return;
    await setSystemPrompt(activeConv.id, systemPrompt);
    toast.message("system prompt updated");
  };

  const toggleProvider = (providerId) => {
    setCollapsedProviders((current) => {
      const next = new Set(current);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  };

  if (!activeConv) {
    return (
      <div className="flex h-full items-center justify-center px-5 text-center font-mono text-[11px] text-muted-foreground">
        select a conversation to edit settings
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto windie-scroll">
      <div className="border-b border-border px-4 py-4">
        <h2 className="font-sans text-base font-medium tracking-tight">Settings</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          conversation runtime
        </p>
      </div>

      <Section title="system prompt">
        <textarea
          data-testid="settings-system-prompt"
          value={systemPrompt}
          onChange={(event) => setSystemPromptDraft(event.target.value)}
          placeholder="Write the system prompt..."
          className="min-h-36 w-full resize-y border border-border bg-transparent p-3 font-mono text-[11px] leading-relaxed outline-none focus:border-foreground"
        />
        <button
          type="button"
          data-testid="settings-system-prompt-save"
          onClick={saveSystemPrompt}
          className="mt-2 h-8 border border-foreground bg-foreground px-3 font-mono text-[10px] uppercase tracking-widest text-background hover:opacity-85"
        >
          save
        </button>
      </Section>

      <Section title="tool access">
        <div className="border border-border">
          <div className="grid grid-cols-2">
            <button
              type="button"
              data-testid="settings-tool-access-manual"
              onClick={() => {
                setToolApprovalMode(activeConv.id, "manual");
                toast.message("tool access set", { description: "manual" });
              }}
              className={`h-8 px-2 font-mono text-[10px] uppercase tracking-widest ${
                activeConv.toolApprovalMode === "manual"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              manual
            </button>
            <button
              type="button"
              data-testid="settings-tool-access-full"
              onClick={() => {
                setToolApprovalMode(activeConv.id, "auto_approve_attached");
                toast.message("tool access set", { description: "full access" });
              }}
              className={`h-8 border-l border-border px-2 font-mono text-[10px] uppercase tracking-widest ${
                activeConv.toolApprovalMode === "auto_approve_attached"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              full access
            </button>
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Manual asks for approval before a tool runs. Full access automatically approves attached tools.
        </p>
      </Section>

      <Section title={`available tool schemas · ${availableToolsLoading ? "loading" : availableToolSchemas.length}`} defaultOpen={false}>
        <div className="space-y-2">
          {groupedTools.map(({ providerId, tools }) => {
            const collapsed = collapsedProviders.has(providerId);
            const unattached = tools.filter((schema) => !attachedNames.has(schema.name));
            const attached = tools.filter((schema) => attachedNames.has(schema.name));
            const groupPending = pendingSet.has(`add-provider:${providerId}`) || pendingSet.has(`remove-provider:${providerId}`);
            return (
              <div key={providerId} className="border border-border">
                <div className="flex items-center justify-between gap-2 bg-surface/40 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => toggleProvider(providerId)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] uppercase">{providerId}</span>
                      <span className="block font-mono text-[9px] text-muted-foreground">{tools.length} tools</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {unattached.length > 0 && (
                      <button
                        type="button"
                        disabled={groupPending}
                        onClick={() =>
                          runAction(
                            `add-provider:${providerId}`,
                            () => addToolSchemas(activeConv.id, unattached),
                            "tools attached",
                            providerId
                          )
                        }
                        className="grid size-7 place-items-center border border-border disabled:opacity-50"
                        aria-label={`attach all ${providerId} tools`}
                      >
                        {pendingSet.has(`add-provider:${providerId}`) ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      </button>
                    )}
                    {attached.length > 0 && (
                      <button
                        type="button"
                        disabled={groupPending}
                        onClick={() =>
                          runAction(
                            `remove-provider:${providerId}`,
                            () => removeToolSchemas(activeConv.id, attached.map((schema) => schema.name)),
                            "tools detached",
                            providerId
                          )
                        }
                        className="grid size-7 place-items-center border border-border text-[hsl(var(--destructive))] disabled:opacity-50"
                        aria-label={`detach all ${providerId} tools`}
                      >
                        {pendingSet.has(`remove-provider:${providerId}`) ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                      </button>
                    )}
                  </div>
                </div>
                {!collapsed && (
                  <div className="divide-y divide-border">
                    {tools.map((schema) => {
                      const attached = attachedNames.has(schema.name);
                      const actionKey = `${attached ? "remove" : "add"}:${schema.name}`;
                      return (
                        <div key={schema.name} className="flex min-w-0 items-center justify-between gap-2 px-2 py-2 pl-5">
                          <div className="min-w-0">
                            <div className="break-words font-mono text-[10px]">{schema.providerToolName || schema.name}</div>
                            <div className="break-words text-[9px] text-muted-foreground">{schema.description}</div>
                          </div>
                          <button
                            type="button"
                            disabled={pendingSet.has(actionKey) || groupPending}
                            onClick={() =>
                              runAction(
                                actionKey,
                                () => (attached ? removeToolSchema(activeConv.id, schema.name) : addToolSchema(activeConv.id, schema)),
                                attached ? "tool detached" : "tool attached",
                                schema.name
                              )
                            }
                            className={`grid size-7 shrink-0 place-items-center border border-border disabled:opacity-50 ${attached ? "text-[hsl(var(--destructive))]" : ""}`}
                            aria-label={`${attached ? "detach" : "attach"} ${schema.name}`}
                          >
                            {pendingSet.has(actionKey) ? <Loader2 className="size-3 animate-spin" /> : attached ? <Trash2 className="size-3" /> : <Plus className="size-3" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {unavailableProviders.map((provider) => (
            <div key={provider.providerId} className="border border-border bg-surface/20 px-2 py-2">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">{provider.displayName || provider.providerId}</div>
              <div className="font-mono text-[9px] uppercase text-[hsl(var(--destructive))]">unavailable</div>
              {provider.error && <div className="break-words text-[9px] text-muted-foreground">{provider.error}</div>}
            </div>
          ))}
          {groupedTools.length === 0 && unavailableProviders.length === 0 && (
            <div className="border border-border px-3 py-3 font-mono text-[10px] text-muted-foreground">no available tool schemas</div>
          )}
        </div>
      </Section>
    </div>
  );
}
