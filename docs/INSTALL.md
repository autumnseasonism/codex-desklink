# Installation / 安装说明

For separate PI / Claude ownership with explicitly enabled capabilities, use the new [client-owned workflow](CLIENT_OWNED.md). It adds dedicated launchers without replacing a running legacy client. 0.2.0 is a local update; the currently published ZIP remains 0.1.2. The legacy binding flow below preserves its original defaults.

Claude / PI 各自创建和控制所属会话、功能明确开启，请使用[独立入口说明](CLIENT_OWNED.md)。新入口不覆盖正在使用的旧入口；当前发布包仍为 0.1.2，0.2.0 尚未公开发布。下方旧绑定流程保留原默认值。

Use the [Windows release](https://github.com/autumnseasonism/codex-desklink/releases/latest) for everyday use. The ZIP contains the bridge, locked dependencies and a Node runtime. You still need a running Codex desktop app with its bundled `codex-app-tools`, and an installed, signed-in Claude Code or PI client. This is currently a Windows x64 integration.

日常使用推荐下载 Windows Release。它包含工具、依赖与运行环境；Codex 桌面及其内置工具、Claude Code 或 PI 的安装与登录仍需自行准备。目前只验证了 Windows x64。

## 1. Download and bind / 下载与绑定

Download the ZIP and `SHA256SUMS.txt`, verify the archive hash, and extract the whole folder to a permanent location. Do not register directly from a temporary extraction folder.

Ask an agent in the intended **Codex desktop chat** to verify that chat's actual ID and its `CODEX_APP_TOOLS_PIPE_PATH`, then bind your extracted folder. The pipe is the local endpoint used to reach the running desktop app. Do not select an endpoint by guessing among files or invent a thread ID. If the agent cannot verify these values, stop binding and diagnose the desktop integration.

在目标 **Codex 桌面聊天**中，请 Agent 核验当前聊天 ID 与 `CODEX_APP_TOOLS_PIPE_PATH`。这是连接运行中桌面的本机通信地址；无法核实时应暂停绑定，不从多个地址中猜选。

The helper writes only this package's `bridge.local.json`. Existing package configuration is backed up in `recovery/` before replacement. It does not change global Codex settings, hooks or credentials.

| Option / 选项 | Effect / 效果 |
| :-- | :-- |
| Default / 默认 | Read only the explicitly bound conversation; sending and creation off / 只读绑定会话 |
| `-AllLocal` | Allow browsing/reading all indexed local main chats, including archives / 全本机索引主会话可查 |
| `-AllowSend` | Allow explicitly requested follow-ups / 开启明确授权的发送 |

Creation always stays off when using the helper. For advanced configuration, copy the shape in `bridge.example.json` and provide verified values in `bridge.local.json`. `allowCreate` additionally requires allowed project IDs, or the separate `allowProjectlessCreate` opt-in. All-local catalog access never grants creation permission.

## 2. Choose a client / 选择客户端

After binding, run the relevant script **from the extracted folder** in PowerShell. These register this permanent folder as a tool source; they do not install Claude or PI itself.

绑定后，在解压目录的 PowerShell 中运行对应脚本。脚本登记工具来源，不负责安装 Claude 或 PI 本身。

| Client | Try for this launch / 临时使用 | Register / 注册日常使用 |
| :-- | :-- | :-- |
| Claude Code | `./start-claude.ps1` | `./install-claude.ps1` |
| PI | `./start-pi.ps1` | `./install-pi.ps1` |

Both installers accept `-DryRun` to check prerequisites without changing client settings. The Claude installer backs up an existing default user configuration and refuses to overwrite a `codex_desktop` registration. Custom `CLAUDE_CONFIG_DIR` setups should use the temporary launcher or register manually after protecting their configuration. The PI installer backs up existing settings, respects `PI_CODING_AGENT_DIR`, and uses PI's native local package installation.

Claude has a user-level stdio MCP registration named `codex_desktop`. PI loads `pi-extension.mjs`, which registers that same server name and starts the bundled runtime. A compatible PI version must provide `registerMcpServer`; PI 1.1.0 was tested. Claude **Code CLI** was tested, not Claude Desktop GUI.

PowerShell execution policy varies between managed computers. If scripts are blocked, follow your organization's approved script execution process; this package does not change machine policy.

## 3. Check before sending / 先核验再发送

Ask the client to run `bridge_status`, list projects/chats, and read one selected conversation. In all-local mode, follow `page.nextCursor` until `hasMore` is false; a single page is not the complete catalog. Explicitly identify the chat and the message before sending. Archived chats require explicit permission to restore.

先检查连接并读取选中的聊天。全本机目录需跟随分页游标，不能把第一页视作全部结果。发送前明确目标和消息，归档恢复也需明确授权。

Keep `state/` with a used installation: it remembers submission IDs and prevents accidental duplicate sends. If delivery is uncertain, inspect the original chat before deciding on a new submission. Moving the folder requires updating client registrations. Restarting/updating Codex may require a newly verified pipe and rebinding.

## Troubleshooting / 常见问题

| Symptom | What to do |
| :-- | :-- |
| Cannot connect / 无法连接 | Ensure Codex is running and has bundled app tools; verify/rebind the current endpoint |
| Unsupported local schema / 本机目录结构不支持 | Stop all-local access; report versions and sanitized error text; use explicit scope if its connection still works |
| Chat not found / 会话未找到 | Check local-main-chat scope and pagination; cloud/ChatGPT/unindexed records are excluded |
| Sending disabled / 发送关闭 | Enable only after explicit user authorization; listing permission is separate |
| Previous submission uncertain / 上次发送不确定 | Read the original conversation; never blindly resend or delete the ledger |
| Existing registration / 已有同名注册 | Inspect it first; installer intentionally preserves it |
| Stop hook failure / 钩子失败 | Diagnose that hook separately; DeskLink requires no hooks |

## Technical reference / 技术细节（可跳过）

Binding command, with values verified by the Codex desktop agent:

```powershell
./configure.ps1 -CallerThreadId '<verified-chat-UUID>' -PipePath '<verified-local-pipe>' -AllLocal
```

Add `-AllowSend` only when authorized. Never run the placeholder values. Use `Get-FileHash -Algorithm SHA256` to check the downloaded ZIP against the release's checksum file.

For **source development**, install Node 24+ and run:

```powershell
npm ci
npm test
npm run build
```

The builder copies the Node executable used to run it and writes a new bundle under `dist/`. It uses the checked-in upstream license for Node 26.7.0; other runtime versions require a successful download of their exact upstream license. Run binding/install scripts from that built bundle. To use source directly instead, a verified `bridge.local.json` may be loaded by `node server.mjs`; set `CODEX_DESKTOP_BRIDGE_CONFIG` only if intentionally selecting a different config file. The environment variable retains its old name for compatibility.
