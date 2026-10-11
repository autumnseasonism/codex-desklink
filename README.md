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

## Keep working where you left off

You started a task in Codex desktop. Later, you want Claude or PI to pick up the context and ask Codex to continue. DeskLink bridges that handoff while keeping the same conversation visible in Codex.

**MCP** is a standard way for an agent to use tools. DeskLink exposes seven tools and connects them to the running Codex desktop app through a local connection.

| You want to… | DeskLink can… |
| :-- | :-- |
| Find an older conversation | Browse saved local projects and paginate indexed chats, including archives |
| Understand the context | Read the selected conversation, with tool outputs excluded by default |
| Continue an idle task | Submit a follow-up to that same Codex conversation |
| Return to an archived task | Explicitly restore it, then send the follow-up |
| See what happened | Read latest-turn progress and replies; open the original chat in Codex |
| Start a separate task | Create a local chat when creation is separately enabled |

> **Community project · experimental.** This uses version-dependent Codex desktop internal interfaces, not a stable public external API. Windows x64 is the verified platform. Read the [compatibility notes](docs/COMPATIBILITY.md) before relying on it for important work. Not affiliated with or endorsed by OpenAI, Anthropic or PI.

## A local bridge, a visible result

<img src="docs/assets/workflow.svg" alt="Claude Code or PI calls DeskLink; DeskLink reads a local catalog and talks to Codex desktop; replies appear in the original chat" width="100%" />

The bridge itself opens no network listener. Your agent clients and Codex still use their own model services. Conversation content read by a client becomes part of that client's context and follows its data policies.

### Real desktop verification

<p align="center"><img src="docs/assets/desktop-replies.png" alt="Real Codex desktop test conversation showing PI and Claude normal follow-ups and archived-chat restoration replies" width="620" /></p>

*Actual test screenshot, not a mockup.* PI and Claude Code both submitted follow-ups to a test chat. The replies above appeared in that same Codex desktop conversation, including after archive restoration. The cropped screenshot contains only the test conversation. See [what was tested and what remains unverified](docs/COMPATIBILITY.md).

## Get started

**Recommended: the self-contained Windows release.** It includes the MCP service, dependencies and Node runtime. Install and sign in to Codex desktop and your chosen client separately.

1. [Download the Windows ZIP](https://github.com/autumnseasonism/codex-desklink/releases/latest), check its SHA-256 against `SHA256SUMS.txt`, and extract it to a permanent folder.
2. Open a Codex desktop chat and ask its agent to bind the package to the verified local connection. Start with read-only access; enable sending only when you want another agent to submit messages.
3. Run the package's Claude or PI installer. A temporary launcher is also available if you prefer to try it before registering it for everyday use.
4. Ask your client to check the connection, list projects/chats, and read a selected conversation. Then explicitly ask it to continue that chat.

Example binding request to the **Codex desktop agent**:

> Bind the Codex DeskLink folder I provide. Verify this chat's actual thread ID and CODEX_APP_TOOLS_PIPE_PATH before using configure.ps1. Enable access to all local indexed main conversations, including archives, but keep sending and creation disabled. Do not guess the endpoint or change global hooks or credentials.

Example request to **Claude Code or PI**, after you enable sending:

> Use Codex DeskLink to find my selected local Codex chat and read its recent context. Continue it with the follow-up I provide. If it is archived, restore it only with my explicit permission. Report the latest reply and whether that turn has finished. Do not resend if delivery is uncertain.

The [installation guide](docs/INSTALL.md) includes the exact scripts, source setup and configuration options. A Codex restart may require rebinding the connection.

## Access stays explicit

- **Read scope starts narrow.** All-local browsing is an explicit opt-in. It covers indexed local main chats, not cloud chats, ChatGPT chats, internal subagents or deleted/unindexed records.
- **Sending and creation are separate switches.** Seeing a project does not authorize creating work there. The setup helper leaves creation disabled.
- **Archives are restored intentionally.** Sending to an archived chat requires `restoreArchived: true`.
- **Submissions have persistent request IDs.** A repeated accepted request returns its receipt. An uncertain submission is never automatically resent. Keep the `state/` folder when moving an installation.
- **History is context, not permission.** A statement in an old chat does not authorize a new action.
- **Latest reply is not per-request tracking.** Concurrent senders may change the latest turn. A successful send receipt means accepted, not completed. No stop tool is exposed.

No hooks are required. DeskLink does not modify Codex global hooks. An existing hook failure remains a separate issue to diagnose.

## Seven tools

| Tool | Purpose |
| :-- | :-- |
| `bridge_status` | Verify the desktop connection and report enabled capabilities |
| `list_projects` | List allowed projects, or the saved local project catalog with opt-in |
| `list_conversations` | Browse chats with project/archive filters and pagination |
| `read_conversation` | Read a page of the selected chat |
| `continue_conversation` | Send an explicitly requested follow-up, with optional archive restoration |
| `get_conversation_result` | Inspect latest-turn progress, replies and completion |
| `create_conversation` | Start a local chat under separately enabled creation scope |

The client registration name stays **`codex_desktop`** for compatibility with existing installations. The project and server name are **Codex DeskLink / `codex-desklink`**.

## Build and contribute

Source development requires Node 24+ and npm. Windows release builds require Windows x64. From a checkout, install the locked dependencies with `npm ci`, run `npm test`, then build with `npm run build`. The builder writes a fresh folder under `dist/`, includes the matching Node license, and refuses to overwrite an existing output.

We welcome reproducible compatibility reports, installation improvements and focused fixes. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md); never attach your real configuration, raw chat exports or credentials to an issue.

Released under the [MIT license](LICENSE). Bundled runtime and dependency notices remain with their respective components; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
