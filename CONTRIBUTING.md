# Contributing

Thanks for helping make Tokboard better.

Tokboard is intentionally small: a local CLI, local API server, and dashboard
for local usage data. Contributions should preserve that local-first shape.

## Development Setup

```bash
pnpm install
pnpm dev
```

The workspace root forwards common commands to `packages/local-app`.

Before opening a pull request, run:

```bash
pnpm check
```

This builds the package and runs `npm pack --dry-run` from the publish
directory.

## Contribution Guidelines

- Keep privacy behavior local-first and read-only by default.
- Avoid adding telemetry, hosted services, remote calls, or account
  requirements to the OSS app.
- Keep packaging reproducible. Generated `dist/` and `dist-server/` output
  should stay untracked.
- Do not commit local AI-agent files, private knowledge bases, logs, secrets,
  customer data, or commercial modules.
- Prefer small pull requests with a clear problem statement and verification
  notes.

## Open Source Boundary

The public repository contains the Apache-2.0 local app. Commercial SaaS,
billing, enterprise features, private prompts, local knowledge bases, and
customer-specific work should stay outside this repository unless a maintainer
explicitly decides otherwise.

See [docs/OPEN_SOURCE_BOUNDARY.md](docs/OPEN_SOURCE_BOUNDARY.md).

## License

By contributing, you agree that your contribution is licensed under
Apache-2.0.
