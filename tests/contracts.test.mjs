import assert from "node:assert/strict";
import test from "node:test";
import { FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1, FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1, assertFileDiscoveryFilterResultV1, createFileDiscoveryFilterRegistryV1, createFileDiscoveryServiceRegistryV1, resolveFileDiscoveryFiltersV1, resolveFileDiscoveryServiceV1 } from "../dist/contracts/v1/index.js";

test("FileDiscovery contracts use package-qualified registries", () => {
  assert.equal(FILE_DISCOVERY_FILTER_REGISTRY_KEY_V1, "@aefree/pi-file-discovery/filters/v1"); assert.equal(FILE_DISCOVERY_SERVICE_REGISTRY_KEY_V1, "@aefree/pi-file-discovery/services/v1");
  const scope = {}; assert.equal(resolveFileDiscoveryFiltersV1(scope).outcome, "missing"); assert.equal(resolveFileDiscoveryServiceV1(scope).outcome, "missing");
  const filter = { contractVersion: 1, id: "fixture", kind: "file-discovery-filter", owner: { packageName: "@fixture/filter", packageVersion: "1", packageRoot: "/fixture", registeredBy: "test" }, async evaluate() { return { outcome: "not_applicable" }; } };
  const token = createFileDiscoveryFilterRegistryV1().register(scope, filter); assert.equal(resolveFileDiscoveryFiltersV1(scope).outcome, "available"); createFileDiscoveryFilterRegistryV1().unregister(token);
});

test("applied filter roots require explicit decisions and bounded ignore-file boundaries", () => {
  assertFileDiscoveryFilterResultV1({ outcome: "applied", roots: [{ root: "/fixture", filterDecision: "applied", filterBoundary: "/fixture", ignoreFiles: ["/fixture/.ignore"], disclosures: [] }] });
  assert.throws(() => assertFileDiscoveryFilterResultV1({ outcome: "applied", roots: [{ root: "/fixture", disclosures: [] }] }), /filterDecision is required/);
  assert.throws(() => assertFileDiscoveryFilterResultV1({ outcome: "applied", roots: [{ root: "/fixture", filterDecision: "applied", ignoreFiles: ["/fixture/.ignore"], disclosures: [] }] }), /filterBoundary is required/);
});
