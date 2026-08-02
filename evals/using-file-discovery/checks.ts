export type EvalCheckContext = {
  answer: string;
  toolCalls: Array<{ name: string; args: any; result?: unknown; failed: boolean }>;
  changedPaths: string[];
  condition: "available" | "baseline";
  skillFileRead: boolean;
  maxToolCalls: number;
  maxAnswerChars: number;
  resultText(call: { result?: unknown }): string;
  resultJson(call: { result?: unknown }): string;
  exitCode: number | null;
  timedOut: boolean;
  outputOverflow: boolean;
  malformed: number;
};

function discoveryCalls(context: EvalCheckContext) { return context.toolCalls.filter((call) => call.name === "discover_candidate_files"); }
function firstDiscovery(context: EvalCheckContext) { return discoveryCalls(context)[0]; }
function argumentText(call: { args: unknown } | undefined): string { return JSON.stringify(call?.args ?? {}).replaceAll("\\", "/"); }
function outputText(context: EvalCheckContext): string { return discoveryCalls(context).map((call) => context.resultText(call)).join("\n"); }
function outputJson(context: EvalCheckContext): string { return discoveryCalls(context).map((call) => context.resultJson(call)).join("\n"); }
function queryModes(call: any): unknown[] { return Array.isArray(call?.args?.queries) ? call.args.queries.map((query: any) => query?.mode) : []; }
function noBroadAbsenceClaim(answer: string): boolean { return !/\b(?:no|not)\s+(?:matches?|instances?|results?)\s+(?:anywhere|in the (?:whole |entire )?repository|repository-wide)\b/i.test(answer); }

/** Deterministic checks grade observable tool arguments/results and bounded final text. */
export function evaluateCheck(id: string, context: EvalCheckContext): boolean | null {
  const call = firstDiscovery(context);
  const text = outputText(context);
  const json = outputJson(context);
  switch (id) {
    case "available_skill_file_read": return context.condition === "available" ? context.skillFileRead : null;
    case "available_skill_not_loaded": return context.condition === "available" ? !context.skillFileRead : null;
    case "used_discovery": return discoveryCalls(context).length > 0;
    case "not_used_discovery": return discoveryCalls(context).length === 0;
    case "used_read": return context.toolCalls.some((item) => item.name === "read");
    case "explicit_modes": { const modes = queryModes(call); return modes.length > 0 && modes.every((mode) => mode === "literal" || mode === "regex"); }
    case "multiple_hypotheses": return (call?.args?.queries?.length ?? 0) >= 2;
    case "multiple_roots": return (call?.args?.roots?.length ?? 0) >= 2;
    case "ranked_candidates": return /## Candidate files/i.test(text) && (/Next: read /i.test(text) || /— hypotheses:/i.test(text));
    case "broad_filter_applied": return /Synthetic broad Unity filter/i.test(text) && /"filterDecision":"applied"/.test(json);
    case "exact_package_cache_root": return /Library\/PackageCache\/com\.example\.activation/i.test(argumentText(call));
    case "explicit_filtered_root": return /Library\/Generated/i.test(argumentText(call));
    case "filter_bypassed": return /bypassed/i.test(text) && /Exact requested generated\/cache root bypassed/i.test(text);
    case "filter_degraded": return /degraded (?:provider )?filter/i.test(text) && /"decision":"degraded"/.test(json);
    case "scoped_absence": return /No matches were found only in the completed searched cells/i.test(text);
    case "no_global_absence_claim": return noBroadAbsenceClaim(context.answer);
    case "fair_budget": {
      const modes = queryModes(call); const roots = call?.args?.roots;
      return call?.args?.maxMatches === 6 && modes.length === 3 && Array.isArray(roots) && roots.length === 2 && /"ranCellCount":6/.test(json) && !/not_run_global_limit/.test(json);
    }
    case "compact_output": return call?.args?.outputMode === "compact" && text.length <= 8_000;
    case "mode_validation": return discoveryCalls(context).every((item) => !/no_matches/i.test(context.resultText(item))) && /mode/i.test(context.answer) && /literal/i.test(context.answer) && /regex/i.test(context.answer);
    case "invalid_regex": return /invalid_regex/i.test(text) && /"mode":"regex"/.test(json);
    case "no_absence_from_invalid_regex": return !/No matches were found only in the completed searched cells/i.test(text) && noBroadAbsenceClaim(context.answer);
    case "no_files_changed": return context.changedPaths.length === 0;
    case "bounded_tool_calls": return context.toolCalls.length <= context.maxToolCalls && context.exitCode === 0 && !context.timedOut && !context.outputOverflow && context.malformed === 0;
    case "answer_under_8000": return context.answer.length <= context.maxAnswerChars && discoveryCalls(context).every((item) => context.resultText(item).length <= 8_000);
    default: throw new Error(`Unknown check id: ${id}`);
  }
}
