//! Conversation picker with search, selection, and conversation actions.

import { useEffect, useMemo, useRef, useState } from "react";
import { useWindie } from "@/context/WindieContext";
import { Plus, ChevronDown, Check, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import FloatingDeleteMenu, { floatingMenuPosition } from "@/components/windie/FloatingDeleteMenu";

function shortId(id) {
  if (!id) return "";
  return id.slice(0, 8);
}

function conversationLabel(conv) {
  if (!conv) return "no conversation";
  return conv.name || `conversation ${shortId(conv.id)}`;
}

export default function ConversationPicker({ variant = "topbar", dropUp = false, onSelectConversation }) {
  const inSidebar = variant === "sidebar";
  const {
    conversations,
    activeConv,
    activeConvId,
    selectConversation,
    createConversation,
    deleteConversation,
  } = useWindie();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuConversation, setMenuConversation] = useState(null);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open || inSidebar) return;
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inSidebar, open]);

  useEffect(() => {
    if (!open || inSidebar) return undefined;
    const handleClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [inSidebar, open]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((conv) => conv.id.toLowerCase().includes(q))
      : conversations;
    return [...filtered].sort((a, b) => {
      if (a.id === activeConvId) return -1;
      if (b.id === activeConvId) return 1;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [activeConvId, conversations, query]);

  const handleCreate = async () => {
    const id = await createConversation();
    if (id) {
      onSelectConversation?.();
      toast.message("new conversation created", { description: shortId(id) });
      setOpen(false);
    }
  };

  const handleSelect = (id) => {
    selectConversation(id);
    onSelectConversation?.();
    if (!inSidebar) setOpen(false);
  };

  const handleDelete = async (event, conversationId) => {
    event.stopPropagation();
    try {
      await deleteConversation(conversationId);
      setMenuConversation(null);
      if (!inSidebar) setOpen(false);
      toast.message("conversation deleted");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const renderSearch = () => (
    <div className="flex h-9 items-center gap-1.5 border-b border-border px-3">
      <input
        ref={inputRef}
        data-testid={inSidebar ? "sidebar-conv-picker-search" : "topbar-conv-picker-search"}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={inSidebar ? "Search conversations" : "filter by id"}
        className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground/60"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          aria-label="clear search"
          className="p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );

  const renderRows = () => (
    <div
      className="min-h-0 flex-1 overflow-y-auto windie-scroll"
      data-testid={inSidebar ? "sidebar-conv-picker-list" : "topbar-conv-picker-list"}
    >
      {sorted.length === 0 ? (
        <div className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
          {query ? "no matches" : "no conversations"}
        </div>
      ) : (
        sorted.map((conv) => {
          const active = conv.id === activeConvId;
          return (
            <div
              key={conv.id}
              className={`relative flex w-full items-center gap-1 px-3 py-2 font-mono text-[11px] hover:bg-surface-hover ${active ? "bg-surface" : ""}`}
            >
              <button
                type="button"
                onClick={() => handleSelect(conv.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate">{conv.name || shortId(conv.id)}</span>
                <span className="max-w-[92px] truncate text-[10px] text-muted-foreground">{conv.model}</span>
                {active && <Check className="size-3 shrink-0 text-foreground" strokeWidth={2} />}
              </button>
              <button
                type="button"
                data-testid={`${inSidebar ? "sidebar" : "topbar"}-conv-menu-${shortId(conv.id)}`}
                aria-label={`conversation actions ${shortId(conv.id)}`}
                title="conversation actions"
                onClick={(event) => {
                  event.stopPropagation();
                  const position = floatingMenuPosition(event.currentTarget.getBoundingClientRect());
                  setMenuConversation((current) =>
                    current?.id === conv.id ? null : { id: conv.id, position }
                  );
                }}
                className="shrink-0 p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  const deleteMenu = (
    <FloatingDeleteMenu
      open={Boolean(menuConversation)}
      position={menuConversation?.position}
      testId={menuConversation ? `conv-delete-${shortId(menuConversation.id)}` : "conv-delete"}
      label="delete conversation"
      onDelete={(event) => handleDelete(event, menuConversation?.id)}
    />
  );

  if (inSidebar) {
    return (
      <div ref={rootRef} className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="font-sans text-base font-medium tracking-tight">Conversations</span>
          <button
            type="button"
            data-testid="sidebar-conv-picker-new"
            onClick={handleCreate}
            aria-label="new conversation"
            title="new conversation"
            className="grid size-7 place-items-center border border-border hover:bg-surface-hover"
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
        {renderSearch()}
        {renderRows()}
        {deleteMenu}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="topbar-conv-picker"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-7 min-w-[160px] items-center gap-1.5 border bg-background px-2 border-border hover:bg-surface-hover transition-colors ${open ? "bg-surface-hover" : ""}`}
        title={activeConv ? activeConv.id : "no conversation selected"}
      >
        <span className="truncate font-mono text-[11px]">{conversationLabel(activeConv)}</span>
        <ChevronDown className="ml-auto size-3" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          data-testid="topbar-conv-picker-menu"
          className={`absolute z-30 flex max-h-80 flex-col border border-border bg-popover shadow-md ${dropUp ? "bottom-full left-0 mb-1" : "left-0 top-full mt-1"} w-72`}
        >
          {renderSearch()}
          {renderRows()}
        </div>
      )}
      {deleteMenu}
    </div>
  );
}
