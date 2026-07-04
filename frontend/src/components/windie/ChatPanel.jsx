import { useEffect, useRef } from "react";
import { useWindie } from "@/context/WindieContext";
import MessageRow from "@/components/windie/MessageRow";
import Composer from "@/components/windie/Composer";

export default function ChatPanel() {
  const { activeConv, activePathNodes, streaming } = useWindie();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activePathNodes.length, streaming]);

  if (!activeConv) return null;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-background" data-testid="chat-panel">
      <div className="h-8 shrink-0 border-b border-border px-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>active path</span>
          <span className="text-foreground/80">
            {activePathNodes.length} nodes
          </span>
          <span>·</span>
          <span>root {activeConv.rootId.slice(0, 6)}</span>
          <span>·</span>
          <span>{Object.keys(activeConv.nodes).length} total</span>
        </div>
        <div className="flex items-center gap-3">
          <span>model</span>
          <span className="text-foreground/80">{activeConv.model}</span>
        </div>
      </div>

      <div
        data-testid="chat-scroll"
        className="flex-1 min-h-0 overflow-y-auto windie-scroll"
      >
        {activePathNodes.map((node, i) => (
          <MessageRow
            key={node.id}
            node={node}
            index={i}
            isLast={i === activePathNodes.length - 1}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <Composer />
    </div>
  );
}
