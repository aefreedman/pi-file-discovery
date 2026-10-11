import { Type, type Static } from "typebox";
import type { FileDiscoveryResultV1 } from "./index.js";
export declare const DISCOVERY_OUTPUT_LIMITS_V1: Readonly<{
    nativeBytes: 65536;
    responseBytes: 131072;
    presentationBytes: 32768;
}>;
declare const error: Type.TObject<{
    code: Type.TEnum<["all_failed", "cancelled", "execution_failed", "output_contract_error", "response_overflow", "ripgrep_unavailable", "service_unavailable", "validation_failed"]>;
    message: Type.TString;
}>;
export declare const DiscoverCandidateFilesOutputSchemaV1: Type.TUnion<[Type.TObject<{
    schema: Type.TLiteral<"@aefree/pi-file-discovery/discover-candidate-files">;
    version: Type.TLiteral<1>;
    operation: Type.TLiteral<"discover_candidate_files">;
    ok: Type.TLiteral<true>;
    observation: Type.TObject<{
        workspaceRoot: Type.TString;
        requestedRoots: Type.TArray<Type.TString>;
        queries: Type.TArray<Type.TObject<{
            id: Type.TString;
            pattern: Type.TString;
            mode: Type.TUnion<[Type.TLiteral<"literal">, Type.TLiteral<"regex">]>;
            caseSensitive: Type.TOptional<Type.TBoolean>;
        }>>;
        rootDiagnostics: Type.TArray<Type.TObject<{
            requestedRoot: Type.TString;
            path: Type.TString;
            displayPath: Type.TString;
            status: Type.TLiteral<"root_unavailable">;
            message: Type.TString;
        }>>;
        roots: Type.TArray<Type.TObject<{
            path: Type.TString;
            displayPath: Type.TString;
            explicitRoot: Type.TBoolean;
            filterBypassed: Type.TBoolean;
            filterDecision: Type.TUnion<[Type.TLiteral<"applied">, Type.TLiteral<"bypassed">, Type.TLiteral<"skipped">, Type.TLiteral<"degraded">]>;
            appliedIgnoreFileCount: Type.TInteger;
            exclusions: Type.TArray<Type.TString>;
            exclusionsOmitted: Type.TInteger;
            disclosures: Type.TArray<Type.TString>;
            disclosuresOmitted: Type.TInteger;
            decisionCodes: Type.TArray<Type.TString>;
            decisionCodesOmitted: Type.TInteger;
        }>>;
        cells: Type.TArray<Type.TObject<{
            queryId: Type.TString;
            root: Type.TString;
            status: Type.TEnum<["cancelled", "error", "invalid_regex", "matched", "no_matches", "not_run_failure", "not_run_global_limit", "partial_limit", "root_unavailable", "timeout"]>;
            matchCount: Type.TInteger;
            filterDecision: Type.TUnion<[Type.TLiteral<"applied">, Type.TLiteral<"bypassed">, Type.TLiteral<"skipped">, Type.TLiteral<"degraded">]>;
            appliedIgnoreFileCount: Type.TInteger;
            exitCode: Type.TOptional<Type.TUnion<[Type.TInteger, Type.TNull]>>;
        }>>;
        candidates: Type.TArray<Type.TObject<{
            path: Type.TString;
            queryIds: Type.TArray<Type.TString>;
            roots: Type.TArray<Type.TString>;
            matchCount: Type.TInteger;
            score: Type.TInteger;
            excerpts: Type.TArray<Type.TObject<{
                path: Type.TString;
                line: Type.TInteger;
                column: Type.TOptional<Type.TInteger>;
                text: Type.TString;
                textTruncated: Type.TOptional<Type.TBoolean>;
            }>>;
            excerptsOmitted: Type.TInteger;
        }>>;
        candidateCount: Type.TObject<{
            total: Type.TInteger;
            returned: Type.TInteger;
            omitted: Type.TInteger;
        }>;
        coverage: Type.TObject<{
            ranCellCount: Type.TInteger;
            completeCellCount: Type.TInteger;
            incompleteCellCount: Type.TInteger;
            negativeEvidenceCellCount: Type.TInteger;
        }>;
        completeness: Type.TUnion<[Type.TLiteral<"complete">, Type.TLiteral<"partial">, Type.TLiteral<"blocked">]>;
        filters: Type.TObject<{
            mode: Type.TUnion<[Type.TLiteral<"recommended">, Type.TLiteral<"native-only">]>;
            filteringDegraded: Type.TBoolean;
            explicitRootOverride: Type.TBoolean;
            nativeIgnore: Type.TLiteral<true>;
            followsSymlinks: Type.TLiteral<false>;
            binaryFiles: Type.TLiteral<"skipped">;
            includeHidden: Type.TBoolean;
            globs: Type.TArray<Type.TString>;
            effective: Type.TObject<{
                maxMatches: Type.TInteger;
                maxMatchesPerFile: Type.TInteger;
                maxSnippetChars: Type.TInteger;
            }>;
            requested: Type.TObject<{
                maxMatches: Type.TOptional<Type.TInteger>;
                maxMatchesPerFile: Type.TOptional<Type.TInteger>;
                maxSnippetChars: Type.TOptional<Type.TInteger>;
            }>;
            registrationDegradation: Type.TOptional<Type.TObject<{
                outcome: Type.TUnion<[Type.TLiteral<"incompatible">, Type.TLiteral<"duplicate">]>;
                code: Type.TString;
            }>>;
        }>;
        provenance: Type.TObject<{
            canonical: Type.TObject<{
                serviceId: Type.TString;
                packageName: Type.TString;
                packageVersion: Type.TString;
                contractVersion: Type.TLiteral<1>;
            }>;
            providers: Type.TArray<Type.TObject<{
                providerId: Type.TString;
                packageName: Type.TString;
                packageVersion: Type.TString;
                contractVersion: Type.TLiteral<1>;
                decision: Type.TUnion<[Type.TLiteral<"applied">, Type.TLiteral<"bypassed">, Type.TLiteral<"skipped">, Type.TLiteral<"degraded">]>;
                outcome: Type.TOptional<Type.TEnum<["applied", "error", "not_applicable", "skipped", "unavailable"]>>;
                code: Type.TOptional<Type.TString>;
            }>>;
            providersOmitted: Type.TInteger;
            fallbacks: Type.TArray<Type.TObject<{
                code: Type.TString;
                action: Type.TUnion<[Type.TLiteral<"used">, Type.TLiteral<"not_needed">, Type.TLiteral<"degraded">]>;
                summary: Type.TString;
            }>>;
            fallbacksOmitted: Type.TInteger;
        }>;
        projection: Type.TObject<{
            clippedTextCount: Type.TInteger;
            searchLimited: Type.TBoolean;
        }>;
        presentation: Type.TObject<{
            reportTruncated: Type.TBoolean;
            hostTruncated: Type.TBoolean;
        }>;
    }>;
}>, Type.TObject<{
    schema: Type.TLiteral<"@aefree/pi-file-discovery/discover-candidate-files">;
    version: Type.TLiteral<1>;
    operation: Type.TLiteral<"discover_candidate_files">;
    ok: Type.TLiteral<false>;
    error: Type.TObject<{
        code: Type.TEnum<["all_failed", "cancelled", "execution_failed", "output_contract_error", "response_overflow", "ripgrep_unavailable", "service_unavailable", "validation_failed"]>;
        message: Type.TString;
    }>;
    observation: Type.TOptional<Type.TObject<{
        workspaceRoot: Type.TString;
        requestedRoots: Type.TArray<Type.TString>;
        queries: Type.TArray<Type.TObject<{
            id: Type.TString;
            pattern: Type.TString;
            mode: Type.TUnion<[Type.TLiteral<"literal">, Type.TLiteral<"regex">]>;
            caseSensitive: Type.TOptional<Type.TBoolean>;
        }>>;
        rootDiagnostics: Type.TArray<Type.TObject<{
            requestedRoot: Type.TString;
            path: Type.TString;
            displayPath: Type.TString;
            status: Type.TLiteral<"root_unavailable">;
            message: Type.TString;
        }>>;
        roots: Type.TArray<Type.TObject<{
            path: Type.TString;
            displayPath: Type.TString;
            explicitRoot: Type.TBoolean;
            filterBypassed: Type.TBoolean;
            filterDecision: Type.TUnion<[Type.TLiteral<"applied">, Type.TLiteral<"bypassed">, Type.TLiteral<"skipped">, Type.TLiteral<"degraded">]>;
            appliedIgnoreFileCount: Type.TInteger;
            exclusions: Type.TArray<Type.TString>;
            exclusionsOmitted: Type.TInteger;
            disclosures: Type.TArray<Type.TString>;
            disclosuresOmitted: Type.TInteger;
            decisionCodes: Type.TArray<Type.TString>;
            decisionCodesOmitted: Type.TInteger;
        }>>;
        cells: Type.TArray<Type.TObject<{
            queryId: Type.TString;
            root: Type.TString;
            status: Type.TEnum<["cancelled", "error", "invalid_regex", "matched", "no_matches", "not_run_failure", "not_run_global_limit", "partial_limit", "root_unavailable", "timeout"]>;
            matchCount: Type.TInteger;
            filterDecision: Type.TUnion<[Type.TLiteral<"applied">, Type.TLiteral<"bypassed">, Type.TLiteral<"skipped">, Type.TLiteral<"degraded">]>;
            appliedIgnoreFileCount: Type.TInteger;
            exitCode: Type.TOptional<Type.TUnion<[Type.TInteger, Type.TNull]>>;
        }>>;
        candidates: Type.TArray<Type.TObject<{
            path: Type.TString;
            queryIds: Type.TArray<Type.TString>;
            roots: Type.TArray<Type.TString>;
            matchCount: Type.TInteger;
            score: Type.TInteger;
            excerpts: Type.TArray<Type.TObject<{
                path: Type.TString;
                line: Type.TInteger;
                column: Type.TOptional<Type.TInteger>;
                text: Type.TString;
                textTruncated: Type.TOptional<Type.TBoolean>;
            }>>;
            excerptsOmitted: Type.TInteger;
        }>>;
        candidateCount: Type.TObject<{
            total: Type.TInteger;
            returned: Type.TInteger;
            omitted: Type.TInteger;
        }>;
        coverage: Type.TObject<{
            ranCellCount: Type.TInteger;
            completeCellCount: Type.TInteger;
            incompleteCellCount: Type.TInteger;
            negativeEvidenceCellCount: Type.TInteger;
        }>;
        completeness: Type.TUnion<[Type.TLiteral<"complete">, Type.TLiteral<"partial">, Type.TLiteral<"blocked">]>;
        filters: Type.TObject<{
            mode: Type.TUnion<[Type.TLiteral<"recommended">, Type.TLiteral<"native-only">]>;
            filteringDegraded: Type.TBoolean;
            explicitRootOverride: Type.TBoolean;
            nativeIgnore: Type.TLiteral<true>;
            followsSymlinks: Type.TLiteral<false>;
            binaryFiles: Type.TLiteral<"skipped">;
            includeHidden: Type.TBoolean;
            globs: Type.TArray<Type.TString>;
            effective: Type.TObject<{
                maxMatches: Type.TInteger;
                maxMatchesPerFile: Type.TInteger;
                maxSnippetChars: Type.TInteger;
            }>;
            requested: Type.TObject<{
                maxMatches: Type.TOptional<Type.TInteger>;
                maxMatchesPerFile: Type.TOptional<Type.TInteger>;
                maxSnippetChars: Type.TOptional<Type.TInteger>;
            }>;
            registrationDegradation: Type.TOptional<Type.TObject<{
                outcome: Type.TUnion<[Type.TLiteral<"incompatible">, Type.TLiteral<"duplicate">]>;
                code: Type.TString;
            }>>;
        }>;
        provenance: Type.TObject<{
            canonical: Type.TObject<{
                serviceId: Type.TString;
                packageName: Type.TString;
                packageVersion: Type.TString;
                contractVersion: Type.TLiteral<1>;
            }>;
            providers: Type.TArray<Type.TObject<{
                providerId: Type.TString;
                packageName: Type.TString;
                packageVersion: Type.TString;
                contractVersion: Type.TLiteral<1>;
                decision: Type.TUnion<[Type.TLiteral<"applied">, Type.TLiteral<"bypassed">, Type.TLiteral<"skipped">, Type.TLiteral<"degraded">]>;
                outcome: Type.TOptional<Type.TEnum<["applied", "error", "not_applicable", "skipped", "unavailable"]>>;
                code: Type.TOptional<Type.TString>;
            }>>;
            providersOmitted: Type.TInteger;
            fallbacks: Type.TArray<Type.TObject<{
                code: Type.TString;
                action: Type.TUnion<[Type.TLiteral<"used">, Type.TLiteral<"not_needed">, Type.TLiteral<"degraded">]>;
                summary: Type.TString;
            }>>;
            fallbacksOmitted: Type.TInteger;
        }>;
        projection: Type.TObject<{
            clippedTextCount: Type.TInteger;
            searchLimited: Type.TBoolean;
        }>;
        presentation: Type.TObject<{
            reportTruncated: Type.TBoolean;
            hostTruncated: Type.TBoolean;
        }>;
    }>>;
}>]>;
export type DiscoverCandidateFilesOutputV1 = Static<typeof DiscoverCandidateFilesOutputSchemaV1>;
export declare function assertDiscoverCandidateFilesOutputV1(value: unknown): asserts value is DiscoverCandidateFilesOutputV1;
export declare function jsonUTF8BytesV1(value: unknown): number;
export declare function discoveryFailureV1(code: Static<typeof error>["code"]): Extract<DiscoverCandidateFilesOutputV1, {
    ok: false;
}>;
/** Allowlist canonical observations; never parse text or generic details. */
export declare function projectDiscoverCandidateFilesOutputV1(result: FileDiscoveryResultV1, hostTruncated?: boolean): DiscoverCandidateFilesOutputV1;
export {};
//# sourceMappingURL=output.d.ts.map