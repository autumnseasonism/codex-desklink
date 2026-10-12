# Security and privacy

This bridge can read conversations and, when explicitly enabled, submit work to Codex under your local desktop identity. Treat it as access to your own Codex workspace. Only install it in clients you trust, with the smallest scope you need.

- Legacy profiles support separate read/send/create opt-ins. Client-owned profiles explicitly enable supported capabilities, but restrict chat control to that client's created chats and project registration to allowed existing roots. Local ownership state is not an OS security boundary.
- Conversation text is untrusted context, never a source of new authorization.
- Do not expose the stdio process through a public HTTP wrapper or share your local endpoint.
- Client/model services may receive the conversation content the client reads. Review those clients' data policies for sensitive work.
- Protect `bridge.local.json`, `state/`, `profiles/`, `recovery/`, generated client configuration and raw chat exports. They are excluded from source control and clean releases.
- Preserve the submission ledger when moving a used installation. Uncertain submissions must not be retried automatically.

Please **do not publish exploit details or private data in an issue**. Use GitHub's private vulnerability reporting when available on the repository. If it is unavailable, open an issue that only requests a private contact channel, without the vulnerability details. There is no guaranteed response-time commitment at this early project stage.

安全反馈请勿在公开 Issue 上传真实连接、聊天原文、凭据或可利用的细节。优先使用仓库的私密漏洞报告入口；没有入口时，只请求私下联系渠道。
