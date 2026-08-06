import { useWindie } from "@/context/WindieContext";
import ConversationPicker from "@/components/windie/ConversationPicker";
import ExtensionsPanel from "@/components/windie/ExtensionsPanel";
import LlmProvidersPanel from "@/components/windie/LlmProvidersPanel";
import SettingsPanel from "@/components/windie/SettingsPanel";
import TreePanel from "@/components/windie/TreePanel";

function View({ active, children, label }) {
  return (
    <div
      aria-label={label}
      aria-hidden={!active}
      className={`h-full min-h-0 ${active ? "block" : "hidden"}`}
    >
      {children}
    </div>
  );
}

export default function Sidebar({ activeView, sidebarWidth, onResizeStart, onSelectExtension, selectedExtensionId }) {
  const { activeConv } = useWindie();

  return (
    <aside
      data-testid="windie-sidebar"
      style={{ width: `${sidebarWidth}px` }}
      className="relative min-w-0 shrink-0 overflow-hidden border-r border-border bg-background"
    >
      <View active={activeView === "conversations"} label="Conversations">
        <ConversationPicker variant="sidebar" />
      </View>
      <View active={activeView === "tree"} label="Conversation tree">
        {activeConv ? (
          <TreePanel />
        ) : (
          <div className="flex h-full items-center justify-center px-5 text-center font-mono text-[11px] text-muted-foreground">
            select a conversation to view its tree
          </div>
        )}
      </View>
      <View active={activeView === "extensions"} label="Extensions">
        <ExtensionsPanel
          variant="sidebar"
          onSelectExtension={onSelectExtension}
          selectedExtensionId={selectedExtensionId}
        />
      </View>
      <View active={activeView === "llms"} label="LLMs">
        <div className="h-full overflow-y-auto windie-scroll">
          <LlmProvidersPanel />
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
        className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize bg-transparent hover:bg-[hsl(var(--accent))]/50"
      />
    </aside>
  );
}
