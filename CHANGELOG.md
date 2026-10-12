# Changelog

## Unreleased

## [0.2.1] - 2026-10-12

### Fixed

- Declare host-provided TypeBox as a required `"*"` peer instead of a production dependency, avoiding Pi package-loader warnings and duplicate runtime modules; pin the supported host version for development.
- Load the package manifest in actual Pi host tests and reject dependency warnings; retain isolated standalone ESM validation with the required TypeBox peer and add a peer-suppressed packed-host check.

## [0.2.0] - 2026-10-12

### Changed

- Align package-local Pi validation dependencies with latest stable 1.1.0.
- Declare the existing TypeBox schema library as a production dependency for standalone contract/core/service imports; Pi runtime peers remain optional.

### Added

- Closed, versioned native output for `discover_candidate_files`, with exact admitted references, a full scoped diagnostic matrix, bounded candidates/excerpts, filtering provenance, independent omissions/truncation and UTF-8 response budgets.
- Offline scripted-process/adapter regressions and actual Pi 1.1.0 host validation for direct, codemode and nested consumers, errors, hooks and transcript boundaries.

### Fixed

- Preserve launch/cancellation observations without dispatching subsequent cells or replaying searches; reject malformed capture as incomplete rather than scoped absence.
- Disclose possible per-file match-cap truncation and avoid splitting Unicode surrogate pairs in clipped snippets.
- Do not fail the trusted-publishing run on delayed npm visibility after successful publication; retain pre-publish identity validation.

## [0.1.5] - 2026-09-29

### Changed

- Align development, deterministic validation, and supported-baseline documentation with latest stable Pi 0.99.1.
- Pin TypeScript 7.0.2 and local tsx 4.23.15; align Node types with the runtime floor and explicitly include them for compilation.
- Fail closed on npm registry errors and require matching version and commit identity before skipping an existing publication.
- Document authored source and source maps as supported adapter and debugging resources.

## [0.1.4] - 2026-09-21

### Changed

- Update Pi development dependencies and validation baseline to 0.87.0.

## [0.1.3] - 2026-09-20

### Changed

- Updated Pi development dependencies and validation baseline to 0.86.1.

## [0.1.2] - 2026-08-27

### Changed

- Warn once per Pi runtime in UI sessions when ripgrep cannot be resolved or `PI_FILE_DISCOVERY_RG_PATH` is invalid, with a privacy-safe recovery path.

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
