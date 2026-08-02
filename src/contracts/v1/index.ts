import {
  createCapabilityRegistry,
  type CapabilityRegistry,
  type RegistryOwner,
  type RegistryRecord,
  type VersionCatalog,
} from "@aefree/pi-capability-registry";

export const FILE_DISCOVERY_CONTRACT_VERSION_V1 = 1 as const;
export const FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1 = "@aefree/pi-file-discovery/filters/v1" as const;
export const FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1 = "@aefree/pi-file-discovery/services/v1" as const;

export interface FileDiscoveryOwnerV1 extends RegistryOwner { readonly packageVersion: string; readonly registeredBy: string; }
/** Context for one bounded discovery call; it does not control agent access to the host. */
export interface FileDiscoveryExecutionContextV1 { readonly cwd: string; readonly requestId?: string; readonly signal: AbortSignal; }
export interface FileDiscoveryQueryV1 { readonly id?: string; readonly pattern: string; readonly mode: "literal" | "regex"; readonly caseSensitive?: boolean; }
export type FileDiscoveryFilterModeV1 = "recommended" | "native-only";
export interface FileDiscoveryRequestV1 {
  readonly queries: readonly FileDiscoveryQueryV1[];
  readonly workspaceRoot?: string;
  readonly roots?: readonly string[];
  readonly globs?: readonly string[];
  readonly includeHidden?: boolean;
  readonly filterMode?: FileDiscoveryFilterModeV1;
  readonly maxCandidates?: number;
  readonly maxExcerptsPerCandidate?: number;
  readonly outputMode?: "compact" | "detailed";
  /** Advanced result controls are clamped to bounded hard caps. */
  readonly maxMatches?: number;
  readonly maxMatchesPerFile?: number;
  readonly maxSnippetChars?: number;
  readonly timeoutSecondsPerSearch?: number;
}

export interface CanonicalExecutionOwnerV1 { readonly serviceId: string; readonly packageName: string; readonly packageVersion: string; readonly contractVersion: 1; }
export interface ProviderExecutionProvenanceV1 { readonly providerId: string; readonly packageName: string; readonly packageVersion: string; readonly contractVersion: 1; readonly decision: string; }
export interface FallbackDecisionV1 { readonly code: string; readonly action: "used" | "not_needed" | "degraded"; readonly summary: string; }
export interface FileDiscoveryExecutionProvenanceV1 {
  readonly schema: "@aefree/pi-file-discovery/execution-provenance";
  readonly version: 1;
  readonly canonical: CanonicalExecutionOwnerV1;
  readonly providers: readonly ProviderExecutionProvenanceV1[];
  readonly fallbacks: readonly FallbackDecisionV1[];
}
export interface FileDiscoveryResultV1 { readonly text: string; readonly details: Readonly<Record<string, unknown>>; readonly provenance: FileDiscoveryExecutionProvenanceV1; }

export interface FileDiscoveryFilterRequestV1 { readonly workspaceRoot: string; readonly roots: readonly string[]; readonly includeHidden: boolean; readonly signal: AbortSignal; }
export type FileDiscoveryFilterDecisionV1 = "applied" | "bypassed" | "skipped" | "degraded";
export interface FileDiscoveryFilterRootV1 {
  readonly root: string;
  /** Required provider-declared root decision for every root in an applied result. */
  readonly filterDecision: "applied" | "bypassed";
  /** Stable provider code for its root decision, when useful to consumers. */
  readonly decisionCode?: string;
  /** Provider-declared boundary; supplied ignore files must be readable, bounded regular files within it. */
  readonly filterBoundary?: string;
  readonly excludeGlobs?: readonly string[];
  readonly ignoreFiles?: readonly string[];
  readonly disclosures: readonly string[];
}
export type FileDiscoveryFilterResultV1 =
  | { readonly outcome: "not_applicable" }
  | { readonly outcome: "applied"; readonly roots: readonly FileDiscoveryFilterRootV1[] }
  | { readonly outcome: "unavailable" | "error"; readonly code: string; readonly retryable: boolean };
export interface FileDiscoveryFilterV1 extends RegistryRecord {
  readonly contractVersion: 1; readonly kind: "file-discovery-filter"; readonly owner: FileDiscoveryOwnerV1;
  evaluate(context: FileDiscoveryExecutionContextV1, request: FileDiscoveryFilterRequestV1): Promise<FileDiscoveryFilterResultV1>;
}
export interface FileDiscoveryServiceV1 extends RegistryRecord {
  readonly contractVersion: 1; readonly kind: "file-discovery-service"; readonly owner: FileDiscoveryOwnerV1;
  search(context: FileDiscoveryExecutionContextV1, request: FileDiscoveryRequestV1): Promise<FileDiscoveryResultV1>;
}
export type ContractResolutionV1<T extends RegistryRecord> =
  | { readonly outcome: "available"; readonly records: readonly Readonly<T>[]; readonly catalog: VersionCatalog }
  | { readonly outcome: "missing" | "incompatible" | "duplicate"; readonly code: "missing_registration" | "incompatible_contract" | "duplicate_registration"; readonly expectedContractVersion: 1; readonly registryKey: string; readonly providerIds: readonly string[]; readonly catalog: VersionCatalog };

export function createFileDiscoveryFilterRegistryV1(): CapabilityRegistry<FileDiscoveryFilterV1> { return createCapabilityRegistry({ registryKey: FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1, contractVersion: 1, compatibleVersions: [1], validate: assertFileDiscoveryFilterV1 }); }
export function createFileDiscoveryServiceRegistryV1(): CapabilityRegistry<FileDiscoveryServiceV1> { return createCapabilityRegistry({ registryKey: FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1, contractVersion: 1, compatibleVersions: [1], validate: assertFileDiscoveryServiceV1 }); }
export function resolveFileDiscoveryFiltersV1(scope: object, registry = createFileDiscoveryFilterRegistryV1()): ContractResolutionV1<FileDiscoveryFilterV1> { return resolveContracts(scope, registry, false); }
export function resolveFileDiscoveryServiceV1(scope: object, registry = createFileDiscoveryServiceRegistryV1()): ContractResolutionV1<FileDiscoveryServiceV1> { return resolveContracts(scope, registry, true); }

export function assertFileDiscoveryExecutionContextV1(value: unknown): asserts value is FileDiscoveryExecutionContextV1 {
  const valueObject = object(value, "FileDiscoveryExecutionContextV1"); nonEmpty(valueObject.cwd, "cwd"); if (valueObject.requestId !== undefined) nonEmpty(valueObject.requestId, "requestId");
  if (valueObject.signal === null || typeof valueObject.signal !== "object" || typeof (valueObject.signal as { aborted?: unknown }).aborted !== "boolean" || typeof (valueObject.signal as { addEventListener?: unknown }).addEventListener !== "function") fail("signal must be an AbortSignal");
}
export function assertFileDiscoveryRequestV1(value: unknown): asserts value is FileDiscoveryRequestV1 {
  const request = object(value, "FileDiscoveryRequestV1");
  if (!Array.isArray(request.queries) || request.queries.length < 1 || request.queries.length > 8) fail("queries must contain 1..8 entries");
  for (const candidate of request.queries) { const query = object(candidate, "FileDiscoveryQueryV1"); boundedString(query.pattern, "query.pattern", 2000); if (query.id !== undefined) boundedString(query.id, "query.id", 80); if (query.mode !== "literal" && query.mode !== "regex") fail("query.mode is required and must be 'literal' or 'regex' (for example, { pattern: 'needle', mode: 'literal' })"); if (query.caseSensitive !== undefined && typeof query.caseSensitive !== "boolean") fail("query.caseSensitive must be boolean"); }
  optionalString(request.workspaceRoot, "workspaceRoot", 4096); if (request.roots !== undefined) boundedArray(request.roots, "roots", 1, 10, 4096); if (request.globs !== undefined) boundedArray(request.globs, "globs", 0, 20, 300);
  if (request.includeHidden !== undefined && typeof request.includeHidden !== "boolean") fail("includeHidden must be boolean"); if (request.filterMode !== undefined && request.filterMode !== "recommended" && request.filterMode !== "native-only") fail("filterMode must be 'recommended' or 'native-only'");
  optionalInteger(request.maxCandidates, "maxCandidates", 1, 20); optionalInteger(request.maxExcerptsPerCandidate, "maxExcerptsPerCandidate", 1, 5); if (request.outputMode !== undefined && request.outputMode !== "compact" && request.outputMode !== "detailed") fail("outputMode must be 'compact' or 'detailed'");
  optionalInteger(request.maxMatches, "maxMatches", 1, 1000); optionalInteger(request.maxMatchesPerFile, "maxMatchesPerFile", 1, 1000); optionalInteger(request.maxSnippetChars, "maxSnippetChars", 80, 4000); optionalInteger(request.timeoutSecondsPerSearch, "timeoutSecondsPerSearch", 1, 120);
}
export function assertFileDiscoveryFilterV1(value: unknown): asserts value is FileDiscoveryFilterV1 { const record = contract(value, "file-discovery-filter"); if (typeof record.evaluate !== "function") fail("FileDiscoveryFilterV1.evaluate must be a function"); }
export function assertFileDiscoveryServiceV1(value: unknown): asserts value is FileDiscoveryServiceV1 { const record = contract(value, "file-discovery-service"); if (typeof record.search !== "function") fail("FileDiscoveryServiceV1.search must be a function"); }
export function assertFileDiscoveryFilterResultV1(value: unknown): asserts value is FileDiscoveryFilterResultV1 {
  const result = object(value, "FileDiscoveryFilterResultV1"); if (result.outcome === "not_applicable") return;
  if (result.outcome === "unavailable" || result.outcome === "error") { boundedString(result.code, "filter code", 100); if (typeof result.retryable !== "boolean") fail("filter retryable must be boolean"); return; }
  if (result.outcome !== "applied" || !Array.isArray(result.roots) || result.roots.length > 10) fail("filter result must contain at most 10 roots");
  for (const entry of result.roots) { const root = object(entry, "FileDiscoveryFilterRootV1"); boundedString(root.root, "filter root", 4096); boundedArray(root.disclosures, "filter disclosures", 0, 32, 1000); if (root.filterDecision !== "applied" && root.filterDecision !== "bypassed") fail("filterDecision is required and must be 'applied' or 'bypassed'"); if (root.decisionCode !== undefined) boundedString(root.decisionCode, "filter decisionCode", 100); if (root.filterBoundary !== undefined) boundedString(root.filterBoundary, "filterBoundary", 4096); if (root.excludeGlobs !== undefined) boundedArray(root.excludeGlobs, "excludeGlobs", 0, 64, 300); if (root.ignoreFiles !== undefined) { boundedArray(root.ignoreFiles, "ignoreFiles", 0, 16, 4096); if (root.ignoreFiles.length && root.filterBoundary === undefined) fail("filterBoundary is required with ignoreFiles"); } }
}
export function assertFileDiscoveryResultV1(value: unknown): asserts value is FileDiscoveryResultV1 { const result = object(value, "FileDiscoveryResultV1"); if (typeof result.text !== "string") fail("result.text must be string"); object(result.details, "result.details"); const provenance = object(result.provenance, "provenance"); if (provenance.schema !== "@aefree/pi-file-discovery/execution-provenance" || provenance.version !== 1) fail("provenance schema/version mismatch"); }
export function freezeFileDiscoveryResultV1(value: FileDiscoveryResultV1): Readonly<FileDiscoveryResultV1> { assertFileDiscoveryResultV1(value); return Object.freeze({ ...value, details: Object.freeze({ ...value.details }), provenance: Object.freeze({ ...value.provenance }) }); }

function resolveContracts<T extends RegistryRecord>(scope: object, registry: CapabilityRegistry<T>, exclusive: boolean): ContractResolutionV1<T> { const catalog = registry.catalog(scope); const records = registry.snapshotCompatible(scope); const ids = records.map((record) => record.id).sort(); const duplicate = ids.some((id, index) => id === ids[index - 1]) || (exclusive && records.length > 1); const incompatible = catalog.versions.some((entry) => !entry.compatible && entry.count > 0); if (!duplicate && !incompatible && records.length) return Object.freeze({ outcome: "available", records, catalog }); return Object.freeze({ outcome: duplicate ? "duplicate" : incompatible ? "incompatible" : "missing", code: duplicate ? "duplicate_registration" : incompatible ? "incompatible_contract" : "missing_registration", expectedContractVersion: 1, registryKey: registry.registryKey, providerIds: Object.freeze(ids), catalog }); }
function contract(value: unknown, kind: string): Record<string, unknown> { const record = object(value, kind); if (record.contractVersion !== 1 || record.kind !== kind) fail(`${kind} contractVersion/kind mismatch`); boundedString(record.id, "id", 200); const owner = object(record.owner, "owner"); boundedString(owner.packageName, "owner.packageName", 200); boundedString(owner.packageVersion, "owner.packageVersion", 100); boundedString(owner.packageRoot, "owner.packageRoot", 4096); boundedString(owner.registeredBy, "owner.registeredBy", 4096); return record; }
function object(value: unknown, label: string): Record<string, any> { if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`); return value as Record<string, any>; }
function nonEmpty(value: unknown, label: string): asserts value is string { if (typeof value !== "string" || !value.trim()) fail(`${label} must be non-empty`); }
function boundedString(value: unknown, label: string, max: number): asserts value is string { nonEmpty(value, label); if (value.length > max || /[\0\r\n]/.test(value)) fail(`${label} is invalid`); }
function optionalString(value: unknown, label: string, max: number): void { if (value !== undefined) boundedString(value, label, max); }
function boundedArray(value: unknown, label: string, min: number, max: number, itemMax: number): asserts value is readonly string[] { if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${label} has invalid length`); for (const item of value) boundedString(item, label, itemMax); }
function optionalInteger(value: unknown, label: string, min: number, max: number): void { if (value !== undefined && (!Number.isInteger(value) || (value as number) < min || (value as number) > max)) fail(`${label} must be integer ${min}..${max}`); }
function fail(message: string): never { throw new TypeError(message); }
