# Open Source Boundary

Tokboard is structured as an open-core project. The public repository is the
local-first product surface that users can inspect, build, run, modify, and
redistribute under Apache-2.0.

This document is a project governance note, not legal advice.

## Open Source Scope

The following parts belong in the public Apache-2.0 repository:

- Local CLI entry point and local background process.
- Local Express API server.
- Read-only adapters for local Claude Code / AI CLI usage logs.
- ccusage integration and local cache logic.
- Dashboard UI, charts, tables, formatting utilities, and browser assets.
- Public documentation, screenshots, release workflow, package metadata, and
  reproducible build configuration.

These parts should stay useful without cloud services, accounts, billing,
remote telemetry, or proprietary infrastructure.

## Closed Source Scope

The following parts should stay outside the public repository unless a future
decision explicitly opens them:

- Hosted SaaS backend, cloud sync, multi-device accounts, and team workspaces.
- Billing, license enforcement, entitlement checks, coupons, trials, and
  commercial packaging logic.
- Enterprise-only connectors, admin policy controls, SSO/SAML, audit export,
  and customer-specific integrations.
- Proprietary scoring algorithms, private prompts, growth experiments, pricing
  strategy, business analytics, and customer research.
- Internal knowledge bases, local AI-agent instructions, task manager state,
  private reference projects, logs, generated reports, and unpublished roadmap
  material.
- Secrets, tokens, private npm/GitHub configuration, customer data, and any
  machine-local paths that reveal private workspace structure.

## Repository Layout Rule

Keep the public repository limited to the OSS distribution. Put commercial code
in a separate private repository or private package, for example:

- `tokboard` public repo: local CLI, local API, local UI, OSS docs.
- `tokboard-commercial` private repo: SaaS backend, billing, enterprise
  modules, private deployments.
- Optional private packages: imported only through stable extension points, not
  required to build or run the public app.

Avoid committing commercial placeholders that reveal private implementation
plans. Public extension interfaces are fine; proprietary implementations should
live elsewhere.

## Release Rule

Before pushing to a public remote, verify:

- `git status --short` contains only intended public files.
- `git ls-files` does not include local instructions, knowledge bases, logs,
  private references, secrets, generated output, or commercial modules.
- `rg -n "(api[_-]?key|secret|password|token|private|license|stripe|customer)"
  -g '!node_modules' -g '!pnpm-lock.yaml'` has no accidental sensitive hits.
- The package metadata and README declare `Apache-2.0`.

If private material has already been pushed to a public repository, assume it
was exposed. Remove it from the current tree immediately, rotate any secrets,
and consider rewriting repository history or creating a clean public repository.
