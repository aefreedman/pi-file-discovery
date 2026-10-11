import { Type } from "typebox";
import { Check } from "typebox/value";
export const DISCOVERY_OUTPUT_LIMITS_V1 = Object.freeze({ nativeBytes: 65_536, responseBytes: 131_072, presentationBytes: 32_768 });
const obj = (properties) => Type.Object(properties, { additionalProperties: false });
const str = (maxLength) => Type.String({ maxLength });
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const path = str(4096);
const arr = (items, maxItems) => Type.Array(items, { maxItems });
const decision = Type.Union([Type.Literal("applied"), Type.Literal("bypassed"), Type.Literal("skipped"), Type.Literal("degraded")]);
const status = Type.Enum({ matched: "matched", no_matches: "no_matches", partial_limit: "partial_limit", invalid_regex: "invalid_regex", timeout: "timeout", error: "error", not_run_global_limit: "not_run_global_limit", root_unavailable: "root_unavailable", cancelled: "cancelled", not_run_failure: "not_run_failure" });
const excerpt = obj({ path, line: count, column: Type.Optional(count), text: str(300), textTruncated: Type.Optional(Type.Boolean()) });
const candidate = obj({ path, queryIds: arr(str(80), 8), roots: arr(path, 10), matchCount: count, score: count, excerpts: arr(excerpt, 5), excerptsOmitted: count });
const root = obj({ path, displayPath: path, explicitRoot: Type.Boolean(), filterBypassed: Type.Boolean(), filterDecision: decision,
    appliedIgnoreFileCount: count, exclusions: arr(str(300), 32), exclusionsOmitted: count, disclosures: arr(str(500), 8), disclosuresOmitted: count,
    decisionCodes: arr(str(100), 32), decisionCodesOmitted: count });
const provider = obj({ providerId: str(200), packageName: str(200), packageVersion: str(100), contractVersion: Type.Literal(1), decision, outcome: Type.Optional(Type.Enum({ applied: "applied", not_applicable: "not_applicable", unavailable: "unavailable", error: "error", skipped: "skipped" })), code: Type.Optional(str(100)) });
const fallback = obj({ code: str(100), action: Type.Union([Type.Literal("used"), Type.Literal("not_needed"), Type.Literal("degraded")]), summary: str(500) });
const limits = obj({ maxMatches: count, maxMatchesPerFile: count, maxSnippetChars: count });
const observation = obj({
    workspaceRoot: path, requestedRoots: arr(path, 10),
    queries: arr(obj({ id: str(80), pattern: str(2000), mode: Type.Union([Type.Literal("literal"), Type.Literal("regex")]), caseSensitive: Type.Optional(Type.Boolean()) }), 8),
    rootDiagnostics: arr(obj({ requestedRoot: path, path, displayPath: path, status: Type.Literal("root_unavailable"), message: str(500) }), 10),
    roots: arr(root, 10),
    cells: arr(obj({ queryId: str(80), root: path, status, matchCount: count, filterDecision: decision, appliedIgnoreFileCount: count,
        exitCode: Type.Optional(Type.Union([Type.Integer(), Type.Null()])) }), 80),
    candidates: arr(candidate, 20), candidateCount: obj({ total: count, returned: count, omitted: count }),
    coverage: obj({ ranCellCount: count, completeCellCount: count, incompleteCellCount: count, negativeEvidenceCellCount: count }),
    completeness: Type.Union([Type.Literal("complete"), Type.Literal("partial"), Type.Literal("blocked")]),
    filters: obj({ mode: Type.Union([Type.Literal("recommended"), Type.Literal("native-only")]), filteringDegraded: Type.Boolean(), explicitRootOverride: Type.Boolean(),
        nativeIgnore: Type.Literal(true), followsSymlinks: Type.Literal(false), binaryFiles: Type.Literal("skipped"), includeHidden: Type.Boolean(), globs: arr(str(300), 20), effective: limits,
        requested: obj({ maxMatches: Type.Optional(count), maxMatchesPerFile: Type.Optional(count), maxSnippetChars: Type.Optional(count) }),
        registrationDegradation: Type.Optional(obj({ outcome: Type.Union([Type.Literal("incompatible"), Type.Literal("duplicate")]), code: str(100) })) }),
    provenance: obj({ canonical: obj({ serviceId: str(200), packageName: str(200), packageVersion: str(100), contractVersion: Type.Literal(1) }),
        providers: arr(provider, 32), providersOmitted: count, fallbacks: arr(fallback, 32), fallbacksOmitted: count }),
    projection: obj({ clippedTextCount: count, searchLimited: Type.Boolean() }),
    presentation: obj({ reportTruncated: Type.Boolean(), hostTruncated: Type.Boolean() }),
});
const identity = { schema: Type.Literal("@aefree/pi-file-discovery/discover-candidate-files"), version: Type.Literal(1), operation: Type.Literal("discover_candidate_files") };
const error = obj({ code: Type.Enum({ validation_failed: "validation_failed", ripgrep_unavailable: "ripgrep_unavailable", service_unavailable: "service_unavailable", execution_failed: "execution_failed", cancelled: "cancelled", all_failed: "all_failed", output_contract_error: "output_contract_error", response_overflow: "response_overflow" }), message: str(500) });
export const DiscoverCandidateFilesOutputSchemaV1 = Type.Union([
    obj({ ...identity, ok: Type.Literal(true), observation }),
    obj({ ...identity, ok: Type.Literal(false), error, observation: Type.Optional(observation) }),
]);
const header = { schema: "@aefree/pi-file-discovery/discover-candidate-files", version: 1, operation: "discover_candidate_files" };
export function assertDiscoverCandidateFilesOutputV1(value) {
    if (!Check(DiscoverCandidateFilesOutputSchemaV1, value) || jsonUTF8BytesV1(value) > DISCOVERY_OUTPUT_LIMITS_V1.nativeBytes)
        throw new TypeError("Invalid or oversized discovery output contract.");
}
export function jsonUTF8BytesV1(value) { return Buffer.byteLength(JSON.stringify(value), "utf8"); }
export function discoveryFailureV1(code) {
    const messages = { ripgrep_unavailable: "Ripgrep is unavailable. Install rg on PATH or set PI_FILE_DISCOVERY_RG_PATH to an absolute rg executable path, then restart or reload Pi.", validation_failed: "Discovery request validation failed.", service_unavailable: "Discovery service is unavailable for this session; restart or reload Pi.", execution_failed: "Discovery could not execute; no completed absence claim is available.", cancelled: "Discovery cancelled; no completed absence claim is available.", all_failed: "No usable search cells completed; inspect the incomplete matrix.", output_contract_error: "Discovery output could not be safely projected; no absence claim is available.", response_overflow: "Discovery response exceeded its UTF-8 budget; no absence claim is available." };
    const result = { ...header, ok: false, error: { code, message: messages[code] } };
    assertDiscoverCandidateFilesOutputV1(result);
    return result;
}
/** Allowlist canonical observations; never parse text or generic details. */
export function projectDiscoverCandidateFilesOutputV1(result, hostTruncated = false) {
    try {
        const core = result.native;
        if (!core)
            return discoveryFailureV1("output_contract_error");
        let clippedTextCount = 0;
        const descriptive = (value, max) => { if (value.length <= max)
            return value; clippedTextCount++; return value.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, "") + "…"; };
        const exact = (value, max = 4096) => { if (typeof value !== "string" || value.length > max || /[\0\r\n]/.test(value))
            throw new TypeError("Invalid admitted reference"); return value; };
        // Do not inspect unreturned candidate/excerpt references or private filter/owner locations.
        const candidates = core.candidates.slice(0, 20).map(c => ({ path: exact(c.path), queryIds: c.queryIds.map(v => exact(v, 80)), roots: c.roots.map(v => exact(v)), matchCount: c.matchCount, score: c.score,
            excerpts: c.excerpts.slice(0, 5).map(e => ({ path: exact(e.path), line: e.line, ...(e.column === undefined ? {} : { column: e.column }), text: descriptive(e.text, 300), ...(e.textTruncated === undefined ? {} : { textTruncated: e.textTruncated }) })), excerptsOmitted: Math.max(0, c.matchCount - Math.min(c.excerpts.length, 5)) }));
        const totalCandidates = new Set(core.cells.flatMap(c => c.matches.map(m => m.path))).size;
        const f = core.filters;
        const providers = result.provenance.providers.slice(0, 32).map(p => {
            const native = core.providerOutcomes.find(v => v.providerId === p.providerId);
            return { providerId: exact(p.providerId, 200), packageName: exact(p.packageName, 200), packageVersion: exact(p.packageVersion, 100), contractVersion: p.contractVersion, decision: p.decision,
                ...(native === undefined ? {} : { outcome: native.outcome, ...(native.code === undefined ? {} : { code: exact(native.code, 100) }) }) };
        });
        const fallbacks = result.provenance.fallbacks.slice(0, 32).map(p => ({ code: exact(p.code, 100), action: p.action, summary: descriptive(p.summary, 500) }));
        const observed = {
            workspaceRoot: exact(core.workspaceRoot), requestedRoots: core.requestedRoots.map(p => exact(p)),
            queries: core.queries.map(q => ({ id: exact(q.id, 80), pattern: q.pattern, mode: q.mode, ...(q.caseSensitive === undefined ? {} : { caseSensitive: q.caseSensitive }) })),
            rootDiagnostics: core.rootDiagnostics.map(d => ({ requestedRoot: exact(d.requestedRoot), path: exact(d.path), displayPath: exact(d.displayPath), status: d.status, message: descriptive(d.message, 500) })),
            roots: core.roots.map(r => ({ path: exact(r.path), displayPath: exact(r.displayPath), explicitRoot: r.explicitRoot, filterBypassed: r.filterBypassed, filterDecision: r.filterDecision, appliedIgnoreFileCount: r.ignoreFiles.length,
                exclusions: r.exclusions.slice(0, 32), exclusionsOmitted: Math.max(0, r.exclusions.length - 32), disclosures: r.disclosures.slice(0, 8).map(v => descriptive(v, 500)), disclosuresOmitted: Math.max(0, r.disclosures.length - 8),
                decisionCodes: r.filterDecisionCodes.slice(0, 32).map(v => exact(v, 100)), decisionCodesOmitted: Math.max(0, r.filterDecisionCodes.length - 32) })),
            cells: core.cells.map(c => ({ queryId: exact(c.queryId, 80), root: exact(c.root), status: c.status, matchCount: c.matches.length, filterDecision: c.filterDecision, appliedIgnoreFileCount: c.appliedIgnoreFiles.length, ...(c.exitCode === undefined ? {} : { exitCode: c.exitCode }) })),
            candidates, candidateCount: { total: totalCandidates, returned: candidates.length, omitted: Math.max(0, totalCandidates - candidates.length) },
            coverage: { ...core.coverage }, completeness: core.completeness,
            filters: { mode: f.mode, filteringDegraded: f.filteringDegraded, explicitRootOverride: f.explicitRootOverride, nativeIgnore: true, followsSymlinks: false, binaryFiles: "skipped",
                includeHidden: f.includeHidden, globs: f.globs, effective: { ...f.effective }, requested: Object.fromEntries(Object.entries(f.requested).filter(([, v]) => v !== undefined)),
                ...(f.registrationDegradation === undefined ? {} : { registrationDegradation: { outcome: f.registrationDegradation.outcome, code: exact(f.registrationDegradation.code, 100) } }) },
            provenance: { canonical: { serviceId: exact(result.provenance.canonical.serviceId, 200), packageName: exact(result.provenance.canonical.packageName, 200), packageVersion: exact(result.provenance.canonical.packageVersion, 100), contractVersion: result.provenance.canonical.contractVersion }, providers, providersOmitted: Math.max(0, result.provenance.providers.length - 32), fallbacks, fallbacksOmitted: Math.max(0, result.provenance.fallbacks.length - 32) },
            projection: { clippedTextCount, searchLimited: core.cells.some(c => c.status === "partial_limit" || c.status === "not_run_global_limit") },
            presentation: { reportTruncated: result.reportTruncated ?? false, hostTruncated },
        };
        const usable = !core.failure && core.cells.some(c => c.status === "matched" || c.status === "no_matches" || c.matches.length > 0);
        const output = usable ? { ...header, ok: true, observation: observed } : { ...discoveryFailureV1(core.failure === "cancelled" ? "cancelled" : core.failure === "launch_failed" ? "execution_failed" : "all_failed"), observation: observed };
        assertDiscoverCandidateFilesOutputV1(output);
        return output;
    }
    catch {
        return discoveryFailureV1("output_contract_error");
    }
}
//# sourceMappingURL=output.js.map