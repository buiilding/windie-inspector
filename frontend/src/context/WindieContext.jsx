import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { INITIAL_CONVERSATIONS, MODELS, TOOL_SCHEMAS } from "@/lib/mockData";

const WindieCtx = createContext(null);

const uid = (p = "n") => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export function WindieProvider({ children }) {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState(INITIAL_CONVERSATIONS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [treeOverlayOpen, setTreeOverlayOpen] = useState(false);
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [modelOverride, setModelOverride] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeConvId) || conversations[0],
    [conversations, activeConvId]
  );

  const activePathNodes = useMemo(() => {
    if (!activeConv) return [];
    return activeConv.activePath.map((id) => activeConv.nodes[id]).filter(Boolean);
  }, [activeConv]);

  // Ensure selectedNodeId is valid for the active conversation
  useEffect(() => {
    if (!activeConv) return;
    if (selectedNodeId && activeConv.nodes[selectedNodeId]) return;
    // default to last node in active path
    const last = activeConv.activePath[activeConv.activePath.length - 1];
    setSelectedNodeId(last || null);
  }, [activeConv, selectedNodeId]);

  const updateConv = useCallback((convId, updater) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...updater(c), updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  const createConversation = useCallback(() => {
    const id = uid("conv");
    const rootId = uid();
    const nodes = {
      [rootId]: {
        id: rootId,
        parentId: null,
        childrenIds: [],
        message: {
          role: "system",
          parts: [{ type: "text", text: "You are Windie, a local AI runtime primitive." }],
          timestamp: new Date().toISOString(),
        },
      },
    };
    const conv = {
      id,
      name: "untitled conversation",
      model: MODELS[0].id,
      systemPrompt: "You are Windie, a local AI runtime primitive.",
      rootId,
      nodes,
      activePath: [rootId],
      updatedAt: new Date().toISOString(),
      tags: [],
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(id);
    setSelectedNodeId(rootId);
    return id;
  }, []);

  const renameConversation = useCallback(
    (convId, name) => updateConv(convId, (c) => ({ ...c, name })),
    [updateConv]
  );

  const deleteConversation = useCallback(
    (convId) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== convId);
        if (activeConvId === convId && next.length > 0) setActiveConvId(next[0].id);
        return next;
      });
    },
    [activeConvId]
  );

  const setSystemPrompt = useCallback(
    (convId, text) =>
      updateConv(convId, (c) => {
        const nodes = { ...c.nodes };
        const rootNode = nodes[c.rootId];
        if (rootNode && rootNode.message.role === "system") {
          nodes[c.rootId] = {
            ...rootNode,
            message: {
              ...rootNode.message,
              parts: [{ type: "text", text }],
            },
          };
        }
        return { ...c, systemPrompt: text, nodes };
      }),
    [updateConv]
  );

  const setActivePath = useCallback(
    (convId, path) => updateConv(convId, (c) => ({ ...c, activePath: path })),
    [updateConv]
  );

  // Compute an active path from a leaf up to root
  const pathFromLeaf = useCallback((conv, leafId) => {
    const out = [];
    let cur = leafId;
    while (cur) {
      out.unshift(cur);
      cur = conv.nodes[cur]?.parentId;
    }
    return out;
  }, []);

  const setActivePathToLeaf = useCallback(
    (convId, leafId) => {
      updateConv(convId, (c) => ({ ...c, activePath: pathFromLeaf(c, leafId) }));
    },
    [updateConv, pathFromLeaf]
  );

  const truncateAfter = useCallback(
    (convId, nodeId) => {
      updateConv(convId, (c) => {
        const idx = c.activePath.indexOf(nodeId);
        if (idx < 0) return c;
        return { ...c, activePath: c.activePath.slice(0, idx + 1) };
      });
    },
    [updateConv]
  );

  const removeMessage = useCallback(
    (convId, nodeId) => {
      updateConv(convId, (c) => {
        if (nodeId === c.rootId) return c; // don't remove root/system
        const nodes = { ...c.nodes };
        const node = nodes[nodeId];
        if (!node) return c;
        // detach from parent
        const parent = nodes[node.parentId];
        if (parent) {
          nodes[node.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter((id) => id !== nodeId),
          };
        }
        // remove subtree
        const toRemove = [nodeId];
        while (toRemove.length) {
          const id = toRemove.pop();
          const n = nodes[id];
          if (!n) continue;
          n.childrenIds.forEach((cid) => toRemove.push(cid));
          delete nodes[id];
        }
        // trim active path
        const idx = c.activePath.indexOf(nodeId);
        const activePath =
          idx >= 0 ? c.activePath.slice(0, idx) : c.activePath.filter((id) => nodes[id]);
        return { ...c, nodes, activePath };
      });
    },
    [updateConv]
  );

  const editMessage = useCallback(
    (convId, nodeId, newText) => {
      updateConv(convId, (c) => {
        // edit == create sibling with new content and re-point active path
        const node = c.nodes[nodeId];
        if (!node) return c;
        if (nodeId === c.rootId) {
          // system prompt: just mutate in place
          const nodes = { ...c.nodes };
          nodes[nodeId] = {
            ...node,
            message: {
              ...node.message,
              parts: [{ type: "text", text: newText }],
            },
          };
          return { ...c, systemPrompt: newText, nodes };
        }
        const parentId = node.parentId;
        const newId = uid();
        const nodes = { ...c.nodes };
        nodes[newId] = {
          id: newId,
          parentId,
          childrenIds: [],
          message: {
            ...node.message,
            parts: [{ type: "text", text: newText }],
            timestamp: new Date().toISOString(),
            editedFrom: nodeId,
          },
        };
        nodes[parentId] = {
          ...nodes[parentId],
          childrenIds: [...nodes[parentId].childrenIds, newId],
        };
        // repoint active path: replace nodeId with newId, drop the rest
        const idx = c.activePath.indexOf(nodeId);
        const activePath =
          idx >= 0 ? [...c.activePath.slice(0, idx), newId] : c.activePath;
        return { ...c, nodes, activePath };
      });
      setSelectedNodeId(null);
    },
    [updateConv]
  );

  const forkFromMessage = useCallback(
    (convId, nodeId) => {
      // Create a new empty user node as sibling? Spec: "fork from selected message"
      // Interpretation: create a fresh branch starting at the parent of the selected assistant/user node,
      // so the user can re-ask. If node is user, fork means: sibling of node under same parent to re-word.
      let newLeaf = null;
      updateConv(convId, (c) => {
        const node = c.nodes[nodeId];
        if (!node) return c;
        const parentId = node.parentId ?? c.rootId;
        const newId = uid();
        const nodes = { ...c.nodes };
        nodes[newId] = {
          id: newId,
          parentId,
          childrenIds: [],
          message: {
            role: node.message.role === "assistant" ? "user" : "user",
            parts: [{ type: "text", text: "" }],
            timestamp: new Date().toISOString(),
            draft: true,
          },
        };
        nodes[parentId] = {
          ...nodes[parentId],
          childrenIds: [...nodes[parentId].childrenIds, newId],
        };
        const idx = c.activePath.indexOf(parentId);
        const activePath =
          idx >= 0 ? [...c.activePath.slice(0, idx + 1), newId] : [...c.activePath, newId];
        newLeaf = newId;
        return { ...c, nodes, activePath };
      });
      if (newLeaf) setSelectedNodeId(newLeaf);
    },
    [updateConv]
  );

  // Append user message + fake assistant streaming response
  const sendMessage = useCallback(
    (convId, text, options = {}) => {
      if (!text.trim()) return;
      const modelId = options.modelOverride || activeConv.model;
      const userId = uid();
      const assistantId = uid();

      updateConv(convId, (c) => {
        const nodes = { ...c.nodes };
        const parentId = c.activePath[c.activePath.length - 1];
        nodes[userId] = {
          id: userId,
          parentId,
          childrenIds: [assistantId],
          message: {
            role: "user",
            parts: [
              { type: "text", text },
              ...(options.hasImage
                ? [
                    {
                      type: "image",
                      url: "https://images.unsplash.com/photo-1571666521805-f5e8423aba9d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3R1cmUlMjBkaWFncmFtfGVufDB8fHx8MTc4MzE5NTcwN3ww&ixlib=rb-4.1.0&q=85",
                      alt: "attachment.png",
                    },
                  ]
                : []),
            ],
            timestamp: new Date().toISOString(),
          },
        };
        nodes[parentId] = {
          ...nodes[parentId],
          childrenIds: [...nodes[parentId].childrenIds, userId],
        };
        nodes[assistantId] = {
          id: assistantId,
          parentId: userId,
          childrenIds: [],
          message: {
            role: "assistant",
            model: modelId,
            parts: [{ type: "text", text: "" }],
            timestamp: new Date().toISOString(),
            streaming: true,
          },
        };
        return {
          ...c,
          nodes,
          activePath: [...c.activePath, userId, assistantId],
        };
      });

      setStreaming(true);
      // Fake stream
      const chunks = [
        "Acknowledged. ",
        "Projecting the active path into a runtime request",
        " and querying ",
        modelId,
        "... ",
        "the tree remains unchanged; ",
        "this reply is appended as a new leaf.",
      ];
      let i = 0;
      const tick = () => {
        if (i >= chunks.length) {
          setStreaming(false);
          updateConv(convId, (c) => {
            const nodes = { ...c.nodes };
            const cur = nodes[assistantId];
            if (!cur) return c;
            nodes[assistantId] = {
              ...cur,
              message: {
                ...cur.message,
                streaming: false,
                tokens: 87,
                metadata: {
                  reasoning:
                    "Response synthesized from the current active path. No tools were called.",
                },
              },
            };
            return { ...c, nodes };
          });
          return;
        }
        updateConv(convId, (c) => {
          const nodes = { ...c.nodes };
          const cur = nodes[assistantId];
          if (!cur) return c;
          const currentText = cur.message.parts[0]?.text || "";
          nodes[assistantId] = {
            ...cur,
            message: {
              ...cur.message,
              parts: [{ type: "text", text: currentText + chunks[i] }],
            },
          };
          return { ...c, nodes };
        });
        i += 1;
        setTimeout(tick, 220);
      };
      setTimeout(tick, 200);
    },
    [activeConv, updateConv]
  );

  const value = {
    // state
    conversations,
    activeConv,
    activeConvId,
    selectedNodeId,
    activePathNodes,
    theme,
    treeOverlayOpen,
    contextPreviewOpen,
    streaming,
    modelOverride,
    searchQuery,
    models: MODELS,
    toolSchemas: TOOL_SCHEMAS,
    // setters
    setActiveConvId,
    setSelectedNodeId,
    setTheme,
    setTreeOverlayOpen,
    setContextPreviewOpen,
    setModelOverride,
    setSearchQuery,
    // actions
    createConversation,
    renameConversation,
    deleteConversation,
    setSystemPrompt,
    setActivePath,
    setActivePathToLeaf,
    truncateAfter,
    removeMessage,
    editMessage,
    forkFromMessage,
    sendMessage,
  };

  return <WindieCtx.Provider value={value}>{children}</WindieCtx.Provider>;
}

export function useWindie() {
  const ctx = useContext(WindieCtx);
  if (!ctx) throw new Error("useWindie must be used within WindieProvider");
  return ctx;
}
