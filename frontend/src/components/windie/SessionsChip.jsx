import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MoreHorizontal, Play } from "lucide-react";
import { useWindie } from "@/context/WindieContext";
import FloatingDeleteMenu, { floatingMenuPosition } from "@/components/windie/FloatingDeleteMenu";
import { Switch } from "@/components/ui/switch";

function shortId(id) {
  return id ? id.slice(0, 8) : "";
}

function statusLabel(status) {
  if (status === "ready") return "ready";
  if (status === "running") return "running";
  if (status === "waiting_for_approval") return "needs approval";
  return status || "unknown";
}

function statusDot(status) {
  if (status === "running") return "bg-green-500";
  if (status === "waiting_for_approval") return "bg-amber-500";
  if (status === "failed") return "bg-red-500";
  return "bg-muted-foreground";
}

const WAKEUP_INTERVAL_OPTIONS = [
  { value: "fifteen_minutes", label: "15m" },
  { value: "thirty_minutes", label: "30m" },
  { value: "one_hour", label: "1h" },
  { value: "two_hours", label: "2h" },
];

function wakeupCountdown(nextWakeupAt, now) {
  if (!nextWakeupAt) return "schedule unavailable";
  const remainingMs = nextWakeupAt - now;
  if (remainingMs <= 0) return "due now";
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  if (remainingMinutes < 60) return `in ${remainingMinutes}m`;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return minutes ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
}

export default function SessionsChip({ dropUp = false }) {
  const {
    activeConv,
    sessionsById,
    selectedSessionId,
    sessionResolution,
    viewHeadId,
    selectSession,
    deleteSession,
    setSessionKeepAwake,
    wakeSessionNow,
  } = useWindie();
  const [open, setOpen] = useState(false);
  const [menuSession, setMenuSession] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef(null);

  const sessions = useMemo(() => {
    if (!activeConv) return [];
    return Object.values(sessionsById)
      .filter((session) => session.conversationId === activeConv.id)
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }, [activeConv, sessionsById]);

  useEffect(() => {
    if (!open) {
      setMenuSession(null);
      return;
    }
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
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [open]);

  if (!activeConv || sessions.length === 0) return null;

  const selected = viewHeadId
    ? null
    : sessions.find((session) => session.id === selectedSessionId) || null;
  const showingNewSession = Boolean(viewHeadId && sessionResolution?.kind === "none");

  const handleDelete = async (event, session) => {
    event.stopPropagation();
    if (!session) return;
    const deleted = await deleteSession(session.id);
    if (deleted) setMenuSession(null);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="topbar-sessions-chip"
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-1.5 h-7 px-2 border border-border bg-background hover:bg-surface-hover transition-colors min-w-[160px] ${open ? "bg-surface-hover" : ""}`}
        title={selected ? `session ${selected.id}` : showingNewSession ? "new session at selected path" : "choose a session"}
      >
        {selected && <span className={`size-1.5 rounded-full ${statusDot(selected.status)}`} />}
        <span className="truncate font-mono text-[11px]">
          {selected ? `session ${shortId(selected.id)}` : showingNewSession ? "new session" : "choose session"}
        </span>
        <ChevronDown className="size-3 ml-auto" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          data-testid="topbar-sessions-menu"
          className={`absolute z-30 w-72 bg-popover border border-border shadow-md ${dropUp ? "left-0 bottom-full mb-1" : "left-0 top-full mt-1"}`}
        >
          <div className="px-2.5 py-1.5 border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            sessions · {sessions.length}
          </div>
          <div className="max-h-64 overflow-y-auto windie-scroll">
            {sessions.length === 0 ? (
              <div className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                no sessions yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="relative w-full px-3 py-2 font-mono text-[11px] flex flex-wrap items-center gap-1 hover:bg-surface-hover"
                >
                  <button
                    type="button"
                    data-testid={`topbar-session-${shortId(session.id)}`}
                    onClick={() => {
                      selectSession(session.id);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 text-left flex items-center gap-2"
                  >
                    <span className={`size-1.5 rounded-full shrink-0 ${statusDot(session.status)}`} />
                    <span className="shrink-0">{shortId(session.id)}</span>
                    {session.status !== "completed" && (
                      <span className="text-muted-foreground uppercase text-[10px] shrink-0">
                        {statusLabel(session.status)}
                      </span>
                    )}
                    {session.queueDepth > 0 && (
                      <span className="text-amber-600 uppercase text-[10px] shrink-0">
                        queue {session.queueDepth}
                      </span>
                    )}
                    <span className="truncate flex-1 text-muted-foreground text-right text-[10px]">
                      {session.nodeCount} nodes
                    </span>
                    {!viewHeadId && session.id === selectedSessionId && <Check className="size-3 shrink-0" />}
                  </button>
                  <label
                    className="shrink-0 flex items-center gap-1.5 text-muted-foreground text-[10px]"
                    title="Wake this session after 30 minutes without user activity"
                    onClick={(event) => event.stopPropagation()}
                  >
                    awake
                    <Switch
                      checked={session.keepAwake}
                      onCheckedChange={(keepAwake) => {
                        setSessionKeepAwake(
                          session.id,
                          keepAwake,
                          session.idleWakeupInterval
                        ).catch(() => {});
                      }}
                      aria-label={`keep session ${shortId(session.id)} awake`}
                      data-testid={`topbar-session-keep-awake-${shortId(session.id)}`}
                      className="scale-75 origin-right"
                    />
                  </label>
                  {session.keepAwake && (
                    <div
                      className="basis-full ml-5 mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <span className="shrink-0">every</span>
                      <select
                        value={session.idleWakeupInterval}
                        aria-label={`wakeup interval for session ${shortId(session.id)}`}
                        data-testid={`topbar-session-wakeup-interval-${shortId(session.id)}`}
                        onChange={(event) => {
                          setSessionKeepAwake(
                            session.id,
                            true,
                            event.target.value
                          ).catch(() => {});
                        }}
                        className="h-5 border border-border bg-background px-1 font-mono text-[10px] text-foreground"
                      >
                        {WAKEUP_INTERVAL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span
                        className="min-w-0 flex-1 truncate"
                        title={session.nextIdleWakeupAt ? new Date(session.nextIdleWakeupAt).toLocaleString() : ""}
                      >
                        next {wakeupCountdown(session.nextIdleWakeupAt, now)}
                      </span>
                      <button
                        type="button"
                        disabled={session.status === "running" || session.status === "waiting_for_approval"}
                        aria-label={`wake session ${shortId(session.id)} now`}
                        data-testid={`topbar-session-wake-now-${shortId(session.id)}`}
                        title="Wake now: runs the model without adding a user message"
                        onClick={() => wakeSessionNow(session.id).catch(() => {})}
                        className="shrink-0 flex items-center gap-1 border border-border px-1.5 py-0.5 text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Play className="size-2.5" fill="currentColor" />
                        wake now
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    data-testid={`topbar-session-menu-${shortId(session.id)}`}
                    aria-label={`session actions ${shortId(session.id)}`}
                    title="session actions"
                    onClick={(event) => {
                      event.stopPropagation();
                      const position = floatingMenuPosition(
                        event.currentTarget.getBoundingClientRect()
                      );
                      setMenuSession((current) =>
                        current?.id === session.id
                          ? null
                          : {
                              id: session.id,
                              position,
                            }
                      );
                    }}
                    className="shrink-0 p-1 text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  >
                    <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <FloatingDeleteMenu
        open={Boolean(open && menuSession)}
        position={menuSession?.position}
        testId={
          menuSession
            ? `topbar-session-delete-${shortId(menuSession.id)}`
            : "topbar-session-delete"
        }
        label="delete session"
        disabled={
          sessions.find((session) => session.id === menuSession?.id)?.deletionAllowed === false
        }
        disabledTitle="stop the session before deleting it"
        onDelete={(event) =>
          handleDelete(
            event,
            sessions.find((session) => session.id === menuSession?.id)
          )
        }
      />
    </div>
  );
}
