# Windie — Local AI Runtime UI Prototype

## Original Problem Statement
Build a web UI prototype for **Windie**, a local AI runtime that is chatbot-like on the surface but gives the user much more control over conversation state. Not a chat app — a local AI runtime primitive with a technical control surface for conversations, runtime state, and model queries. The user should chat naturally but also inspect and manipulate the underlying conversation tree.

## User Choices (v0)
- Theme: **light + dark toggle**
- Tree visualization: **toggleable overlay** over the main chat
- Mock data: **rich** (6 conversations, forks, tool calls, images, reasoning, refusal, annotations, audio)
- Persistence: **pure in-memory**
- Visual reference: left to designer — dense Swiss/developer-tool aesthetic, IBM Plex Sans/Mono, sharp corners, no gradients

## Architecture
Static frontend prototype. No backend calls.
- `/app/frontend/src/context/WindieContext.jsx` — in-memory store: conversations, activeConvId, selectedNodeId, streaming, theme; CRUD + tree ops (fork/edit/truncate/remove/setActivePath) + fake streaming via `setTimeout`
- `/app/frontend/src/pages/Windie.jsx` — 3-column layout composition
- `/app/frontend/src/components/windie/`
  - `TopBar.jsx` — brand, active conv, streaming status, tree toggle, theme toggle
  - `Sidebar.jsx` — conversation list, search filter, new/rename/delete
  - `ChatPanel.jsx` — flattened active-path scroll + Composer
  - `Composer.jsx` — textarea, image-attach pill, model-override menu, send/streaming button (Cmd/Ctrl+Enter)
  - `MessageRow.jsx` — role badges [SYS]/[USR]/[AST]/[TOL], metadata lanes (tool_calls/reasoning/refusal/annotations/audio), per-message actions
  - `InspectorPanel.jsx` — conv metadata, active-path list, system-prompt editor, runtime-request-preview toggle, tool schemas, selected-message actions
  - `TreeOverlay.jsx` — depth-based tree layout with SVG connectors, node-inspector side panel, actions
- `/app/frontend/src/lib/mockData.js` — 6 seeded conversations (arch/streaming/refusal/audio/spec/misc), 5 models, 4 tool schemas
- `/app/frontend/src/index.css` — IBM Plex Sans/Mono, dark+light CSS vars, custom scrollbars, blinking-caret streaming state, grid-bg overlay

## Data Model (in-memory)
- **Conversation**: `{id, name, model, systemPrompt, rootId, nodes: {id→Node}, activePath: [id...], tags, updatedAt}`
- **Node**: `{id, parentId, childrenIds, message}`
- **Message**: `{role: system|user|assistant|tool, parts: [{type:text|image,...}], model?, metadata?, streaming?, tokens?, timestamp}`
- **AssistantMetadata**: `{toolCalls?, reasoning?, refusal?, annotations?, audio?}`
- **ToolSchema**: `{name, description, parameters}`

## What's Implemented (2026-02-04)
- Full 3-column desktop-app layout (sidebar, chat, inspector) + top bar
- Dark & light themes with toggle (contrast tested WCAG AA+)
- 6 rich seeded conversations covering all metadata-lane types + a fork
- Sidebar: search filter, new / rename / delete, per-conv stats (nodes, forks)
- Chat panel: distinct role treatments (system italic-muted, user plain, assistant + metadata lanes, tool as code block), image attachments, streaming caret
- Composer: textarea (Cmd/Ctrl+Enter), image-attach pill, model-override picker (inherit or per-message), disabled-when-empty
- Simulated streaming (~1.6s) with topbar pulsing indicator
- Inspector: conv metadata, live active-path listing, system-prompt editor (mutates root SYS node), runtime-request-preview collapsed↔JSON toggle, read-only tool schemas, selected-message details with actions
- Per-message actions: fork (creates sibling), truncate (shortens active path), edit (creates sibling + repoints path), remove (drops subtree)
- Tree overlay: depth-based node layout with SVG curved connectors, active-path highlighted (solid + accent), branches visible, per-node inspector with the same 4 actions
- Full data-testid coverage; zero console errors verified by testing agent

## Backlog / Deferred (P1/P2)
- **P1** Persist state to localStorage (currently in-memory only per user choice)
- **P1** Improve tree layout for wide branches (subtree-aware centering; siblings from different subtrees can crowd horizontally)
- **P1** editMessage should re-point `selectedNodeId` to the new sibling id instead of clearing it
- **P2** Real streaming via WebSocket or SSE; wire a FastAPI backend and swap `sendMessage` behind the same interface
- **P2** Export / import a conversation as `.wtree` JSONL
- **P2** Keyboard-driven command palette (cmd+k) for switch conv / new / fork / set-path
- **P2** Multi-select in tree overlay to merge or diff paths

## Next Tasks
1. Gather user feedback on the prototype's control surface (do fork/set-path/truncate actions feel right?)
2. If validated, plan the backend runtime primitive (tree + activePath + query pipeline)
3. Add localStorage persistence layer (opt-in)
