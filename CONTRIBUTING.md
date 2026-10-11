# Contributing

Small, reproducible improvements are welcome. Start with an issue describing the user outcome, affected client/platform versions and sanitized reproduction steps. Keep changes focused; avoid unrelated refactors or new broad permissions.

## Develop

Use Node 24+ with npm. Run `npm ci` and `npm test`. `npm run build` requires Windows x64 and produces a fresh self-contained folder under `dist/`. Use a separate harmless test chat for any live write validation, with explicit authorization. Tests must not send to real business chats automatically.

## Pull requests

- Describe the concrete before/after behavior and which users it affects.
- Include relevant verification results and what remains untested.
- Keep read-only defaults, explicit scope and submission deduplication intact.
- Do not commit local configuration, endpoints, chat IDs, logs, databases, `state/`, dependencies or runtime binaries.
- For screenshots, use only controlled demo content and inspect the entire image for private information.

The client server name `codex_desktop` and `CODEX_DESKTOP_BRIDGE_CONFIG` remain for compatibility. A change to them needs an explicit migration plan.

欢迎中文反馈与贡献。请描述实际使用问题、版本和脱敏复现方式；真实写入测试只在获明确授权的测试聊天中进行。
