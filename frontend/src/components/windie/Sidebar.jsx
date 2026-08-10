import { useWindie } from "@/context/WindieContext";
import ConversationPicker from "@/components/windie/ConversationPicker";
import ExtensionsPanel from "@/components/windie/ExtensionsPanel";
import LlmProvidersPanel from "@/components/windie/LlmProvidersPanel";
import SettingsPanel from "@/components/windie/SettingsPanel";
import TreePanel from "@/components/windie/TreePanel";

function View({ active, children, label }) {
  if (!active) return null;

  return (
    <div
      aria-label={label}
      className="h-full min-h-0"
    >
      {children}
    </div>
  );
}

export default function Sidebar({ activeView, sidebarWidth, onResizeStart, onSelectExtension, onSelectConversation, onNavigate, selectedExtensionId }) {
  const { activeConv } = useWindie();

  return (
    <aside
      data-testid="windie-sidebar"
      style={{ width: `${sidebarWidth}px` }}
      className="relative min-w-0 shrink-0 overflow-hidden border-r border-border bg-background"
    >
      <View active={activeView === "conversations"} label="Conversations">
        <ConversationPicker variant="sidebar" onSelectConversation={onSelectConversation} onNavigate={onNavigate} />
      </View>
      <View active={activeView === "tree"} label="Conversation Graph">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-11 shrink-0 items-center border-b border-border px-3">
            <span className="font-sans text-base font-medium tracking-tight">Conversation Graph</span>
          </div>
          <div className="min-h-0 flex-1">
            {activeConv ? (
              <TreePanel />
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-center font-mono text-[11px] text-muted-foreground">
                select a conversation to view its graph
              </div>
            )}
          </div>
        </div>
      </View>
      <View active={activeView === "extensions"} label="Extensions">
        <ExtensionsPanel
          variant="sidebar"
          onSelectExtension={onSelectExtension}
          selectedExtensionId={selectedExtensionId}
        />
      </View>
      <View active={activeView === "llms"} label="LLM Providers">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-11 shrink-0 items-center border-b border-border px-3">
            <span className="font-sans text-base font-medium tracking-tight">LLM Providers</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto windie-scroll">
            <LlmProvidersPanel />
          </div>
        </div>
      </View>
      <View active={activeView === "settings"} label="Settings">
        <SettingsPanel />
      </View>
      <button
        type="button"
        aria-label="resize sidebar"
        title="resize sidebar"
        data-testid="windie-sidebar-resize"
        onMouseDown={onResizeStart}
        className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize bg-transparent"
      />
    </aside>
  );
}
