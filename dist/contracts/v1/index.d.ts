import { type CapabilityRegistry, type RegistryOwner, type RegistryRecord, type VersionCatalog } from "@aefree/pi-capability-registry";
export declare const FILE_DISCOVERY_CONTRACT_VERSION_V1: 1;
export declare const FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1: "@aefree/pi-file-discovery/filters/v1";
export declare const FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1: "@aefree/pi-file-discovery/services/v1";
export interface FileDiscoveryOwnerV1 extends RegistryOwner {
    readonly packageVersion: string;
    readonly registeredBy: string;
}
/** Context for one bounded discovery call; it does not control agent access to the host. */
export interface FileDiscoveryExecutionContextV1 {
    readonly cwd: string;
    readonly requestId?: string;
    readonly signal: AbortSignal;
}
export interface FileDiscoveryQueryV1 {
    readonly id?: string;
    readonly pattern: string;
    readonly mode: "literal" | "regex";
    readonly caseSensitive?: boolean;
}
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
export interface CanonicalExecutionOwnerV1 {
    readonly serviceId: string;
    readonly packageName: string;
    readonly packageVersion: string;
    readonly contractVersion: 1;
}
export interface ProviderExecutionProvenanceV1 {
    readonly providerId: string;
    readonly packageName: string;
    readonly packageVersion: string;
    readonly contractVersion: 1;
    readonly decision: string;
}
export interface FallbackDecisionV1 {
    readonly code: string;
    readonly action: "used" | "not_needed" | "degraded";
    readonly summary: string;
}
export interface FileDiscoveryExecutionProvenanceV1 {
    readonly schema: "@aefree/pi-file-discovery/execution-provenance";
    readonly version: 1;
    readonly canonical: CanonicalExecutionOwnerV1;
    readonly providers: readonly ProviderExecutionProvenanceV1[];
    readonly fallbacks: readonly FallbackDecisionV1[];
}
export interface FileDiscoveryResultV1 {
    readonly text: string;
    readonly details: Readonly<Record<string, unknown>>;
    readonly provenance: FileDiscoveryExecutionProvenanceV1;
}
export interface FileDiscoveryFilterRequestV1 {
    readonly workspaceRoot: string;
    readonly roots: readonly string[];
    readonly includeHidden: boolean;
    readonly signal: AbortSignal;
}
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
export type FileDiscoveryFilterResultV1 = {
    readonly outcome: "not_applicable";
} | {
    readonly outcome: "applied";
    readonly roots: readonly FileDiscoveryFilterRootV1[];
} | {
    readonly outcome: "unavailable" | "error";
    readonly code: string;
    readonly retryable: boolean;
};
export interface FileDiscoveryFilterV1 extends RegistryRecord {
    readonly contractVersion: 1;
    readonly kind: "file-discovery-filter";
    readonly owner: FileDiscoveryOwnerV1;
    evaluate(context: FileDiscoveryExecutionContextV1, request: FileDiscoveryFilterRequestV1): Promise<FileDiscoveryFilterResultV1>;
}
export interface FileDiscoveryServiceV1 extends RegistryRecord {
    readonly contractVersion: 1;
    readonly kind: "file-discovery-service";
    readonly owner: FileDiscoveryOwnerV1;
    search(context: FileDiscoveryExecutionContextV1, request: FileDiscoveryRequestV1): Promise<FileDiscoveryResultV1>;
}
export type ContractResolutionV1<T extends RegistryRecord> = {
    readonly outcome: "available";
    readonly records: readonly Readonly<T>[];
    readonly catalog: VersionCatalog;
} | {
    readonly outcome: "missing" | "incompatible" | "duplicate";
    readonly code: "missing_registration" | "incompatible_contract" | "duplicate_registration";
    readonly expectedContractVersion: 1;
    readonly registryKey: string;
    readonly providerIds: readonly string[];
    readonly catalog: VersionCatalog;
};
export declare function createFileDiscoveryFilterRegistryV1(): CapabilityRegistry<FileDiscoveryFilterV1>;
export declare function createFileDiscoveryServiceRegistryV1(): CapabilityRegistry<FileDiscoveryServiceV1>;
export declare function resolveFileDiscoveryFiltersV1(scope: object, registry?: CapabilityRegistry<FileDiscoveryFilterV1>): ContractResolutionV1<FileDiscoveryFilterV1>;
export declare function resolveFileDiscoveryServiceV1(scope: object, registry?: CapabilityRegistry<FileDiscoveryServiceV1>): ContractResolutionV1<FileDiscoveryServiceV1>;
export declare function assertFileDiscoveryExecutionContextV1(value: unknown): asserts value is FileDiscoveryExecutionContextV1;
export declare function assertFileDiscoveryRequestV1(value: unknown): asserts value is FileDiscoveryRequestV1;
export declare function assertFileDiscoveryFilterV1(value: unknown): asserts value is FileDiscoveryFilterV1;
export declare function assertFileDiscoveryServiceV1(value: unknown): asserts value is FileDiscoveryServiceV1;
export declare function assertFileDiscoveryFilterResultV1(value: unknown): asserts value is FileDiscoveryFilterResultV1;
export declare function assertFileDiscoveryResultV1(value: unknown): asserts value is FileDiscoveryResultV1;
export declare function freezeFileDiscoveryResultV1(value: FileDiscoveryResultV1): Readonly<FileDiscoveryResultV1>;
//# sourceMappingURL=index.d.ts.map