/**
 * Shows the system messages generated for the next model request.
 *
 * The persisted conversation prompt remains editable elsewhere. This view is
 * intentionally read-only because the runtime adds the extension catalog and
 * other generated context after loading the conversation.
 */
export default function RuntimeSystemContext({ content, testId }) {
  return (
    <div
      data-testid={testId}
      className="mt-4 border border-border bg-surface/20"
    >
      <div className="border-b border-border px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-widest">
          model system context
        </div>
        <div className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Read-only. This is generated for the next model request, including the compact extension catalog.
        </div>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-foreground windie-scroll">
        {content || "No generated system messages."}
      </pre>
    </div>
  );
}
