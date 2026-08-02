import * as path from "node:path";
import type { FileDiscoveryExecutionContextV1, FileDiscoveryFilterDecisionV1, FileDiscoveryFilterV1, FileDiscoveryRequestV1 } from "../contracts/v1/index.js";
export type FileDiscoveryCellStatusV1 = "matched" | "no_matches" | "partial_limit" | "invalid_regex" | "timeout" | "error" | "not_run_global_limit" | "root_unavailable";
export interface FileDiscoveryMatchV1 {
    readonly path: string;
    readonly line: number;
    readonly column?: number;
    readonly text: string;
}
export interface FileDiscoveryCellV1 {
    readonly queryId: string;
    readonly root: string;
    readonly status: FileDiscoveryCellStatusV1;
    readonly matches: readonly FileDiscoveryMatchV1[];
    readonly appliedIgnoreFiles: readonly string[];
    readonly filterExclusions: readonly string[];
    readonly filterDecision: FileDiscoveryFilterDecisionV1;
    readonly disclosures: readonly string[];
    readonly stderr?: string;
    readonly exitCode?: number | null;
}
export interface EffectiveRootFilterV1 {
    readonly path: string;
    readonly displayPath: string;
    readonly ignoreFiles: readonly string[];
    readonly exclusions: readonly string[];
    readonly disclosures: readonly string[];
    readonly explicitRoot: boolean;
    readonly filterBypassed: boolean;
    readonly filterDecision: FileDiscoveryFilterDecisionV1;
    readonly filterDecisionCodes: readonly string[];
}
export interface FileDiscoveryProviderOutcomeV1 {
    readonly providerId: string;
    readonly outcome: string;
    readonly decision: FileDiscoveryFilterDecisionV1;
    readonly code?: string;
}
export interface FileDiscoveryFilterDecisionRecordV1 {
    readonly scope: "provider" | "root";
    readonly decision: FileDiscoveryFilterDecisionV1;
    readonly target: string;
    readonly code?: string;
    readonly disclosures: readonly string[];
}
export interface FileDiscoveryCandidateV1 {
    readonly path: string;
    readonly queryIds: readonly string[];
    readonly roots: readonly string[];
    readonly matchCount: number;
    readonly score: number;
    readonly excerpts: readonly FileDiscoveryMatchV1[];
}
export interface FileDiscoveryCoverageV1 {
    readonly ranCellCount: number;
    readonly completeCellCount: number;
    readonly incompleteCellCount: number;
    readonly negativeEvidenceCellCount: number;
}
/** A requested in-workspace root that no longer exists; it is an incomplete scoped diagnostic, not a request-wide failure. */
export interface FileDiscoveryRootDiagnosticV1 {
    readonly requestedRoot: string;
    readonly path: string;
    readonly displayPath: string;
    readonly status: "root_unavailable";
    readonly message: string;
}
export interface CoreFileDiscoveryResultV1 {
    readonly workspaceRoot: string;
    readonly requestedRoots: readonly string[];
    readonly rootDiagnostics: readonly FileDiscoveryRootDiagnosticV1[];
    readonly queries: readonly NormalizedQueryV1[];
    readonly roots: readonly EffectiveRootFilterV1[];
    readonly cells: readonly FileDiscoveryCellV1[];
    readonly candidates: readonly FileDiscoveryCandidateV1[];
    readonly coverage: FileDiscoveryCoverageV1;
    readonly completeness: "complete" | "partial" | "blocked";
    readonly filters: Readonly<Record<string, unknown>>;
    readonly providerOutcomes: readonly FileDiscoveryProviderOutcomeV1[];
    readonly filterDecisions: readonly FileDiscoveryFilterDecisionRecordV1[];
    readonly retrySuggestions: readonly string[];
    readonly outputMode: "compact" | "detailed";
}
export type NormalizedQueryV1 = Readonly<{
    id: string;
    pattern: string;
    mode: "literal" | "regex";
    caseSensitive?: boolean;
}>;
export type ResolvedRipgrepExecutableV1 = Readonly<{
    executable: string;
    env: NodeJS.ProcessEnv;
}>;
export declare function stripLeadingAt(value: string): string;
export declare function normalizeDisplayPath(value: string): string;
export declare function isPathWithin(root: string, target: string, pathApi?: Pick<typeof path, "relative" | "isAbsolute" | "sep">): boolean;
export declare function displayPathFromRoot(root: string, target: string): string;
/** Resolve a deterministic absolute ripgrep executable for this bounded discovery call. */
export declare function resolveRipgrepExecutableV1(cwd: string, environment?: NodeJS.ProcessEnv): Promise<ResolvedRipgrepExecutableV1>;
export declare function ripgrepSubprocessEnvV1(environment?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export declare function buildRipgrepArgs(input: {
    readonly root: string;
    readonly query: NormalizedQueryV1;
    readonly globs: readonly string[];
    readonly ignoreFiles: readonly string[];
    readonly exclusions: readonly string[];
    readonly includeHidden: boolean;
    readonly maxMatchesPerFile: number;
}): string[];
export declare function executeFileDiscoveryV1(context: FileDiscoveryExecutionContextV1, request: FileDiscoveryRequestV1, providers: readonly Readonly<FileDiscoveryFilterV1>[]): Promise<CoreFileDiscoveryResultV1>;
/** Summarize which cells ran and whether their evidence is complete. */
export declare function summarizeFileDiscoveryCompletenessV1(cells: readonly FileDiscoveryCellV1[]): Readonly<{
    coverage: FileDiscoveryCoverageV1;
    completeness: "complete" | "partial" | "blocked";
}>;
/** Compact reports prioritize ranked candidates; detailed mode adds bounded cell diagnostics. */
export declare function formatFileDiscoveryReportV1(result: CoreFileDiscoveryResultV1): string;
//# sourceMappingURL=file-discovery.d.ts.map