# Contributing

Thanks for improving Pi File Discovery.

## Prerequisites

- Node.js 22.19 or newer
- npm
- ripgrep (`rg`) on `PATH`

## Setup

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The deterministic suite must remain credential-free and must not inspect files outside its temporary fixtures.

## Making changes

- Keep discovery focused on unfamiliar, multi-hypothesis candidate-file research; routine known-file and known-symbol lookup belongs to `read` or narrow `rg`.
- Preserve explicit literal/regex query modes and scoped completeness reporting.
- Treat optional filters as advisory noise reduction, not access control.
- Add focused regression coverage for behavior or contract changes.
- Update the README when user-facing behavior changes.
- Keep unreleased changes under `## Unreleased` in `CHANGELOG.md`; version only when preparing a release.
- Do not commit generated eval results.

## Validation

Run:

```bash
npm test
npm pack --dry-run
```

Review the complete tarball inventory for credentials, machine-specific paths, private repository content, generated results, and unintended files. Behavioral evals can incur provider cost and are not part of the default test suite; follow `evals/using-file-discovery/README.md` before running them.

## Pull requests

Keep pull requests focused. Describe the behavior changed, compatibility considerations, tests and platforms actually run, and checks intentionally skipped.

For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.
