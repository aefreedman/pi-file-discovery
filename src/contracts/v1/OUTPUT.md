# Candidate discovery native output v1

Design bounds recorded before adapter wiring. `DiscoverCandidateFilesOutputSchemaV1` is the closed public schema, exported from contracts/v1. Canonical service observations are additive; existing text/details/provenance and core/provider interfaces remain valid.

| Channel/fact | Ceiling and policy | Classification |
| --- | --- | --- |
| Queries / roots / cells | 8 / 10 / 80; never omit diagnostic cells | domain + resource |
| Query pattern / ID | 2,000 / 80 UTF-16 units; exact normalized producer ID | domain |
| Published workspace, requested/root/diagnostic/candidate/excerpt paths | 4,096 units; reject oversized admitted references, never clip | identity |
| Candidates / excerpts | 20 / 5 per candidate; native observed totals, returned and omitted counts | domain + presentation |
| Excerpt text | producer 300 units; producer records clipping | resource + presentation |
| Root exclusions / disclosures / decision codes | 32 x 300 / 8 x 500 / 32 x 100; omitted counts; descriptions clipped explicitly | presentation |
| Providers / fallbacks | 32 each; exact provider ID 200, package name 200, version 100, code 100; fallback descriptions 500; omitted counts | presentation |
| Native compact JSON | 65,536 UTF-8 bytes; bounded contract failure on overflow | presentation |
| Direct report | existing 8,000 units, plus host truncation at 32,768 bytes; independent report truncation flag | presentation |
| Whole returned wrapper | 131,072 compact JSON UTF-8 bytes including content/details/DTO/isError; overflow replaces wrapper with bounded failure | presentation |

Existing subprocess ceilings remain: 100 matches, 20 per file, 300 snippet units, 1–120 seconds per cell/provider, 8,000 stderr units, 1,000,000 pending JSON units and ignore-file bytes. No retries, wider scanning or new tool activation.

Completed matched/no_matches cells are usable observations. A matrix containing a completed cell or retained partial matches is `ok:true`, even with incomplete coverage. Cells reaching the per-file cap conservatively report `partial_limit` (more matches may exist). `ranCellCount` counts attempted cells, including launch errors, not proof that a subprocess completed. All-failed/blocked searches are `ok:false` with the full bounded observation. Only completed no_matches cells establish scoped absence. Validation, unavailable service, launch and cancellation failures produce safe `ok:false` and native `isError:true`; host argument validation/block/throw without a DTO may reject. After admitted search work, launch/cancellation failures preserve the observed matrix, mark remaining cells `not_run_failure`, and retain existing rejected core/service behavior through additive error evidence. Early failures without admitted facts have no observation. Projection/schema/identity/byte failures do not claim empty search or replay work. Discovery performs no user-file writes; optional provider/native fallback behavior is unchanged.

Search coverage, observed candidate/excerpt omission, snippet clipping, projection omissions/clipping, core report truncation and host presentation truncation are independent. Totals describe retained search evidence, not undiscovered filesystem matches. Paths are deliberate search references. Private registry owner locations, executable/argv, raw stderr and arbitrary provider data are not DTO fields. Query/excerpt/disclosure text can be sensitive; bounded disclosure is not a secret-absence guarantee.

Codemode receives the DTO directly. `ctx.executeTool` returns a host outcome wrapper: inspect its status/result before checking DTO `ok`. Small whole-value printing is valid; selective emission is optional:

```js
const r = await tools.discover_candidate_files({queries:[{pattern:'ownership',mode:'literal'}]});
text(r.ok ? {paths:r.observation.candidates.map(c=>c.path),coverage:r.observation.coverage} : r.error);
```

Producer validation ends at the adapter. Hooks may change/drop the DTO. Ordinary persisted tool results do not preserve this execution channel; no DTO duplication into details or restoration of redacted values is performed.

The public schema uses the existing TypeBox library as a declared production dependency, so standalone contracts/core/service imports do not require optional Pi peers. Ripgrep prerequisite failure retains a safe actionable installation/configuration message, never the configured executable path.
