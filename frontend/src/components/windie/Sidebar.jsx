import { useState, useMemo } from "react";
import { useWindie } from "@/context/WindieContext";
import { Plus, Search, MoreHorizontal, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

function ConvRow({ conv, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(conv.name);
  const [menuOpen, setMenuOpen] = useState(false);

  const commit = () => {
    if (name.trim()) onRename(conv.id, name.trim());
    setEditing(false);
  };

  const messageCount = Object.keys(conv.nodes).length;
  const branchCount = Object.values(conv.nodes).filter((n) => n.childrenIds.length > 1).length;

  return (
    <div
      data-testid={`sidebar-conv-${conv.id}`}
      onClick={() => !editing && onSelect(conv.id)}
      className={`group relative border-b border-border px-3 py-2.5 cursor-pointer text-xs transition-colors ${
        active ? "bg-surface" : "hover:bg-surface/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 size-1.5 ${active ? "bg-[hsl(var(--accent))]" : "bg-muted-foreground/40"}`}
        />
        {editing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              data-testid={`sidebar-conv-${conv.id}-rename-input`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="flex-1 bg-transparent border border-border px-1.5 py-0.5 font-mono text-xs focus:border-foreground outline-none"
            />
            <button
              data-testid={`sidebar-conv-${conv.id}-rename-commit`}
              onClick={(e) => {
                e.stopPropagation();
                commit();
              }}
              className="p-1 hover:bg-surface-hover"
            >
              <Check className="size-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
              }}
              className="p-1 hover:bg-surface-hover"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <div className="truncate font-sans text-[13px] leading-tight" title={conv.name}>
                {conv.name}
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{conv.model}</span>
                <span>·</span>
                <span>{messageCount}n</span>
                {branchCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[hsl(var(--accent))]">{branchCount}fork</span>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <button
                data-testid={`sidebar-conv-${conv.id}-menu`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-surface-hover p-1 transition-opacity"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] bg-popover border border-border shadow-md">
                    <button
                      data-testid={`sidebar-conv-${conv.id}-action-rename`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        setEditing(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 hover:bg-surface-hover font-mono"
                    >
                      <Pencil className="size-3" /> rename
                    </button>
                    <button
                      data-testid={`sidebar-conv-${conv.id}-action-delete`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(conv.id);
                        toast.message("conversation deleted", { description: conv.name });
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 hover:bg-surface-hover font-mono text-[hsl(var(--destructive))]"
                    >
                      <Trash2 className="size-3" /> delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const {
    conversations,
    activeConvId,
    setActiveConvId,
    createConversation,
    renameConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
  } = useWindie();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  return (
    <aside
      data-testid="windie-sidebar"
      className="w-64 shrink-0 border-r border-border flex flex-col bg-background"
    >
      <div className="p-2 border-b border-border flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 border border-border px-2 h-7 focus-within:border-foreground transition-colors">
          <Search className="size-3.5 text-muted-foreground shrink-0" strokeWidth={1.75} />
          <input
            data-testid="sidebar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="filter"
            className="flex-1 bg-transparent outline-none font-mono text-xs placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          data-testid="sidebar-new-conv"
          onClick={() => {
            createConversation();
            toast.message("new conversation created");
          }}
          className="h-7 w-7 flex items-center justify-center border border-border hover:bg-surface-hover transition-colors"
          aria-label="new conversation"
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>conversations</span>
        <span data-testid="sidebar-conv-count">
          {filtered.length}/{conversations.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto windie-scroll" data-testid="sidebar-conv-list">
        {filtered.length === 0 ? (
          <div className="p-4 font-mono text-xs text-muted-foreground">no matches</div>
        ) : (
          filtered.map((c) => (
            <ConvRow
              key={c.id}
              conv={c}
              active={c.id === activeConvId}
              onSelect={setActiveConvId}
              onRename={renameConversation}
              onDelete={deleteConversation}
            />
          ))
        )}
      </div>

      <div className="border-t border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
        <span>local</span>
        <span>·</span>
        <span>sqlite tree.db</span>
      </div>
    </aside>
  );
}
