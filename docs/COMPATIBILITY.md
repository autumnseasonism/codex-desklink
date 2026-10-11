# Verified scope / 验证范围

## Integration boundary

DeskLink connects through the desktop's bundled `codex-app-tools` MCP server and a Windows local named pipe. All-local browsing reads `state_5.sqlite` **read-only** and version-specific project metadata. No direct database write is used to send, create or restore chats: those operations go through the desktop tools.

This is **not an official stable external API**. App updates can change the endpoint, tool responses or local metadata schema. A successful MCP helper startup alone does not prove desktop connectivity: `bridge_status` also reads the authorized caller chat. No general cross-version support guarantee is made.

底层依赖桌面内置工具和本机通信管道。全本机目录以只读方式访问已验证版本的索引；发送、新建与归档恢复通过桌面工具执行，不直接改数据库。接口可能随升级变化，连接检查会实际读取已授权聊天，不仅检查辅助进程启动。

## Observed verification

The initial development tests took place on **2026-10-11**, Windows x64, Node **26.7.0**, PI **1.1.0**, Claude Code **2.1.296**, and bundled Codex app tools **0.1.6**. That last number identifies the bundled tool package, not the desktop app release. The exact desktop app release was not captured; compatibility with arbitrary desktop versions is **unknown**.

| Scenario | Observed result | Limit |
| :-- | :-- | :-- |
| Unit and MCP-boundary tests | 14 tests passed | Includes fake desktop/SQLite fixtures; not a substitute for live checks |
| Local catalog pagination | 20 saved projects; 122 unique local main chats, including 16 archives, over 7 pages | Counts describe the test snapshot only; catalog can change during pagination |
| PI idle-chat continuation | Message accepted; reply visible in the original desktop test chat | Controlled short text task |
| PI local chat creation | Created test chat and reply visible in Codex desktop | Explicitly enabled local scope; default remains off |
| PI + Claude archive restore and follow-up | Restored test chat and received reply in the original desktop chat | Explicit restore authorization |
| Self-contained package in a path containing spaces | Real PI and Claude read connection status and an existing completed result | Read-only checks; no new submissions during relocation checks |
| Install scripts | Both dry runs passed; PI local package install passed with isolated settings | Persistent Claude user registration and another clean computer remain unverified |

The [desktop screenshot](assets/desktop-replies.png) shows the controlled PI/Claude reply checks. Private chat IDs, original raw event logs and personal configuration are intentionally not distributed. These are bounded local observations, not a claim of universal compatibility.

## Still unverified or excluded

- Claude Desktop GUI, cloud Codex and ChatGPT conversations.
- macOS/Linux desktop integration and other computers/desktop releases.
- Long-running tasks, approval/input waits and error recovery across app updates.
- Exact association between one submission and its result with concurrent senders: the result tool reads the latest turn.
- Guaranteed catalog snapshot consistency while chats are actively added or reordered.
- Existing global hook failures. DeskLink does not install or repair hooks.

归档恢复会改变该聊天的归档状态；向运行中的聊天发消息可能影响正在执行的任务。成功回执只表示桌面接受消息，不表示已完成。请先在无业务副作用的测试聊天中核验自己的环境。
