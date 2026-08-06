import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "@/components/windie/TopBar";
import ActivityBar from "@/components/windie/ActivityBar";
import Sidebar from "@/components/windie/Sidebar";
import ChatPanel from "@/components/windie/ChatPanel";
import InspectorPanel from "@/components/windie/InspectorPanel";
import { useWindie } from "@/context/WindieContext";
import { listLlmProviderKeys, listLlmProviders } from "@/lib/windieApi";

export default function Windie() {
  const [overlay, setOverlay] = useState(null);
  const [activeSidebarView, setActiveSidebarView] = useState("conversations");
  const onboardingCheckedRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const value = Number(window.localStorage.getItem("windie.sidebarWidth"));
      return Number.isFinite(value) && value >= 260 && value <= 560 ? value : 360;
    } catch {
      return 360;
    }
  });

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

  // First-run setup: open onboarding unless Bifrost has validated an enabled
  // provider key. key_count only reports stored key records, so it cannot be
  // used as a readiness signal for auto-detected environment keys.
  useEffect(() => {
    if (onboardingCheckedRef.current) return;
    onboardingCheckedRef.current = true;
    listLlmProviders().then(async (providers) => {
      const readiness = await Promise.all(
        providers.map(async (provider) => {
          if (provider.authentication === "none") {
            return { checked: true, ready: true };
          }
          if (!provider.configured || provider.key_count === 0) {
            return { checked: true, ready: false };
          }

          try {
            const keys = await listLlmProviderKeys(provider.name);
            return {
              checked: true,
              ready: keys.some(
                (key) => key.enabled !== false && key.status === "success"
              ),
            };
          } catch {
            // Keep the existing startup behavior when Bifrost is still coming
            // up or its key endpoint is temporarily unavailable.
            return { checked: false, ready: false };
          }
        })
      );

      if (
        readiness.every(({ checked }) => checked) &&
        !readiness.some(({ ready }) => ready)
      ) {
        setOverlay("onboarding");
      }
    }).catch(() => {
      // The API may still be starting; skipping the auto-show is safer than
      // showing setup to an already-configured user.
    });
  }, []);

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
        <ActivityBar activeView={activeSidebarView} onViewChange={setActiveSidebarView} />
        <Sidebar
          activeView={activeSidebarView}
          sidebarWidth={sidebarWidth}
          onResizeStart={startSidebarResize}
        />
        <div className="flex-1 min-w-0 relative flex">
          <div className="flex-1 min-w-0 relative flex flex-col min-h-0">
            <ChatPanel />
          </div>
          {overlay && <InspectorPanel mode={overlay} onClose={() => setOverlay(null)} />}
        </div>
      </div>
    </div>
  );
}
