import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createCapabilityRegistry } from "@aefree/pi-capability-registry";
import { createFileDiscoveryFilterRegistryV1, FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1 } from "../dist/contracts/v1/index.js";
import { bindFileDiscoveryScopeV1, createFileDiscoveryServiceV1 } from "../dist/service.js";

test("incompatible optional filter registration degrades to native discovery", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "pi-file-discovery-incompatible-filter-"));
  try {
    writeFileSync(path.join(root, "needle.txt"), "Needle\n");
    const scope = {};
    const incompatible = createCapabilityRegistry({ registryKey: FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1, contractVersion: 2 });
    const token = incompatible.register(scope, { contractVersion: 2, id: "future.filter", owner: { packageName: "@fixture/future-filter", packageVersion: "2", packageRoot: "fixture", registeredBy: "test" } });
    const context = bindFileDiscoveryScopeV1(Object.freeze({ cwd: root, signal: new AbortController().signal }), scope);
    const result = await (await createFileDiscoveryServiceV1()).search(context, { queries: [{ pattern: "Needle", mode: "literal" }] });
    assert.equal(result.details.completeness, "complete"); assert.equal("executionGate" in result.details, false); assert.equal("executionGate" in result.provenance, false);
    assert.equal(result.details.filters.registrationDegradation.outcome, "incompatible"); assert.equal(result.details.filterDecisions.find((entry) => entry.target === "filter registration")?.decision, "degraded"); assert.match(result.text, /degraded filter registration/);
    assert.deepEqual(result.provenance.fallbacks, [{ code: "incompatible_contract", action: "degraded", summary: "Optional filter registration is incompatible; native discovery continued." }]);
    incompatible.unregister(token);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("duplicate optional filter registration degrades to native discovery", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "pi-file-discovery-duplicate-filter-"));
  try {
    writeFileSync(path.join(root, "needle.txt"), "Needle\n"); const scope = {}; createFileDiscoveryFilterRegistryV1();
    const registryRoot = globalThis[Symbol.for(FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1)]; const versionState = registryRoot.versions.get(1);
    const makeRecord = (packageName) => ({ contractVersion: 1, id: "duplicate.filter", kind: "file-discovery-filter", owner: { packageName, packageVersion: "1", packageRoot: packageName, registeredBy: "test" }, async evaluate() { throw new Error("must not run"); } });
    versionState.scopes.set(scope, { sequence: 2, records: new Map([["one", { nonce: 1, record: makeRecord("@fixture/one") }], ["two", { nonce: 2, record: makeRecord("@fixture/two") }]]) });
    const context = bindFileDiscoveryScopeV1(Object.freeze({ cwd: root, signal: new AbortController().signal }), scope);
    const result = await (await createFileDiscoveryServiceV1()).search(context, { queries: [{ pattern: "Needle", mode: "literal" }] });
    assert.equal(result.details.completeness, "complete"); assert.equal("executionGate" in result.details, false); assert.equal("executionGate" in result.provenance, false); assert.equal(result.details.filters.registrationDegradation.outcome, "duplicate"); assert.equal(result.details.filterDecisions.find((entry) => entry.target === "filter registration")?.decision, "degraded"); assert.match(result.text, /degraded filter registration/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
