# File-discovery behavioral eval

This package-owned, opt-in eval measures when `using-file-discovery` selects `discover_candidate_files` and whether its observable requests respect the skill's bounded-research rules. It is separate from `npm test`: it runs a model and can incur provider cost.

## Coverage

The cases are synthetic regressions for unfamiliar ownership, multiple hypotheses, cross-root research, broad Unity filtering, exact `Library/PackageCache` and filtered-root intent, scoped absence, fair match allocation, and degraded filters. Failure controls cover omitted mode and invalid regex. Adjacent negative controls cover known files, known symbols, post-edit confirmation, project artifacts, package references, explanation-only requests, and narrow literal search.

Checks use tool arguments and structured tool results where possible: mode declarations, roots, fair six-cell coverage, filter decisions, invalid-regex status, compact output under 8,000 characters, no fixture mutation, and bounded calls. They do not require one exact sequence of valid reads.

## Isolation and execution bounds

Every trial copies a small synthetic fixture to a new temporary workspace. The runner closes stdin, disables project context files, disables auto-loaded extensions and skills, then explicitly loads only this package's reviewed read-only discovery extension plus a synthetic eval filter. `bash`, `edit`, and `write` are unavailable to keep the trial focused; this restriction does not control agent access outside the eval.

The runner writes only `latest-results.json`, which is ignored by Git and npm. Raw answers, stderr, and event traces are excluded by default; use `--include-raw` or `--include-events` only for short local diagnosis and remove the result afterward.

## Run

```bash
npm run eval:using-file-discovery
npm run eval:using-file-discovery -- --condition available --cases unfamiliar-ownership --trials 1
npm run eval:using-file-discovery -- --condition all --cases unfamiliar-ownership,known-file-negative --trials 3
```

A one-trial available/baseline comparison is a pilot only. Compare per-case outcomes, trigger evidence, tool-call counts, and cost before drawing reliability conclusions; a passing baseline is useful evidence, not an eval failure.
