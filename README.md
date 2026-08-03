# @aefree/pi-file-discovery

`discover_candidate_files` is bounded, workspace-aware **candidate-file discovery** for unfamiliar areas of a repository. It tests a small set of hypotheses, ranks files, shows representative excerpts, and recommends a targeted follow-up read.

## Install

Requirements:

- Node.js 22.19 or newer
- [ripgrep](https://github.com/BurntSushi/ripgrep) available on `PATH`, or an absolute executable path in `PI_FILE_DISCOVERY_RG_PATH`
- Pi 0.83 or newer

```bash
pi install npm:@aefree/pi-file-discovery
```

To try the package for one session without installing it:

```bash
pi -e npm:@aefree/pi-file-discovery
```

Restart or reload Pi after changing package configuration. The package contributes the `discover_candidate_files` tool and the `using-file-discovery` skill.

## Choose the right tool

Use this tool when the owning subsystem, implementation path, or several plausible names are unknown:

> I do not know where mission cancellation is owned. Test lifecycle, cancellation, and cleanup hypotheses across runtime and tests.

Use `read` or direct `rg` instead for a known path, known symbol/directory, post-edit confirmation, or one obvious narrow lookup:

> Find references to `MissionRuntime.Dispose` in `src/runtime`.
>
> Read `src/runtime/MissionRuntime.cs` around line 120.

It is not a replacement for `rg`, `read`, `project_artifact_search`, or `read_package_reference`.

## Query and output contract

Each query must explicitly choose `mode: "literal"` or `mode: "regex"`; omitted mode is a validation error and never yields absence evidence. Compact output (the default) contains ranked candidates, bounded excerpts, coverage, incomplete hypotheses, and a next read. `outputMode: "detailed"` adds the bounded query/root status matrix.

```ts
{
  queries: [
    { id: "lifecycle", pattern: "cancellation", mode: "literal" },
    { id: "cleanup", pattern: "Dispose|Cleanup", mode: "regex" }
  ],
  roots: ["src", "tests"],
  maxCandidates: 8,
  outputMode: "compact"
}
```

Candidate ranking is deterministic evidence aggregation: distinct hypotheses, distinct roots, bounded match count, then path order. It is not semantic search. Only fully executed `matched` and `no_matches` cells are complete; `no_matches` is absence evidence only for its completed, actually searched cell. Partial limits, skipped cells, unavailable stale roots, timeouts, invalid regexes, and errors are incomplete. A missing selected-scope root is reported as a scoped diagnostic while other valid roots continue. Normal path resolution plus physical containment keeps a discovery call from accidentally expanding beyond its selected workspace.

## Filtering and execution hygiene

`filterMode` is `"recommended"` by default and `"native-only"` when only native ripgrep ignore behavior is wanted. Optional filters reduce incidental generated/cache noise for broad research. The default report states applied, bypassed, skipped, or degraded decisions structurally and in concise text: for example, Unity broad-root filtering discloses its excluded generated/cache directories, while an exact generated root discloses its bypass. A provider returning `outcome: "applied"` must declare `filterDecision: "applied" | "bypassed"` on every root; missing or invalid decisions reject that provider result, so native discovery continues with degraded filtering. Applied and bypassed report decisions are derived only from those explicit provider declarations. Filter provider failure, timeout, incompatible registration, or duplicate registration is likewise disclosed as degraded filtering and native search continues. A provider-supplied ignore file is used only when it is a readable, bounded regular file within the provider's `filterBoundary`; otherwise that provider data is skipped.

This tool is not a sandbox, permission system, or access-control boundary: an agent can use `read` or Bash instead. Its controls make this discovery call predictable and bounded: it resolves an absolute regular `rg` executable, uses `shell: false` and a deterministic minimal child environment, honors cancellation, and bounds process time and output. An explicit absolute `PI_FILE_DISCOVERY_RG_PATH` is deliberate operator configuration, including one physically inside the workspace. PATH discovery skips workspace-contained candidates to avoid accidental shadowing. Requested workspaces and roots are physically contained in the selected discovery scope after normal path resolution, including symlink or junction resolution, to avoid accidental broad searches.

## Contracts and packaging

Import `@aefree/pi-file-discovery/contracts/v1` for `FileDiscoveryFilterV1` and `FileDiscoveryServiceV1`. Filters use the registry key `@aefree/pi-file-discovery/filters/v1`. Contract imports are side-effect free.

```bash
npm test
npm pack --dry-run
```
