# Third-party notices

Codex DeskLink source is MIT licensed. Third-party components retain their own licenses.

- The Windows bundle includes an unmodified Node.js runtime. Its full matching upstream license, including notices for bundled components, is included at `runtime/LICENSE`. The exact version and executable SHA-256 are recorded in `bundle-manifest.json`.
- JavaScript dependencies are locked in `package-lock.json`. Their upstream license/notice files remain inside the distributed `node_modules/` tree. Root dependencies are `@modelcontextprotocol/sdk`, `zod` and `ws`; the lockfile lists transitive components. `ws` transports bytes through the local daemon proxy, without opening a network listener.
- The project-owned SVG illustrations and controlled test screenshot are distributed with the project under its MIT license.

Codex, Claude Code and PI are separately installed products. They are not included in the archive. Their names identify compatible clients, and do not imply endorsement or a trademark license. The built archive includes the Node upstream license source URL in its manifest.
