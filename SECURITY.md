# Security Policy

Tokboard is a local-first tool that reads local usage logs and serves a local
dashboard. Security reports are welcome, especially if they involve local file
access, accidental data exposure, package integrity, or command execution.

## Reporting a Vulnerability

Please do not open a public issue for sensitive reports.

Report privately through GitHub Security Advisories when available:

https://github.com/SanQianX/Token-Consumption-Leaderboard/security/advisories/new

If GitHub advisories are unavailable, open a minimal public issue asking for a
private contact path without including exploit details.

## Scope

In scope:

- Local file disclosure beyond intended Claude Code usage logs.
- Unexpected network transmission of local usage data.
- Command injection or unsafe process spawning.
- Package contents that accidentally include private files or stale build
  artifacts.

Out of scope:

- Findings that require already-compromised local administrator access.
- Issues in upstream dependencies unless Tokboard uses them unsafely.
- Public information already intentionally included in the repository.
