import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import register from "../extensions/index.ts";
import { assertDiscoverCandidateFilesOutputV1, createFileDiscoveryServiceRegistryV1, createFileDiscoveryFilterRegistryV1, jsonUTF8BytesV1, DISCOVERY_OUTPUT_LIMITS_V1 } from "../src/contracts/v1/index.ts";
import { fixture } from "./fixtures/discovery.mjs";

const tools = new Map<string, any>(); const handlers = new Map<string, any>();
register({ registerTool: (t: any) => tools.set(t.name, t), on: (e: string, h: any) => handlers.set(e, h) } as any);
const tool = tools.get("discover_candidate_files");
assert(tool.outputSchema);
const scope = {}; const registry = createFileDiscoveryServiceRegistryV1(); let calls = 0;
let next = fixture(); let thrown: Error | undefined;
const owner = { packageName: "fixture", packageVersion: "1", packageRoot: process.cwd(), registeredBy: "fixture" };
const token = registry.register(scope, { contractVersion: 1, id: "fixture", kind: "file-discovery-service", owner, async search() { calls++; if (thrown) throw thrown; return next; } });
const request = { queries: [{ pattern: "needle", mode: "literal" }] };
const invoke = () => tool.execute("fixture", request, new AbortController().signal, undefined, { cwd: process.cwd(), sessionManager: scope });
try {
  const r = await invoke(); assert.equal(calls, 1); assert.equal(r.isError, false); assert.equal(r.structuredContent.ok, true); assert.match(r.content[0].text, /雪/); assertDiscoverCandidateFilesOutputV1(r.structuredContent);
  next.details.large = "雪".repeat(50_000); const overflow = await invoke(); assert.equal(calls, 2); assert.equal(overflow.isError, true); assert.equal(overflow.structuredContent.error.code, "response_overflow"); assert(jsonUTF8BytesV1(overflow) <= DISCOVERY_OUTPUT_LIMITS_V1.responseBytes);
  next = fixture(); next.native.candidates[0].path = "x".repeat(4097); const invalid = await invoke(); assert.equal(calls, 3); assert.equal(invalid.structuredContent.error.code, "output_contract_error");
  next = fixture(); next.text = "雪".repeat(20_000); const clipped = await invoke(); assert.equal(calls, 4); assert.equal(clipped.structuredContent.ok, true); assert.equal(clipped.structuredContent.observation.presentation.hostTruncated, true); assert(Buffer.byteLength(clipped.content[0].text) <= DISCOVERY_OUTPUT_LIMITS_V1.presentationBytes);
  thrown = new Error("PRIVATE executable/path"); const failed = await invoke(); assert.equal(failed.isError, true); assert.equal(failed.structuredContent.error.code, "execution_failed"); assert.equal(JSON.stringify(failed).includes("PRIVATE"), false);
  thrown.name = "AbortError"; const cancelled = await invoke(); assert.equal(cancelled.structuredContent.error.code, "cancelled");
  const bad = await tool.execute("fixture", { queries: [] }, undefined, undefined, { cwd: process.cwd(), sessionManager: scope }); assert.equal(bad.structuredContent.error.code, "validation_failed"); assert.equal(calls, 6);
} finally { registry.unregister(token); }
const missing = await invoke(); assert.equal(missing.isError, true); assert.equal(missing.structuredContent.error.code, "service_unavailable");

// Producer launch failure after root/filter admission: retain full cells and stop, never replay.
const root = await mkdtemp(path.join(os.tmpdir(), "discovery-launch-"));
const executable = path.join(root, process.platform === "win32" ? "fake.exe" : "fake-rg");
const old = process.env.PI_FILE_DISCOVERY_RG_PATH; let providerCalls = 0; let filterToken: any;
const launchScope = {};
try {
  await writeFile(executable, "not an executable\n"); await chmod(executable, 0o755); process.env.PI_FILE_DISCOVERY_RG_PATH = executable;
  await handlers.get("session_start")({}, { cwd: root, sessionManager: launchScope });
  filterToken = createFileDiscoveryFilterRegistryV1().register(launchScope, { contractVersion: 1, id: "fixture", kind: "file-discovery-filter", owner, async evaluate() { providerCalls++; await rm(executable); return { outcome: "not_applicable" }; } });
  const launch = await tool.execute("launch", { queries: [{ pattern: "a", mode: "literal" }, { pattern: "b", mode: "literal" }] }, new AbortController().signal, undefined, { cwd: root, sessionManager: launchScope });
  assert.equal(providerCalls, 1); assert.equal(launch.isError, true); assert.equal(launch.structuredContent.error.code, "execution_failed");
  assert.deepEqual(launch.structuredContent.observation.cells.map((c: any) => c.status), ["error", "not_run_failure"]);
  assert.equal(launch.structuredContent.observation.coverage.negativeEvidenceCellCount, 0); assertDiscoverCandidateFilesOutputV1(launch.structuredContent);
  const unavailable = await tool.execute("unavailable", request, new AbortController().signal, undefined, { cwd: root, sessionManager: launchScope });
  assert.equal(unavailable.structuredContent.error.code, "ripgrep_unavailable"); assert.match(unavailable.content[0].text, /Install rg on PATH/); assert.equal(JSON.stringify(unavailable).includes(executable), false);
} finally {
  createFileDiscoveryFilterRegistryV1().unregister(filterToken); await handlers.get("session_shutdown")({}, {});
  if (old === undefined) delete process.env.PI_FILE_DISCOVERY_RG_PATH; else process.env.PI_FILE_DISCOVERY_RG_PATH = old;
  await rm(root, { recursive: true, force: true });
}
console.log("PASS: discovery adapter bounded content/DTO/wrapper, validation, service, cancellation, single execution and launch-failure evidence");
