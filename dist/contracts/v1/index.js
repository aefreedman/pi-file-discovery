import { createCapabilityRegistry, } from "@aefree/pi-capability-registry";
export const FILE_DISCOVERY_CONTRACT_VERSION_V1 = 1;
export const FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1 = "@aefree/pi-file-discovery/filters/v1";
export const FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1 = "@aefree/pi-file-discovery/services/v1";
export function createFileDiscoveryFilterRegistryV1() { return createCapabilityRegistry({ registryKey: FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1, contractVersion: 1, compatibleVersions: [1], validate: assertFileDiscoveryFilterV1 }); }
export function createFileDiscoveryServiceRegistryV1() { return createCapabilityRegistry({ registryKey: FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1, contractVersion: 1, compatibleVersions: [1], validate: assertFileDiscoveryServiceV1 }); }
export function resolveFileDiscoveryFiltersV1(scope, registry = createFileDiscoveryFilterRegistryV1()) { return resolveContracts(scope, registry, false); }
export function resolveFileDiscoveryServiceV1(scope, registry = createFileDiscoveryServiceRegistryV1()) { return resolveContracts(scope, registry, true); }
export function assertFileDiscoveryExecutionContextV1(value) {
    const valueObject = object(value, "FileDiscoveryExecutionContextV1");
    nonEmpty(valueObject.cwd, "cwd");
    if (valueObject.requestId !== undefined)
        nonEmpty(valueObject.requestId, "requestId");
    if (valueObject.signal === null || typeof valueObject.signal !== "object" || typeof valueObject.signal.aborted !== "boolean" || typeof valueObject.signal.addEventListener !== "function")
        fail("signal must be an AbortSignal");
}
export function assertFileDiscoveryRequestV1(value) {
    const request = object(value, "FileDiscoveryRequestV1");
    if (!Array.isArray(request.queries) || request.queries.length < 1 || request.queries.length > 8)
        fail("queries must contain 1..8 entries");
    for (const candidate of request.queries) {
        const query = object(candidate, "FileDiscoveryQueryV1");
        boundedString(query.pattern, "query.pattern", 2000);
        if (query.id !== undefined)
            boundedString(query.id, "query.id", 80);
        if (query.mode !== "literal" && query.mode !== "regex")
            fail("query.mode is required and must be 'literal' or 'regex' (for example, { pattern: 'needle', mode: 'literal' })");
        if (query.caseSensitive !== undefined && typeof query.caseSensitive !== "boolean")
            fail("query.caseSensitive must be boolean");
    }
    optionalString(request.workspaceRoot, "workspaceRoot", 4096);
    if (request.roots !== undefined)
        boundedArray(request.roots, "roots", 1, 10, 4096);
    if (request.globs !== undefined)
        boundedArray(request.globs, "globs", 0, 20, 300);
    if (request.includeHidden !== undefined && typeof request.includeHidden !== "boolean")
        fail("includeHidden must be boolean");
    if (request.filterMode !== undefined && request.filterMode !== "recommended" && request.filterMode !== "native-only")
        fail("filterMode must be 'recommended' or 'native-only'");
    optionalInteger(request.maxCandidates, "maxCandidates", 1, 20);
    optionalInteger(request.maxExcerptsPerCandidate, "maxExcerptsPerCandidate", 1, 5);
    if (request.outputMode !== undefined && request.outputMode !== "compact" && request.outputMode !== "detailed")
        fail("outputMode must be 'compact' or 'detailed'");
    optionalInteger(request.maxMatches, "maxMatches", 1, 1000);
    optionalInteger(request.maxMatchesPerFile, "maxMatchesPerFile", 1, 1000);
    optionalInteger(request.maxSnippetChars, "maxSnippetChars", 80, 4000);
    optionalInteger(request.timeoutSecondsPerSearch, "timeoutSecondsPerSearch", 1, 120);
}
export function assertFileDiscoveryFilterV1(value) { const record = contract(value, "file-discovery-filter"); if (typeof record.evaluate !== "function")
    fail("FileDiscoveryFilterV1.evaluate must be a function"); }
export function assertFileDiscoveryServiceV1(value) { const record = contract(value, "file-discovery-service"); if (typeof record.search !== "function")
    fail("FileDiscoveryServiceV1.search must be a function"); }
export function assertFileDiscoveryFilterResultV1(value) {
    const result = object(value, "FileDiscoveryFilterResultV1");
    if (result.outcome === "not_applicable")
        return;
    if (result.outcome === "unavailable" || result.outcome === "error") {
        boundedString(result.code, "filter code", 100);
        if (typeof result.retryable !== "boolean")
            fail("filter retryable must be boolean");
        return;
    }
    if (result.outcome !== "applied" || !Array.isArray(result.roots) || result.roots.length > 10)
        fail("filter result must contain at most 10 roots");
    for (const entry of result.roots) {
        const root = object(entry, "FileDiscoveryFilterRootV1");
        boundedString(root.root, "filter root", 4096);
        boundedArray(root.disclosures, "filter disclosures", 0, 32, 1000);
        if (root.filterDecision !== "applied" && root.filterDecision !== "bypassed")
            fail("filterDecision is required and must be 'applied' or 'bypassed'");
        if (root.decisionCode !== undefined)
            boundedString(root.decisionCode, "filter decisionCode", 100);
        if (root.filterBoundary !== undefined)
            boundedString(root.filterBoundary, "filterBoundary", 4096);
        if (root.excludeGlobs !== undefined)
            boundedArray(root.excludeGlobs, "excludeGlobs", 0, 64, 300);
        if (root.ignoreFiles !== undefined) {
            boundedArray(root.ignoreFiles, "ignoreFiles", 0, 16, 4096);
            if (root.ignoreFiles.length && root.filterBoundary === undefined)
                fail("filterBoundary is required with ignoreFiles");
        }
    }
}
export function assertFileDiscoveryResultV1(value) { const result = object(value, "FileDiscoveryResultV1"); if (typeof result.text !== "string")
    fail("result.text must be string"); object(result.details, "result.details"); const provenance = object(result.provenance, "provenance"); if (provenance.schema !== "@aefree/pi-file-discovery/execution-provenance" || provenance.version !== 1)
    fail("provenance schema/version mismatch"); }
export function freezeFileDiscoveryResultV1(value) { assertFileDiscoveryResultV1(value); return Object.freeze({ ...value, details: Object.freeze({ ...value.details }), provenance: Object.freeze({ ...value.provenance }) }); }
function resolveContracts(scope, registry, exclusive) { const catalog = registry.catalog(scope); const records = registry.snapshotCompatible(scope); const ids = records.map((record) => record.id).sort(); const duplicate = ids.some((id, index) => id === ids[index - 1]) || (exclusive && records.length > 1); const incompatible = catalog.versions.some((entry) => !entry.compatible && entry.count > 0); if (!duplicate && !incompatible && records.length)
    return Object.freeze({ outcome: "available", records, catalog }); return Object.freeze({ outcome: duplicate ? "duplicate" : incompatible ? "incompatible" : "missing", code: duplicate ? "duplicate_registration" : incompatible ? "incompatible_contract" : "missing_registration", expectedContractVersion: 1, registryKey: registry.registryKey, providerIds: Object.freeze(ids), catalog }); }
function contract(value, kind) { const record = object(value, kind); if (record.contractVersion !== 1 || record.kind !== kind)
    fail(`${kind} contractVersion/kind mismatch`); boundedString(record.id, "id", 200); const owner = object(record.owner, "owner"); boundedString(owner.packageName, "owner.packageName", 200); boundedString(owner.packageVersion, "owner.packageVersion", 100); boundedString(owner.packageRoot, "owner.packageRoot", 4096); boundedString(owner.registeredBy, "owner.registeredBy", 4096); return record; }
function object(value, label) { if (value === null || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object`); return value; }
function nonEmpty(value, label) { if (typeof value !== "string" || !value.trim())
    fail(`${label} must be non-empty`); }
function boundedString(value, label, max) { nonEmpty(value, label); if (value.length > max || /[\0\r\n]/.test(value))
    fail(`${label} is invalid`); }
function optionalString(value, label, max) { if (value !== undefined)
    boundedString(value, label, max); }
function boundedArray(value, label, min, max, itemMax) { if (!Array.isArray(value) || value.length < min || value.length > max)
    fail(`${label} has invalid length`); for (const item of value)
    boundedString(item, label, itemMax); }
function optionalInteger(value, label, min, max) { if (value !== undefined && (!Number.isInteger(value) || value < min || value > max))
    fail(`${label} must be integer ${min}..${max}`); }
function fail(message) { throw new TypeError(message); }
//# sourceMappingURL=index.js.map