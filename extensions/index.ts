import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_MAX_LINES, truncateHead } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { assertFileDiscoveryRequestV1, DiscoverCandidateFilesOutputSchemaV1, DISCOVERY_OUTPUT_LIMITS_V1, discoveryFailureV1, jsonUTF8BytesV1, projectDiscoverCandidateFilesOutputV1, createFileDiscoveryServiceRegistryV1, type FileDiscoveryRequestV1 } from "../src/contracts/v1/index.js";
import { resolveRipgrepExecutableV1, RipgrepUnavailableErrorV1 } from "../src/core/file-discovery.js";
import { bindFileDiscoveryScopeV1, FileDiscoveryServiceErrorV1, createFileDiscoveryServiceV1, DISCOVER_CANDIDATE_FILES_TOOL_NAME, loadFileDiscoveryOwnerV1 } from "../src/service.js";

const RIPGREP_WARNING_SYMBOL_V1 = Symbol.for("@aefree/pi-file-discovery/ripgrep-warning/v1");
const runtimeState = globalThis as Record<PropertyKey, unknown>;
const RIPGREP_WARNING = "pi-file-discovery capability warning: ripgrep (rg) is unavailable or PI_FILE_DISCOVERY_RG_PATH is invalid. Install rg on PATH, or set PI_FILE_DISCOVERY_RG_PATH to an absolute rg executable path. Candidate-file discovery remains unavailable until corrected.";

async function warnWhenRipgrepUnavailableV1(ctx: { readonly hasUI: boolean; readonly cwd: string; readonly ui: { notify(message: string, type?: "info" | "warning" | "error"): void } }): Promise<void> {
  if (!ctx.hasUI || runtimeState[RIPGREP_WARNING_SYMBOL_V1] === true) return;
  try { await resolveRipgrepExecutableV1(ctx.cwd); }
  catch {
    if (runtimeState[RIPGREP_WARNING_SYMBOL_V1] === true) return;
    runtimeState[RIPGREP_WARNING_SYMBOL_V1] = true;
    ctx.ui.notify(RIPGREP_WARNING, "warning");
  }
}

/** Candidate-file research, deliberately not an alias for routine rg/read lookup. */
export default function registerFileDiscovery(pi: ExtensionAPI): void {
  let token: ReturnType<ReturnType<typeof createFileDiscoveryServiceRegistryV1>["register"]> | undefined;
  pi.on("session_start", async (_event, ctx) => {
    token = createFileDiscoveryServiceRegistryV1().register(ctx.sessionManager, await createFileDiscoveryServiceV1(await loadFileDiscoveryOwnerV1(import.meta.url)));
    await warnWhenRipgrepUnavailableV1(ctx);
  });
  pi.on("session_shutdown", () => { createFileDiscoveryServiceRegistryV1().unregister(token); token = undefined; });
  pi.registerTool({
    name: DISCOVER_CANDIDATE_FILES_TOOL_NAME,
    label: "Candidate File Discovery",
    description: "Discover candidate files in unfamiliar areas by testing a small set of explicit literal or regex hypotheses. It ranks files for follow-up reads, not known-file read or narrow rg lookup. It is not a sandbox, permission system, or access-control boundary; an agent can use read or Bash instead.",
    promptSnippet: "Use candidate-file discovery only for unfamiliar, multi-hypothesis repository research.",
    promptGuidelines: [
      "Use discover_candidate_files when ownership or plausible implementation paths are unknown; keep roots and hypotheses bounded, then read top candidates.",
      "Use read for a known file and direct rg for a known symbol/directory or post-edit confirmation; do not invoke discovery merely because it is available.",
      "Every query must declare mode: 'literal' or 'regex'. Only completed no_matches cells are scoped absence evidence; partial/error/invalid-regex cells are incomplete.",
      "Exact roots inside generated/cache locations are intentional and are searched; broad research uses recommended filters by default.",
      "Physical selected-scope containment, deterministic executable selection, cancellation, and process/output bounds prevent accidental broad discovery, nondeterministic matching, process mistakes, and context waste; they do not control agent access.",
    ],
    outputSchema: DiscoverCandidateFilesOutputSchemaV1,
    parameters: Type.Object({
      queries: Type.Array(Type.Object({ id: Type.Optional(Type.String({ maxLength: 80 })), pattern: Type.String({ maxLength: 2000 }), mode: StringEnum(["literal", "regex"] as const), caseSensitive: Type.Optional(Type.Boolean()) }), { minItems: 1, maxItems: 8 }),
      workspaceRoot: Type.Optional(Type.String()), roots: Type.Optional(Type.Array(Type.String(), { minItems: 1, maxItems: 10 })), globs: Type.Optional(Type.Array(Type.String({ maxLength: 300 }), { maxItems: 20 })), includeHidden: Type.Optional(Type.Boolean()), filterMode: Type.Optional(StringEnum(["recommended", "native-only"] as const)),
      maxCandidates: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })), maxExcerptsPerCandidate: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })), outputMode: Type.Optional(StringEnum(["compact", "detailed"] as const)),
      maxMatches: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })), maxMatchesPerFile: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })), maxSnippetChars: Type.Optional(Type.Integer({ minimum: 80, maximum: 4000 })), timeoutSecondsPerSearch: Type.Optional(Type.Integer({ minimum: 1, maximum: 120 })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const failure = (code: Parameters<typeof discoveryFailureV1>[0]) => {
        const structuredContent = discoveryFailureV1(code);
        return { content: [{ type: "text" as const, text: structuredContent.error.message }], details: { completeness: "blocked", truncated: false }, isError: true, structuredContent };
      };
      try { assertFileDiscoveryRequestV1(params); } catch { return failure("validation_failed"); }
      const service = createFileDiscoveryServiceRegistryV1().snapshotCompatible(ctx.sessionManager)[0];
      if (!service) return failure("service_unavailable");
      let result;
      try {
        result = await service.search(bindFileDiscoveryScopeV1(Object.freeze({ cwd: ctx.cwd, signal: signal ?? new AbortController().signal }), ctx.sessionManager), params as FileDiscoveryRequestV1);
      } catch (error) {
        if (error instanceof FileDiscoveryServiceErrorV1) result = error.result;
        else if (error instanceof RipgrepUnavailableErrorV1) return failure("ripgrep_unavailable");
        else return failure(error instanceof Error && error.name === "AbortError" ? "cancelled" : "execution_failed");
      }
      const marker = "\n[Discovery presentation truncated; native coverage is separate.]";
      const truncation = truncateHead(result.text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DISCOVERY_OUTPUT_LIMITS_V1.presentationBytes - Buffer.byteLength(marker, "utf8") });
      const presentation = truncation.truncated ? truncation.content + marker : truncation.content;
      const structuredContent = projectDiscoverCandidateFilesOutputV1(result, truncation.truncated);
      if (!structuredContent.ok && structuredContent.error.code === "output_contract_error") return failure("output_contract_error");
      const output = { content: [{ type: "text" as const, text: presentation }], details: { ...result.details, truncated: truncation.truncated || result.reportTruncated === true, provenance: result.provenance }, isError: !structuredContent.ok, structuredContent };
      try { if (jsonUTF8BytesV1(output) > DISCOVERY_OUTPUT_LIMITS_V1.responseBytes) return failure("response_overflow"); }
      catch { return failure("output_contract_error"); }
      return output;
    },
    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Searching candidate files…"), 0, 0);
      const output = result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
      if (expanded) return new Text(output, 0, 0);
      const details = result.details as { candidates?: readonly unknown[]; completeness?: string; truncated?: boolean } | undefined;
      const candidateCount = details?.candidates?.length ?? 0;
      const status = details?.completeness ?? "complete";
      const truncationNote = details?.truncated ? "; output truncated" : "";
      return new Text(theme.fg("muted", `${candidateCount} candidate file${candidateCount === 1 ? "" : "s"}; ${status}${truncationNote} (expand for full report)`), 0, 0);
    },
  });
}
