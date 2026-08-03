# Changelog

## [0.1.1] - 2026-08-03

### Changed

- Keep candidate-discovery tool results compact by default and expose the full bounded report through Pi's expandable tool view.

## [0.1.0] - 2026-08-02

### Added

- `discover_candidate_files` for bounded candidate-file discovery when repository ownership or implementation paths are unfamiliar.
- Explicit literal and regex query modes, with validation that prevents ambiguous searches from producing false absence evidence.
- Deterministic candidate ranking across multiple hypotheses and roots, with representative excerpts and targeted follow-up read guidance.
- Compact and detailed output modes with per-query and per-root coverage, incomplete-search reporting, and scoped diagnostics.
- Fair search budgets, cancellation handling, process timeouts, and output bounds for predictable discovery calls.
- Optional advisory filters for reducing generated and cache noise during broad searches while preserving explicitly requested roots.
- Package-qualified filter and service contracts for optional integration with other Pi packages.
- The `using-file-discovery` skill with guidance for choosing candidate discovery instead of routine `read` or `rg` lookup.
