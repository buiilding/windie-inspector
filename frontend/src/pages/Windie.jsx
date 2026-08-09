import { useCallback, useEffect, useState } from "react";
import TopBar from "@/components/windie/TopBar";
import ActivityBar from "@/components/windie/ActivityBar";
import Sidebar from "@/components/windie/Sidebar";
import ChatPanel from "@/components/windie/ChatPanel";
import ExtensionDetailPage from "@/components/windie/ExtensionDetailPage";
import { useWindie } from "@/context/WindieContext";

export default function Windie() {
  const { createConversation } = useWindie();
  const [activeSidebarView, setActiveSidebarView] = useState(null);
  const [selectedExtensionId, setSelectedExtensionId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const value = Number(window.localStorage.getItem("windie.sidebarWidth"));
      return Number.isFinite(value) && value >= 260 && value <= 560 ? value : 360;
    } catch {
      return 360;
    }
  });

  const navigateToSidebarView = useCallback((view) => {
    setActiveSidebarView(view);
    setSelectedExtensionId(null);
  }, []);

  const handleActivityBarViewChange = useCallback((view) => {
    setActiveSidebarView((current) => (current === view ? null : view));
  }, []);

  const continueWithNewChat = useCallback(async () => {
    await createConversation();
    navigateToSidebarView("conversations");
  }, [createConversation, navigateToSidebarView]);

  const startSidebarResize = useCallback(
    (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;
      const handleMove = (moveEvent) => {
        const nextWidth = Math.min(560, Math.max(260, startWidth + moveEvent.clientX - startX));
        setSidebarWidth(nextWidth);
      };
      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [sidebarWidth]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem("windie.sidebarWidth", String(sidebarWidth));
    } catch {
      // Storage may be unavailable; the sidebar still resizes for this session.
    }
  }, [sidebarWidth]);

  return (
    <div
      data-testid="windie-app-root"
      className="relative h-full w-full flex flex-col bg-background text-foreground overflow-hidden"
    >
      <TopBar />
      <div className="flex-1 min-h-0 flex">
        <ActivityBar activeView={activeSidebarView} onViewChange={handleActivityBarViewChange} />
        {activeSidebarView && (
          <Sidebar
            activeView={activeSidebarView}
            sidebarWidth={sidebarWidth}
            onResizeStart={startSidebarResize}
            onSelectExtension={setSelectedExtensionId}
            onSelectConversation={() => setSelectedExtensionId(null)}
            selectedExtensionId={selectedExtensionId}
          />
        )}
        <div className="flex-1 min-w-0 relative flex">
          <div className="flex-1 min-w-0 relative flex flex-col min-h-0">
            {selectedExtensionId ? (
              <ExtensionDetailPage providerId={selectedExtensionId} />
            ) : (
              <ChatPanel
                onNavigate={navigateToSidebarView}
                onContinue={continueWithNewChat}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
