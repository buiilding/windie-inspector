import { useState, useRef, useEffect } from "react";
import { useWindie } from "@/context/WindieContext";
import {
  Send,
  Paperclip,
  X,
  ChevronDown,
  Square,
} from "lucide-react";
import { toast } from "sonner";

export default function Composer() {
  const {
    activeConv,
    sendMessage,
    streaming,
    modelOverride,
    setModelOverride,
    models,
  } = useWindie();
  const [text, setText] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "0px";
      taRef.current.style.height = Math.min(200, taRef.current.scrollHeight) + "px";
    }
  }, [text]);

  const currentModel = modelOverride || activeConv?.model;

  const submit = () => {
    if (!text.trim() || streaming) return;
    sendMessage(activeConv.id, text, { modelOverride, hasImage });
    setText("");
    setHasImage(false);
  };

  return (
    <div className="border-t border-border bg-background" data-testid="composer">
      <div className="px-6 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <textarea
            ref={taRef}
            data-testid="composer-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="query the runtime. cmd/ctrl + enter to send."
            rows={2}
            className="w-full bg-transparent outline-none resize-none font-mono text-[13px] leading-relaxed placeholder:text-muted-foreground/60"
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              data-testid="composer-attach-image"
              onClick={() => setHasImage(!hasImage)}
              className={`h-7 px-2 flex items-center gap-1.5 border transition-colors font-mono text-[11px] uppercase tracking-widest ${
                hasImage
                  ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10"
                  : "border-border text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              <Paperclip className="size-3.5" strokeWidth={1.75} />
              {hasImage ? "image attached" : "attach image"}
              {hasImage && (
                <X
                  className="size-3 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasImage(false);
                  }}
                />
              )}
            </button>

            <div className="relative">
              <button
                data-testid="composer-model-override"
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="h-7 px-2 flex items-center gap-1.5 border border-border hover:bg-surface-hover font-mono text-[11px] uppercase tracking-widest"
              >
                <span className="text-muted-foreground">model</span>
                <span className="text-foreground normal-case">{currentModel}</span>
                {modelOverride && (
                  <span className="text-[hsl(var(--accent))] normal-case">· override</span>
                )}
                <ChevronDown className="size-3" />
              </button>
              {modelMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setModelMenuOpen(false)}
                  />
                  <div className="absolute bottom-full mb-1 left-0 z-20 min-w-[240px] bg-popover border border-border shadow-md">
                    <div className="px-2.5 py-1.5 border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      model override
                    </div>
                    <button
                      data-testid="composer-model-option-inherit"
                      onClick={() => {
                        setModelOverride(null);
                        setModelMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-mono hover:bg-surface-hover flex items-center justify-between"
                    >
                      <span>inherit conv default</span>
                      <span className="text-muted-foreground">{activeConv?.model}</span>
                    </button>
                    <div className="border-t border-border" />
                    {models.map((m) => (
                      <button
                        key={m.id}
                        data-testid={`composer-model-option-${m.id}`}
                        onClick={() => {
                          setModelOverride(m.id);
                          setModelMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-mono hover:bg-surface-hover flex items-center justify-between ${
                          modelOverride === m.id ? "bg-surface" : ""
                        }`}
                      >
                        <span>{m.label}</span>
                        <span className="text-muted-foreground uppercase text-[10px]">
                          {m.family}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {text.length}c · {text.split(/\s+/).filter(Boolean).length}w
            </span>
          </div>
        </div>

        <button
          data-testid="composer-send"
          onClick={submit}
          disabled={streaming || !text.trim()}
          className={`h-10 px-4 flex items-center gap-2 border font-mono text-xs uppercase tracking-widest transition-colors ${
            streaming
              ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))] cursor-not-allowed"
              : text.trim()
                ? "border-foreground bg-foreground text-background hover:opacity-90"
                : "border-border text-muted-foreground cursor-not-allowed"
          }`}
        >
          {streaming ? (
            <>
              <Square className="size-3 fill-current" />
              streaming
            </>
          ) : (
            <>
              <Send className="size-3.5" strokeWidth={1.75} />
              query
            </>
          )}
        </button>
      </div>
    </div>
  );
}
