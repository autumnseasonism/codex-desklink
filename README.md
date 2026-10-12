<p align="center">
  <img src="docs/assets/hero.svg" alt="Codex DeskLink — keep the conversation connected" width="100%" />
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-9ae6b4?style=flat-square" /></a>
  <img alt="Windows x64" src="https://img.shields.io/badge/platform-Windows%20x64-93c5fd?style=flat-square" />
  <img alt="Local stdio MCP" src="https://img.shields.io/badge/transport-local%20MCP-c4b5fd?style=flat-square" />
  <img alt="Experimental integration" src="https://img.shields.io/badge/status-experimental-fde68a?style=flat-square" />
</p>

<p align="center"><b>Your agents. Your existing conversations. One desktop.</b><br />
Let Claude Code or PI find, read and continue your local Codex chats — with replies appearing in the original Codex desktop conversation.</p>

<p align="center"><a href="README.zh-CN.md">简体中文</a> · <a href="https://github.com/autumnseasonism/codex-desklink/releases/latest">Download for Windows</a> · <a href="docs/INSTALL.md">Install guide</a> · <a href="docs/COMPATIBILITY.md">Verified scope</a></p>

**0.2.1:** separate PI / Claude controller chats, access to any existing indexed local main chat, and real project creation, with supported features explicitly enabled. Legacy connections remain available. [Client-owned workflow](docs/CLIENT_OWNED.md). [Download 0.2.1](https://github.com/autumnseasonism/codex-desklink/releases/tag/v0.2.1).

## Keep working where you left off

You started a task in Codex desktop. Later, you want Claude or PI to pick up the context and ask Codex to continue. DeskLink bridges that handoff while keeping the same conversation visible in Codex.

**MCP** is a standard way for an agent to use tools. DeskLink exposes eight tools and connects them to the running Codex desktop app through a local connection.

| You want to… | DeskLink can… |
| :-- | :-- |
| Find an older conversation | Browse saved local projects and paginate indexed chats, including archives |
| Understand the context | Read the selected conversation, with tool outputs excluded by default |
| Continue an idle task | Submit a follow-up to that same Codex conversation |
| Return to an archived task | Explicitly restore it, then send the follow-up |
| See what happened | Read latest-turn progress and replies; open the original chat in Codex |
| Start a separate task | Create a local chat from your dedicated client controller |
| Start a project | Register an existing authorized folder as a real local Codex project |

> **Community project · experimental.** This uses version-dependent Codex desktop internal interfaces, not a stable public external API. Windows x64 is the verified platform. Read the [compatibility notes](docs/COMPATIBILITY.md) before relying on it for important work. Not affiliated with or endorsed by OpenAI, Anthropic or PI.

## A local bridge, a visible result

<img src="docs/assets/workflow.svg" alt="Claude Code or PI calls DeskLink; DeskLink reads a local catalog and talks to Codex desktop; replies appear in the original chat" width="100%" />

The bridge itself opens no network listener. Your agent clients and Codex still use their own model services. Conversation content read by a client becomes part of that client's context and follows its data policies.

### Verified on a real local setup

<img src="docs/assets/verification-0.2.1.svg" alt="Real 0.2.1 test records: PI and Claude continued the same existing conversation, both completed, and each message source matched its own controller. 22 source and 22 bundle tests passed." width="100%" />

*Readable visualization of recorded tool results, not a desktop screenshot.* PI was tested first, then Claude Code. Both read the other client's completed test chat and continued the same pre-existing chat to completion. The original message source IDs matched their respective controller chats. [Verification details and remaining limits](docs/COMPATIBILITY.md).

<details>
<summary>View the original desktop screenshot (0.1.2 test; click the image for its original size)</summary>

<a href="docs/assets/desktop-replies.png"><img src="docs/assets/desktop-replies.png" alt="Original 0.1.2 desktop screenshot showing controlled PI and Claude continuation and archive restoration replies" width="725" /></a>

This is an actual historical test screenshot. Its original resolution is 725 × 915; it is retained as evidence, not used as proof of 0.2.1 UI navigation or new-project sidebar behavior.
</details>

## Get started

**Recommended: the 0.2.1 self-contained Windows release with dedicated client controllers.** It includes the bridge, locked dependencies and Node runtime. Install and sign in to Codex desktop and your chosen client separately.

1. [Download the Windows ZIP](https://github.com/autumnseasonism/codex-desklink/releases/latest), verify `SHA256SUMS.txt`, and extract to a permanent folder.
2. Ask your Codex desktop agent to verify the current chat ID, desktop connection, running daemon and permitted project folder, then initialize the [dedicated client profiles](docs/CLIENT_OWNED.md). This setup explicitly enables all supported capabilities, including control of existing local main chats.
3. Start `start-pi-owned.ps1` or `start-claude-owned.ps1`. Ask the client to check its connection, then create its own controller chat first. That chat becomes its persistent message source.
4. Choose an existing local main chat, or create a work chat/project. Ask the client to read the target state and submit your follow-up. Replies stay in the target's original Codex conversation.

Example setup request to the **Codex desktop agent**:

> Set up the Codex DeskLink folder I provide with dedicated PI and Claude profiles. Verify this chat's actual ID, the desktop pipe, running daemon executable/control socket and the permitted project root before using setup-owned-clients.mjs. Explicitly enable all supported features. Preserve existing configuration and controller state, running agents, hooks and credentials. Do not guess connection values.

Example request to **Claude Code or PI**:

> Use Codex DeskLink. Check the connection and create your dedicated controller if needed. Find the existing chat I specify, read its context and state, then continue it with my follow-up. Use your own controller as the source. Restore an archive only if I explicitly request it. Report completion; never resend an uncertain submission.

Existing installations can keep the [legacy read-only binding flow](docs/INSTALL.md). Do not replace a running client's registration; use the new launcher for its next session. A Codex restart may require connection rebinding.

## Access stays explicit

- **Source identity and target access are separate.** Dedicated setup enables all-local targets; legacy read-only setup starts narrow. It covers indexed local main chats, not cloud chats, ChatGPT chats, internal subagents or deleted/unindexed records.
- **Sending and creation are separate switches.** Seeing a project does not authorize creating work there. Dedicated profiles enable both; the legacy binding helper leaves creation disabled.
- **Archives are restored intentionally.** Sending to an archived chat requires `restoreArchived: true`.
- **Submissions have persistent request IDs.** A repeated accepted request returns its receipt. An uncertain submission is never automatically resent. Keep `profiles/state/` for dedicated controllers, or `state/` for legacy profiles, when moving an installation.
- **History is context, not permission.** A statement in an old chat does not authorize a new action.
- **Latest reply is not per-request tracking.** Concurrent senders may change the latest turn. A successful send receipt means accepted, not completed. No stop tool is exposed.

No hooks are required. DeskLink does not modify Codex global hooks. An existing hook failure remains a separate issue to diagnose.

## Eight tools

| Tool | Purpose |
| :-- | :-- |
| `bridge_status` | Verify the desktop connection and report enabled capabilities |
| `list_projects` | List allowed projects, or the saved local project catalog with opt-in |
| `list_conversations` | Browse chats with project/archive filters and pagination |
| `read_conversation` | Read a page of the selected chat |
| `continue_conversation` | Send an explicitly requested follow-up, with optional archive restoration |
| `get_conversation_result` | Inspect latest-turn progress, replies and completion |
| `create_conversation` | Start a local chat under separately enabled creation scope |
| `create_project` | Register a real local project under allowed folders after creating an owned chat |

The client registration name stays **`codex_desktop`** for compatibility with existing installations. The project and server name are **Codex DeskLink / `codex-desklink`**.

## Build and contribute

Source development requires Node 24+ and npm. Windows release builds require Windows x64. From a checkout, install the locked dependencies with `npm ci`, run `npm test`, then build with `npm run build`. The builder writes a fresh folder under `dist/`, includes the matching Node license, and refuses to overwrite an existing output.

We welcome reproducible compatibility reports, installation improvements and focused fixes. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md); never attach your real configuration, raw chat exports or credentials to an issue.

Released under the [MIT license](LICENSE). Bundled runtime and dependency notices remain with their respective components; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
