# Changelog

## 0.2.1 — Dedicated source with existing targets (local, not yet released)

- Separate controller identity from target access. An explicit opt-in allows any existing indexed local main chat, including chats created by another client.
- Preserve create-first, controller source, independent ledgers, explicit archive restoration and local-main index validation. Legacy profiles retain their scope.
- New profiles explicitly enable existing conversation control; existing dedicated profiles can enable it without replacing controller state.

## 0.2.0 — Client-owned conversations (local, not yet released)

- Separate PI / Claude controller identities, persisted ownership and request ledgers; clients create their own conversation before controlling work.
- New owned launchers and setup explicitly enable all supported capabilities while preserving legacy configuration and running clients.
- Real local project registration under allowed existing folders, plus creation and desktop handoff of project work chats.
- Eight MCP tools; project capability and connection failures reported explicitly. Experimental project API requires a running local daemon.
- See [client-owned workflow](docs/CLIENT_OWNED.md). This version has not been pushed or published.

## 0.1.2 — Initial public release

- Public project name: **Codex DeskLink**. Existing `codex_desktop` client registration and `CODEX_DESKTOP_BRIDGE_CONFIG` environment variable retained.
- Seven local MCP tools for scoped browsing, reading, continuation, latest results and separately enabled creation.
- Opt-in full local project/chat catalog with pagination, including archived chats; explicit archive restoration before sending.
- Persistent submission IDs and no automatic retries of uncertain sends.
- Self-contained Windows x64 package with Node runtime, binding helper, Claude Code / PI installers and temporary launchers.
- English and Simplified Chinese documentation, original illustrations and a controlled real desktop verification screenshot.

The public release keeps the verified development version number. Compatibility is limited to the observed environment documented in [COMPATIBILITY.md](docs/COMPATIBILITY.md); desktop internals may change.
