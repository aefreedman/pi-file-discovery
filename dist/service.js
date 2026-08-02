import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { createFileDiscoveryFilterRegistryV1, freezeFileDiscoveryResultV1, resolveFileDiscoveryFiltersV1 } from "./contracts/v1/index.js";
import { executeFileDiscoveryV1, formatFileDiscoveryReportV1 } from "./core/file-discovery.js";
export const DISCOVER_CANDIDATE_FILES_TOOL_NAME = "discover_candidate_files";
export const FILE_DISCOVERY_SERVICE_ID = "file-discovery.ripgrep";
export const FILE_DISCOVERY_PACKAGE_NAME = "@aefree/pi-file-discovery";
export async function loadFileDiscoveryOwnerV1(moduleUrl = import.meta.url) {
    const registeredBy = fileURLToPath(moduleUrl);
    const packageRoot = await realpath(fileURLToPath(new URL("../", moduleUrl)));
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    if (manifest.name !== FILE_DISCOVERY_PACKAGE_NAME || typeof manifest.version !== "string" || !manifest.version.trim())
        throw new Error(`Invalid ${FILE_DISCOVERY_PACKAGE_NAME} package identity at ${packageRoot}.`);
    return Object.freeze({ packageName: FILE_DISCOVERY_PACKAGE_NAME, packageVersion: manifest.version, packageRoot, registeredBy });
}
export async function createFileDiscoveryServiceV1(owner) {
    const resolvedOwner = owner ?? await loadFileDiscoveryOwnerV1();
    return Object.freeze({ contractVersion: 1, id: FILE_DISCOVERY_SERVICE_ID, kind: "file-discovery-service", owner: resolvedOwner,
        async search(context, request) {
            const binding = boundInvocation(context);
            if (!binding)
                throw new Error("File discovery execution context is not bound to the current Pi session.");
            const resolved = resolveFileDiscoveryFiltersV1(binding.scope, createFileDiscoveryFilterRegistryV1());
            const filters = resolved.outcome === "available" ? resolved.records : [];
            const core = await executeFileDiscoveryV1(Object.freeze({ ...context, cwd: binding.cwd }), request, filters);
            const registrationDegradation = resolved.outcome === "incompatible" || resolved.outcome === "duplicate" ? Object.freeze({ outcome: resolved.outcome, code: resolved.code, providerIds: resolved.providerIds }) : undefined;
            const reportedFilterDecisions = registrationDegradation === undefined ? core.filterDecisions : Object.freeze([...core.filterDecisions, Object.freeze({ scope: "provider", decision: "degraded", target: "filter registration", code: registrationDegradation.code, disclosures: Object.freeze([]) })]);
            const reportedCore = registrationDegradation === undefined ? core : Object.freeze({ ...core, filterDecisions: reportedFilterDecisions, filters: Object.freeze({ ...core.filters, filteringDegraded: true, registrationDegradation, decisions: reportedFilterDecisions }) });
            const providers = core.providerOutcomes.map((outcome) => { const filter = filters.find((entry) => entry.id === outcome.providerId); return Object.freeze({ providerId: outcome.providerId, packageName: filter?.owner.packageName ?? "unknown", packageVersion: filter?.owner.packageVersion ?? "unknown", contractVersion: 1, decision: outcome.decision }); });
            const degraded = core.providerOutcomes.filter((entry) => entry.decision === "degraded");
            const fallbacks = resolved.outcome === "missing" ? [{ code: resolved.code, action: "not_needed", summary: "No optional file-discovery filters were registered; native ignore behavior was used." }] : registrationDegradation ? [{ code: registrationDegradation.code, action: "degraded", summary: `Optional filter registration is ${registrationDegradation.outcome}; native discovery continued.` }] : degraded.map((entry) => ({ code: entry.code ?? "filter_error", action: "degraded", summary: `Optional filter '${entry.providerId}' was skipped; native ignore behavior continued.` }));
            return freezeFileDiscoveryResultV1({ text: formatFileDiscoveryReportV1(reportedCore), details: { completeness: core.completeness, workspaceRoot: core.workspaceRoot, requestedRoots: core.requestedRoots, rootDiagnostics: core.rootDiagnostics, queries: core.queries, roots: core.roots, cells: core.cells, candidates: core.candidates, coverage: core.coverage, filters: reportedCore.filters, providerOutcomes: core.providerOutcomes, filterDecisions: reportedCore.filterDecisions, retrySuggestions: core.retrySuggestions, truncated: false }, provenance: { schema: "@aefree/pi-file-discovery/execution-provenance", version: 1, canonical: canonicalOwner(resolvedOwner.packageVersion), providers, fallbacks } });
        },
    });
}
function canonicalOwner(packageVersion) { return { serviceId: FILE_DISCOVERY_SERVICE_ID, packageName: FILE_DISCOVERY_PACKAGE_NAME, packageVersion, contractVersion: 1 }; }
const FILE_DISCOVERY_INVOCATION_SCOPES_SYMBOL_V1 = Symbol.for("@aefree/pi-file-discovery/invocation-scopes/v1");
const state = globalThis;
function scopes(create) { const current = state[FILE_DISCOVERY_INVOCATION_SCOPES_SYMBOL_V1]; if (current || !create)
    return current; const next = new WeakMap(); state[FILE_DISCOVERY_INVOCATION_SCOPES_SYMBOL_V1] = next; return next; }
export function bindFileDiscoveryScopeV1(context, scope) { scopes(true).set(context, Object.freeze({ scope, cwd: resolve(context.cwd) })); return context; }
function boundInvocation(context) { return scopes(false)?.get(context); }
//# sourceMappingURL=service.js.map