import {
  Brain,
  GitBranch,
  MessageSquare,
  Puzzle,
  Settings,
} from "lucide-react";

const primaryViews = [
  { id: "conversations", label: "Conversations", Icon: MessageSquare },
  { id: "tree", label: "Conversation Graph", Icon: GitBranch },
  { id: "llms", label: "LLM Providers", Icon: Brain },
  { id: "extensions", label: "Extensions", Icon: Puzzle },
];

export default function ActivityBar({ activeView, onViewChange }) {
  const renderButton = ({ id, label, Icon }) => {
    const active = activeView === id;
    return (
      <button
        key={id}
        type="button"
        data-testid={`activity-bar-${id}`}
        aria-label={label}
        aria-pressed={active}
        title={label}
        onClick={() => onViewChange(id)}
        className={`relative flex size-11 items-center justify-center border-l-2 transition-colors ${
          active
            ? "border-[hsl(var(--accent))] bg-surface text-foreground"
            : "border-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <Icon className="size-4" strokeWidth={1.6} />
      </button>
    );
  };

  return (
    <nav
      aria-label="Windie activity bar"
      data-testid="windie-activity-bar"
      className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-background"
    >
      <div className="flex flex-col items-center gap-1 py-2">
        {primaryViews.map(renderButton)}
      </div>
      <div className="mt-auto border-t border-border py-2">
        {renderButton({ id: "settings", label: "Settings", Icon: Settings })}
      </div>
    </nav>
  );
}
