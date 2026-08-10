import { useEffect, useMemo, useRef, useState } from "react";
import { useWindie } from "@/context/WindieContext";
import MessageRow, { PendingAssistantRow } from "@/components/windie/MessageRow";
import Composer from "@/components/windie/Composer";
import ToolApprovalPrompt from "@/components/windie/ToolApprovalPrompt";
import { executionToolCount, isExecutionNode } from "@/lib/treeProjection";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";

function transcriptItems(nodes) {
  const items = [];
  let executionNodes = [];

  const flushExecution = () => {
    if (!executionNodes.length) return;
    items.push({
      type: "execution",
      id: `transcript-execution:${executionNodes[0].node.id}`,
      nodes: executionNodes,
    });
    executionNodes = [];
  };

  nodes.forEach((node, index) => {
    if (isExecutionNode(node)) {
      executionNodes.push({ node, index });
      return;
    }
    flushExecution();
    items.push({ type: "message", node, index });
  });
  flushExecution();
  return items;
}

function TranscriptExecutionGroup({ group, expanded, onToggle, toolCount }) {
  const count = toolCount ?? executionToolCount(group.nodes.map(({ node }) => node));
  return (
    <>
      <button
        type="button"
        data-testid={`transcript-execution-group-${group.id}`}
        aria-expanded={expanded}
        onClick={onToggle}
        className="relative flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        title={expanded ? "collapse tool execution" : "expand tool execution"}
      >
        {expanded ? (
          <ChevronDown className="size-4" strokeWidth={1.75} />
        ) : (
          <MoreHorizontal className="size-4" strokeWidth={1.75} />
        )}
        <span>{expanded ? "collapse" : `${count} ${count === 1 ? "tool" : "tools"}`}</span>
      </button>
      <div className={`windie-reasoning-content ${expanded ? "open" : ""}`}>
        <div className="windie-reasoning-inner">
          {group.nodes.map(({ node, index }) => (
            <MessageRow key={node.id} node={node} index={index} isLast={false} />
          ))}
        </div>
      </div>
      {expanded ? (
        <button
          type="button"
          data-testid={`transcript-execution-collapse-bottom-${group.id}`}
          aria-expanded="true"
          onClick={onToggle}
          className="relative flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          title="collapse tool execution"
        >
          <ChevronUp className="size-4" strokeWidth={1.75} />
          <span>collapse</span>
        </button>
      ) : null}
    </>
  );
}

function LiveExecutionIndicator({ count }) {
  return (
    <div className="relative flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <MoreHorizontal className="size-4" strokeWidth={1.75} />
      <span>{count} {count === 1 ? "tool" : "tools"}</span>
    </div>
  );
}

export default function ChatPanel({ onFirstMessage, onNavigate, onContinue }) {
  const { activeConv, selectedSession, selectedPathNodes, streaming, pendingAssistant, stopStreaming, apiError, setupComplete } = useWindie();
  const scrollRef = useRef(null);
  const lastScrolledConversationId = useRef(null);
  const [expandedExecutionGroups, setExpandedExecutionGroups] = useState(() => new Set());
  const [creatingConversation, setCreatingConversation] = useState(false);
  const items = useMemo(() => transcriptItems(selectedPathNodes), [selectedPathNodes]);
  // Streaming previews belong to a session's active path, not to whichever
  // historical path is currently being inspected. Keep the session's
  // transient state alive in the hook, but hide it from alternate paths.
  const sessionHead = selectedSession?.currentHeadMessageId || null;
  const displayedHead = selectedPathNodes[selectedPathNodes.length - 1]?.id || null;
  const isViewingSessionHead = Boolean(
    activeConv?.id &&
      selectedSession?.conversationId === activeConv.id &&
      sessionHead &&
      displayedHead === sessionHead
  );
  const visiblePendingAssistant = isViewingSessionHead && streaming ? pendingAssistant : null;
  const pendingToolCount = visiblePendingAssistant?.toolCount || 0;
  const lastItem = items[items.length - 1];
  const currentExecutionGroup = lastItem?.type === "execution" ? lastItem : null;
  const persistedToolCount = currentExecutionGroup
    ? executionToolCount(currentExecutionGroup.nodes.map(({ node }) => node))
    : 0;
  const liveToolCount = pendingToolCount > persistedToolCount ? pendingToolCount : 0;
  const continueWithNewChat = async () => {
    if (creatingConversation || !onContinue) return;
    setCreatingConversation(true);
    try {
      await onContinue();
    } finally {
      setCreatingConversation(false);
    }
  };

  // Start each selected conversation at its latest transcript content. Once the
  // conversation is selected, preserve the user's scroll position across new
  // messages and streaming updates.
  useEffect(() => {
    const el = scrollRef.current;
    if (
      !el ||
      !activeConv?.inspectionLoaded ||
      lastScrolledConversationId.current === activeConv.id
    ) {
      return;
    }
    el.scrollTop = el.scrollHeight;
    lastScrolledConversationId.current = activeConv.id;
  }, [activeConv?.id, activeConv?.inspectionLoaded]);

  if (!activeConv) {
    return (
      <div
        data-testid="windie-welcome-canvas"
        className="relative flex-1 min-w-0 flex items-center overflow-hidden bg-background min-h-0"
      >
        <div className="pointer-events-none absolute inset-0 windie-welcome-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-8 py-16 lg:px-16">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-5xl font-medium tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Welcome <span className="text-foreground">to</span>
              <span className="block text-accent">Windie</span>
            </h1>

            <div className="mt-8 max-w-lg border-l border-foreground pl-5">
              <p className="text-xl leading-relaxed text-foreground sm:text-2xl">
                This is Peter&apos;s creation of an AI on the computer
              </p>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Please be kind with it <span className="text-base normal-case tracking-normal">😊</span>
              </p>
            </div>

            {setupComplete ? (
              <button
                type="button"
                data-testid="welcome-continue-button"
                disabled={creatingConversation}
                onClick={continueWithNewChat}
                className="mt-10 border border-accent bg-accent px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-accent-foreground transition-colors hover:bg-accent/90 hover:text-accent-foreground disabled:cursor-wait disabled:opacity-70"
              >
                {creatingConversation ? "starting a new chat" : "You're all set, continue with a new chat"}
              </button>
            ) : (
              <div className="mt-10 flex max-w-lg flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  data-testid="welcome-extensions-button"
                  onClick={() => onNavigate?.("extensions")}
                  className="border border-accent bg-accent px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-accent-foreground transition-colors hover:bg-accent/90 hover:text-accent-foreground"
                >
                  What can Windie do for you?
                </button>
                <button
                  type="button"
                  data-testid="welcome-llm-button"
                  onClick={() => onNavigate?.("llms")}
                  className="border border-foreground/70 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent hover:bg-accent/10"
                >
                  Configure LLM providers
                </button>
              </div>
            )}

            {apiError ? (
              <div className="mt-10 max-w-lg border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-[10px] text-destructive">
                {apiError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background min-h-0" data-testid="chat-panel">
      <div
        ref={scrollRef}
        data-testid="chat-scroll"
        className="flex-1 min-h-0 overflow-y-auto windie-scroll"
      >
        {items.map((item) => {
          if (item.type === "execution") {
            const expanded = expandedExecutionGroups.has(item.id);
            const toolCount = item === currentExecutionGroup && liveToolCount
              ? liveToolCount
              : undefined;
            return (
              <TranscriptExecutionGroup
                key={item.id}
                group={item}
                expanded={expanded}
                toolCount={toolCount}
                onToggle={() => setExpandedExecutionGroups((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })}
              />
            );
          }
          return (
            <MessageRow
              key={item.node.id}
              node={item.node}
              index={item.index}
              isLast={item.index === selectedPathNodes.length - 1}
            />
          );
        })}
        {!currentExecutionGroup && liveToolCount > 0 ? (
          <LiveExecutionIndicator count={liveToolCount} />
        ) : null}
        {visiblePendingAssistant && selectedSession ? (
          <PendingAssistantRow
            pendingAssistant={visiblePendingAssistant}
            index={selectedPathNodes.length}
            sessionId={selectedSession.id}
            onStop={() => stopStreaming(selectedSession.id)}
          />
        ) : null}
      </div>

      <ToolApprovalPrompt />
      <Composer onFirstMessage={onFirstMessage} />
    </div>
  );
}
