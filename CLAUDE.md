# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Release Workflow

The npm publish step is fully automated by GitHub Actions: pushing a tag
of the form `vX.Y.Z` to `origin` triggers the publish job against the
configured registry. **Do not run `npm publish` manually** — the
publish env is not logged in locally, and manual publishing would
duplicate the version.

End-to-end release flow for a new version (e.g. `v2.4.1`):

1. Bump `packages/local-app/package.json` to the new version. The
   workspace-root `package.json` is unrelated and stays untouched.
2. `pnpm build` inside `packages/local-app` to refresh `dist/` and
   `dist-server/`. These are gitignored — never commit them.
3. Commit the source change(s) plus the version bump. **Do not stage**
   `CLAUDE.md` or `.taskmaster/` modifications produced by machine
   hooks (KB bootstrap, LF/CRLF rewrites, etc.) — commit only what you
   authored. Stash unrelated working-copy drift if needed.
4. `git push origin main`.
5. Tag: `git tag -a vX.Y.Z -m "..."`, then `git push origin vX.Y.Z`.
   **The push of the tag is what fires the publish CI.**
6. Confirm the new version is live with
   `npm view token-leaderboard@X.Y.Z` (registry resolves through
   `~/.npmrc` / mirror config) before telling the user it is ready.

If the user asks to release a version, run the full flow without asking
whether to publish — pushing the tag *is* publishing.

<!-- KB-MANAGED:CLAUDE-MD:START — managed by project-knowledge -->
## Knowledge Base Reading Rule

This project's knowledge base lives at:

  D:/SanQian.Xu/knowledge/token-consumption-leaderboard


Before implementing a non-trivial feature or fix in this repo:

1. **Read only the indexes**:
   `D:/SanQian.Xu/knowledge/token-consumption-leaderboard/GOAL.md`, `D:/SanQian.Xu/knowledge/token-consumption-leaderboard/modules/00-index.md`,
   `D:/SanQian.Xu/knowledge/token-consumption-leaderboard/changes/00-index.md`.
2. **Compare** the user request, changed files, API routes, symbols, and
   keywords against the module and change indexes.
3. **Open only the top-relevant** module and change docs based on the match.
4. **No hits? Treat as a new feature area.** Propose a new module + change
   entry instead of patching unrelated knowledge.
5. **Do not load the whole KB** unless explicitly asked.
<!-- KB-MANAGED:CLAUDE-MD:END -->
