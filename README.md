# Windie Inspector

Windie Inspector is the first-party browser client for the Windie localhost
API. It is maintained as an independent repository so the client and its
optional static host do not become part of Windie's runtime Cargo package.

## Components

- `frontend/` is the React client. It owns presentation, interaction, and
  short-lived browser state; it does not own Windie persistence or runtime
  policy.
- `host/` is an independent Rust static-asset host. It embeds the compiled
  frontend and produces the `windie-inspector` executable used by packaged
  Windie installations.

The host does not own conversations, sessions, model context, tools,
permissions, or provider logic. It only serves the frontend and supplies the
configured Windie API endpoint to the browser.

## Development

Build the frontend:

```bash
cd frontend
npm ci --legacy-peer-deps
npm run build
```

Check the independent host after the frontend build:

```bash
cargo check --manifest-path host/Cargo.toml
```

The Windie repository consumes this repository at a pinned Git commit and
builds both components during its native release packaging workflow.
