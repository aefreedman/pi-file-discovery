import assert from "node:assert/strict";
import { chmodSync, copyFileSync, mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { assertFileDiscoveryRequestV1 } from "../dist/contracts/v1/index.js";
import { buildRipgrepArgs, executeFileDiscoveryV1, formatFileDiscoveryReportV1, isPathWithin, resolveRipgrepExecutableV1, summarizeFileDiscoveryCompletenessV1 } from "../dist/core/file-discovery.js";

const literal = { id: "needle", pattern: "Needle", mode: "literal" };
const context = (cwd) => ({ cwd, signal: new AbortController().signal });
const fixtureFilter = (root, id, evaluate) => ({ contractVersion: 1, id, kind: "file-discovery-filter", owner: { packageName: "@fixture/filter", packageVersion: "1", packageRoot: root, registeredBy: "test" }, evaluate });

function withFixture(prefix, run) {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  return Promise.resolve().then(() => run(root)).finally(() => rmSync(root, { recursive: true, force: true }));
}

test("explicit literal and regex modes drive shell-free ripgrep arguments", () => {
  assert.throws(() => assertFileDiscoveryRequestV1({ queries: [{ pattern: "needle" }] }), /mode is required/);
  const literalArgs = buildRipgrepArgs({ root: "/fixture", query: literal, globs: [], ignoreFiles: [], exclusions: [], includeHidden: false, maxMatchesPerFile: 2 });
  const regexArgs = buildRipgrepArgs({ root: "/fixture", query: { id: "regex", pattern: "Need.*", mode: "regex" }, globs: [], ignoreFiles: [], exclusions: [], includeHidden: false, maxMatchesPerFile: 2 });
  assert(literalArgs.includes("--fixed-strings")); assert(!regexArgs.includes("--fixed-strings")); assert.deepEqual(literalArgs.slice(-4), ["-e", "Needle", "--", "/fixture"]);
  const spaced = buildRipgrepArgs({ root: "/fixture", query: { id: "spaced", pattern: "  Needle  ", mode: "literal" }, globs: [], ignoreFiles: [], exclusions: [], includeHidden: false, maxMatchesPerFile: 2 }); assert.deepEqual(spaced.slice(-4), ["-e", "  Needle  ", "--", "/fixture"]);
  assert(isPathWithin("C:\\repo", "C:\\repo\\nested", path.win32)); assert(!isPathWithin("C:\\repo", "C:\\repository", path.win32));
});

test("discovery ranks bounded candidates with a stable path tie-break and complete scoped absence", async () => withFixture("pi-file-discovery-", async (root) => {
  mkdirSync(path.join(root, "src"));
  writeFileSync(path.join(root, "src", "best.txt"), "Needle lifecycle\nNeedle cleanup\n"); writeFileSync(path.join(root, "src", "spaced.txt"), "  Needle  \n");
  writeFileSync(path.join(root, "src", "other.txt"), "cleanup\n");
  writeFileSync(path.join(root, "src", "alpha.txt"), "Tie\n");
  writeFileSync(path.join(root, "src", "beta.txt"), "Tie\n");
  const result = await executeFileDiscoveryV1(context(root), { queries: [literal, { id: "cleanup", pattern: "cleanup", mode: "literal" }, { id: "spaced", pattern: "  Needle  ", mode: "literal" }, { id: "absent", pattern: "absent", mode: "literal" }], roots: ["src"], maxMatches: 20 }, []);
  assert.equal(result.completeness, "complete"); assert.equal(result.coverage.negativeEvidenceCellCount, 1); assert.equal(result.queries.find((query) => query.id === "spaced")?.pattern, "  Needle  "); assert.equal(result.candidates[0].path, "src/best.txt"); assert.deepEqual(result.candidates[0].queryIds, ["cleanup", "needle"]);
  const tied = await executeFileDiscoveryV1(context(root), { queries: [{ id: "tie", pattern: "Tie", mode: "literal" }], roots: ["src"] }, []);
  assert.deepEqual(tied.candidates.slice(0, 2).map((candidate) => candidate.path), ["src/alpha.txt", "src/beta.txt"]);
  const text = formatFileDiscoveryReportV1(result); assert.match(text, /Candidate files/); assert.match(text, /Next: read src\/best.txt/); assert(text.length <= 8_000);
}));

test("a stale selected root is scoped incomplete while valid roots continue; out-of-scope roots are rejected", async () => withFixture("pi-file-discovery-stale-root-", async (root) => {
  mkdirSync(path.join(root, "src")); writeFileSync(path.join(root, "src", "needle.txt"), "Needle\n");
  const mixed = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["src", "missing"] }, []);
  assert.equal(mixed.completeness, "partial"); assert.equal(mixed.coverage.ranCellCount, 1); assert.equal(mixed.coverage.completeCellCount, 1); assert.equal(mixed.coverage.incompleteCellCount, 1);
  assert.deepEqual(mixed.rootDiagnostics.map((entry) => [entry.displayPath, entry.status]), [["missing", "root_unavailable"]]);
  assert.equal(mixed.cells.find((cell) => cell.status === "root_unavailable")?.root, path.join(realpathSync(root), "missing"));
  assert.match(formatFileDiscoveryReportV1(mixed), /Unavailable requested roots/);
  const onlyStale = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["missing"] }, []);
  assert.equal(onlyStale.completeness, "blocked"); assert.equal(onlyStale.coverage.ranCellCount, 0); assert.equal(onlyStale.cells[0].status, "root_unavailable");
  let providerCalls = 0;
  const provider = fixtureFilter(root, "must-not-run", async () => { providerCalls += 1; return { outcome: "not_applicable" }; });
  await assert.rejects(() => executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["../outside"] }, [provider]), /root is outside the selected workspace/);
  assert.equal(providerCalls, 0, "out-of-scope roots stop before provider evaluation");
  const outside = mkdtempSync(path.join(tmpdir(), "pi-file-discovery-outside-"));
  try {
    symlinkSync(outside, path.join(root, "linked-outside"), process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(() => executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["linked-outside"] }, []), /root is outside the selected workspace after path resolution/);
  } finally { rmSync(outside, { recursive: true, force: true }); }
}));

test("fair cell budgets leave evidence for later hypotheses", async () => withFixture("pi-file-discovery-budget-", async (root) => {
  mkdirSync(path.join(root, "src"));
  for (let index = 0; index < 8; index += 1) writeFileSync(path.join(root, "src", `broad-${index}.txt`), "broad\n");
  writeFileSync(path.join(root, "src", "target.txt"), "target\n");
  const result = await executeFileDiscoveryV1(context(root), { queries: [{ id: "broad", pattern: "broad", mode: "literal" }, { id: "target", pattern: "target", mode: "literal" }], roots: ["src"], maxMatches: 4 }, []);
  assert.equal(result.completeness, "partial"); assert.equal(result.cells.find((cell) => cell.queryId === "broad")?.status, "partial_limit"); assert.equal(result.cells.find((cell) => cell.queryId === "target")?.status, "matched");
  assert(result.candidates.some((candidate) => candidate.path === "src/target.txt"));
}));

test("invalid regex is incomplete and cannot create absence evidence", async () => withFixture("pi-file-discovery-regex-", async (root) => {
  writeFileSync(path.join(root, "fixture.txt"), "anything\n");
  const result = await executeFileDiscoveryV1(context(root), { queries: [{ id: "bad", pattern: "[", mode: "regex" }] }, []);
  assert.equal(result.completeness, "partial"); assert.equal(result.cells[0].status, "invalid_regex"); assert.equal(result.coverage.negativeEvidenceCellCount, 0); assert.match(result.retrySuggestions.join(" "), /Correct the regex/);
}));

test("completeness aggregation treats timeout, execution errors, and globally skipped cells as incomplete", () => {
  const cell = (status) => ({ queryId: status, root: "/fixture", status, matches: [], appliedIgnoreFiles: [], filterExclusions: [], filterDecision: "skipped", disclosures: [] });
  const mixed = summarizeFileDiscoveryCompletenessV1([cell("matched"), cell("no_matches"), cell("partial_limit"), cell("invalid_regex"), cell("timeout"), cell("error"), cell("not_run_global_limit"), cell("root_unavailable")]);
  assert.deepEqual(mixed.coverage, { ranCellCount: 6, completeCellCount: 2, incompleteCellCount: 6, negativeEvidenceCellCount: 1 }); assert.equal(mixed.completeness, "partial");
  const blocked = summarizeFileDiscoveryCompletenessV1([cell("not_run_global_limit"), cell("root_unavailable")]);
  assert.deepEqual(blocked.coverage, { ranCellCount: 0, completeCellCount: 0, incompleteCellCount: 2, negativeEvidenceCellCount: 0 }); assert.equal(blocked.completeness, "blocked");
});

test("a configured external non-ripgrep executable reports a bounded generic cell error", async () => withFixture("pi-file-discovery-exec-error-", async (root) => {
  writeFileSync(path.join(root, "fixture.txt"), "Needle\n");
  const previous = process.env.PI_FILE_DISCOVERY_RG_PATH; process.env.PI_FILE_DISCOVERY_RG_PATH = process.execPath;
  try {
    const result = await executeFileDiscoveryV1(context(root), { queries: [literal] }, []);
    assert.equal(result.cells[0].status, "error"); assert.equal(result.completeness, "partial"); assert.equal(result.coverage.negativeEvidenceCellCount, 0);
  } finally {
    if (previous === undefined) delete process.env.PI_FILE_DISCOVERY_RG_PATH; else process.env.PI_FILE_DISCOVERY_RG_PATH = previous;
  }
}));

test("global match exhaustion marks later cells not_run_global_limit", async () => withFixture("pi-file-discovery-global-limit-", async (root) => {
  writeFileSync(path.join(root, "fixture.txt"), "first\nsecond\n");
  const result = await executeFileDiscoveryV1(context(root), { queries: [{ id: "first", pattern: "first", mode: "literal" }, { id: "second", pattern: "second", mode: "literal" }], maxMatches: 1 }, []);
  assert.deepEqual(result.cells.map((entry) => entry.status), ["partial_limit", "not_run_global_limit"]); assert.deepEqual(result.coverage, { ranCellCount: 1, completeCellCount: 0, incompleteCellCount: 2, negativeEvidenceCellCount: 0 }); assert.equal(result.completeness, "partial");
}));

test("compact reports stay within 8,000 characters for broad matches", async () => withFixture("pi-file-discovery-compact-", async (root) => {
  mkdirSync(path.join(root, "src"));
  const line = `Needle ${"x".repeat(290)}\n`;
  for (let index = 0; index < 20; index += 1) writeFileSync(path.join(root, "src", `candidate-${String(index).padStart(2, "0")}.txt`), line.repeat(5));
  const result = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["src"], maxMatches: 100, maxMatchesPerFile: 20, maxSnippetChars: 300, maxCandidates: 20, maxExcerptsPerCandidate: 5 }, []);
  const report = formatFileDiscoveryReportV1(result);
  assert(report.length <= 8_000); assert.match(report, /Compact report truncated at 8,000 characters/);
}));

test("recommended filters require declared exact-root bypasses, degrade predictably, and native-only skips providers", async () => withFixture("pi-file-discovery-filter-", async (root) => {
  mkdirSync(path.join(root, "cache")); writeFileSync(path.join(root, "cache", "needle.txt"), "Needle\n");
  const recommended = fixtureFilter(root, "fixture.filter", async () => ({ outcome: "applied", roots: [{ root: path.join(root, "cache"), filterDecision: "bypassed", disclosures: ["Provider declared an exact cache-root bypass."] }] }));
  const exact = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["cache"] }, [recommended]);
  assert.equal(exact.completeness, "complete"); assert.equal(exact.roots[0].filterBypassed, true); assert.equal(exact.cells[0].status, "matched");
  const degraded = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["cache"] }, [fixtureFilter(root, "broken", async () => { throw new Error("broken"); })]);
  assert.equal(degraded.cells[0].status, "matched"); assert.equal(degraded.filters.filteringDegraded, true); assert.equal(degraded.providerOutcomes[0].code, "filter_malformed_or_threw");
  const missingDecision = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["cache"] }, [fixtureFilter(root, "missing-decision", async () => ({ outcome: "applied", roots: [{ root: path.join(root, "cache"), excludeGlobs: ["!cache/**"], disclosures: [] }] }))]);
  assert.equal(missingDecision.cells[0].status, "matched"); assert.equal(missingDecision.providerOutcomes[0].code, "filter_malformed_or_threw"); assert.equal(missingDecision.filterDecisions.some((entry) => entry.decision === "applied" || entry.decision === "bypassed"), false);
  const malformed = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["cache"] }, [fixtureFilter(root, "malformed", async () => ({ outcome: "applied", roots: [{ root: path.join(root, "cache"), filterDecision: "applied", ignoreFiles: [path.join(root, "cache", "needle.txt")], disclosures: [] }] }))]);
  assert.equal(malformed.cells[0].status, "matched"); assert.equal(malformed.providerOutcomes[0].code, "filter_malformed_or_threw");
  let calls = 0;
  const nativeOnly = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["cache"], filterMode: "native-only" }, [fixtureFilter(root, "not-called", async () => { calls += 1; return { outcome: "not_applicable" }; })]);
  assert.equal(calls, 0); assert.deepEqual(nativeOnly.providerOutcomes, [{ providerId: "not-called", outcome: "skipped", decision: "skipped", code: "native_only" }]);
}));

test("declared root filter decisions and disclosures are explicit", async () => withFixture("pi-file-discovery-filter-decisions-", async (root) => {
  mkdirSync(path.join(root, "cache")); writeFileSync(path.join(root, "cache", "needle.txt"), "Needle\n");
  const filter = fixtureFilter(root, "unity-like", async () => ({ outcome: "applied", roots: [{ root, excludeGlobs: ["!cache/**"], filterDecision: "applied", decisionCode: "broad_generated_filter", disclosures: ["Recommended Unity/Plastic broad-root filtering excludes generated/cache directories."] }] }));
  const broad = await executeFileDiscoveryV1(context(root), { queries: [literal] }, [filter]); assert.equal(broad.roots[0].filterDecision, "applied"); assert.equal(broad.cells[0].filterDecision, "applied"); assert.equal(broad.cells[0].status, "no_matches"); assert.match(formatFileDiscoveryReportV1(broad), /Unity\/Plastic broad-root filtering/);
  const bypass = fixtureFilter(root, "declared-bypass", async () => ({ outcome: "applied", roots: [{ root: path.join(root, "cache"), filterDecision: "bypassed", decisionCode: "exact_generated_root", disclosures: ["Provider declared an exact generated root bypass."] }] }));
  const exact = await executeFileDiscoveryV1(context(root), { queries: [literal], roots: ["cache"] }, [bypass]); assert.equal(exact.roots[0].filterDecision, "bypassed"); assert.equal(exact.cells[0].filterDecision, "bypassed"); assert.match(formatFileDiscoveryReportV1(exact), /Exact requested generated\/cache root bypassed recommended filtering/);
}));

test("PATH skips workspace-contained rg candidates while an explicit absolute override is honored", async () => withFixture("pi-file-discovery-rg-selection-", async (workspace) => {
  const alias = `${workspace}-alias`; const executable = path.join(workspace, process.platform === "win32" ? "rg.exe" : "rg");
  try {
    if (process.platform === "win32") copyFileSync(process.execPath, executable); else { writeFileSync(executable, "#!/bin/sh\nexit 0\n"); chmodSync(executable, 0o755); }
    symlinkSync(workspace, alias, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(() => resolveRipgrepExecutableV1(alias, { PATH: alias }), /No usable ripgrep executable/);
    const configured = await resolveRipgrepExecutableV1(alias, { PI_FILE_DISCOVERY_RG_PATH: executable, PATH: "" }); assert.equal(configured.executable, realpathSync(executable));
  } finally { rmSync(alias, { recursive: true, force: true }); }
}));

test("Windows UNC-shaped workspace requests use normal resolution rather than a blanket rejection", { skip: process.platform !== "win32" }, async () => withFixture("pi-file-discovery-unc-", async (root) => {
  await assert.rejects(() => executeFileDiscoveryV1(context(root), { queries: [literal], workspaceRoot: "\\\\localhost\\file-discovery-missing" }, []), (error) => error instanceof Error && !/UNC/i.test(error.message));
}));

test("settled and caller-aborted filter races clear their timers and listeners", async () => withFixture("pi-file-discovery-filter-cleanup-", async (root) => {
  writeFileSync(path.join(root, "fixture.txt"), "Needle\n");
  const filters = Array.from({ length: 6 }, (_, index) => fixtureFilter(root, `immediate-${index}`, async () => ({ outcome: "not_applicable" })));
  const result = await executeFileDiscoveryV1(context(root), { queries: [literal], timeoutSecondsPerSearch: 30 }, filters);
  assert.equal(result.completeness, "complete"); assert.equal(result.providerOutcomes.length, 6);
  let providerSawTimeoutAbort = false;
  const timedOut = await executeFileDiscoveryV1(context(root), { queries: [literal], timeoutSecondsPerSearch: 1 }, [fixtureFilter(root, "wait-for-timeout", async (providerContext) => await new Promise(() => providerContext.signal.addEventListener("abort", () => { providerSawTimeoutAbort = true; }, { once: true })))]);
  assert.equal(providerSawTimeoutAbort, true); assert.equal(timedOut.providerOutcomes[0].code, "filter_timeout"); assert.equal(timedOut.filters.filteringDegraded, true);
  const controller = new AbortController(); let providerSawAbort = false;
  const aborted = executeFileDiscoveryV1({ cwd: root, signal: controller.signal }, { queries: [literal], timeoutSecondsPerSearch: 30 }, [fixtureFilter(root, "wait-for-abort", async (providerContext) => await new Promise((_resolve, reject) => providerContext.signal.addEventListener("abort", () => { providerSawAbort = true; reject(new Error("provider cancelled")); }, { once: true })))]);
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(aborted, /File discovery cancelled/); assert.equal(providerSawAbort, true);
}));
