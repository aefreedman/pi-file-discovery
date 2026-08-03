import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, truncateHead } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { createFileDiscoveryServiceRegistryV1, type FileDiscoveryRequestV1 } from "../src/contracts/v1/index.js";
import { bindFileDiscoveryScopeV1, createFileDiscoveryServiceV1, DISCOVER_CANDIDATE_FILES_TOOL_NAME, loadFileDiscoveryOwnerV1 } from "../src/service.js";

/** Candidate-file research, deliberately not an alias for routine rg/read lookup. */
export default function registerFileDiscovery(pi: ExtensionAPI): void {
  let token: ReturnType<ReturnType<typeof createFileDiscoveryServiceRegistryV1>["register"]> | undefined;
  pi.on("session_start", async (_event, ctx) => { token = createFileDiscoveryServiceRegistryV1().register(ctx.sessionManager, await createFileDiscoveryServiceV1(await loadFileDiscoveryOwnerV1(import.meta.url))); });
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
    parameters: Type.Object({
      queries: Type.Array(Type.Object({ id: Type.Optional(Type.String({ maxLength: 80 })), pattern: Type.String({ maxLength: 2000 }), mode: StringEnum(["literal", "regex"] as const), caseSensitive: Type.Optional(Type.Boolean()) }), { minItems: 1, maxItems: 8 }),
      workspaceRoot: Type.Optional(Type.String()), roots: Type.Optional(Type.Array(Type.String(), { minItems: 1, maxItems: 10 })), globs: Type.Optional(Type.Array(Type.String({ maxLength: 300 }), { maxItems: 20 })), includeHidden: Type.Optional(Type.Boolean()), filterMode: Type.Optional(StringEnum(["recommended", "native-only"] as const)),
      maxCandidates: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })), maxExcerptsPerCandidate: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })), outputMode: Type.Optional(StringEnum(["compact", "detailed"] as const)),
      maxMatches: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })), maxMatchesPerFile: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })), maxSnippetChars: Type.Optional(Type.Integer({ minimum: 80, maximum: 4000 })), timeoutSecondsPerSearch: Type.Optional(Type.Integer({ minimum: 1, maximum: 120 })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) { const service = createFileDiscoveryServiceRegistryV1().snapshotCompatible(ctx.sessionManager)[0]; if (!service) throw new Error("discover_candidate_files service is unavailable for this session; restart or reload Pi."); const result = await service.search(bindFileDiscoveryScopeV1(Object.freeze({ cwd: ctx.cwd, signal: signal ?? new AbortController().signal }), ctx.sessionManager), params as FileDiscoveryRequestV1); const truncation = truncateHead(result.text, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES }); return { content: [{ type: "text", text: truncation.content }], details: { ...result.details, truncated: truncation.truncated, provenance: result.provenance } }; },
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
