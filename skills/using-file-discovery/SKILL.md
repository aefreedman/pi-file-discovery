---
name: using-file-discovery
description: Discover candidate files in unfamiliar repository areas by testing a small, bounded set of explicit literal or regex hypotheses. Do not use for known files, known symbols, or post-edit confirmation.
---

# Using File Discovery

Use `discover_candidate_files` when implementation ownership or likely paths are unknown and several hypotheses must be tested before targeted reads.

Every query requires `mode: "literal"` or `mode: "regex"`. Keep roots and hypotheses bounded; use ranked candidates and excerpts to choose a `read` follow-up. Treat `no_matches` as absence evidence only for completed cells.

Prefer `read` for an exact file/path. Prefer narrow direct `rg` for a known symbol and directory, and for post-edit confirmation. Use `project_artifact_search` for project Markdown artifacts and `read_package_reference` for installed package references.

Broad discovery uses recommended relevance filters. An exact generated/cache root is intentional and can be searched directly; malformed or unavailable provider data is skipped and disclosed while native discovery continues.

This tool is not a sandbox, permission system, or access-control boundary: an agent can use `read` or Bash instead. Physical selected-scope containment, deterministic executable selection, cancellation, and process/output bounds keep this discovery call from becoming accidentally broad, nondeterministic, or wasteful.
