import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
test("packaged metadata exposes only consumer-facing resources", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.name, "@aefree/pi-file-discovery");
  assert.equal(manifest.files.includes("evals/using-file-discovery"), false);
  assert.equal(manifest.repository.url.includes("pi-file-discovery"), true);
});

test("host-provided TypeBox is a required peer with a host-aligned development pin", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const host = JSON.parse(readFileSync(new URL("../node_modules/@earendil-works/pi-coding-agent/package.json", import.meta.url), "utf8"));
  assert.equal(manifest.dependencies?.typebox, undefined);
  assert.equal(manifest.peerDependencies.typebox, "*");
  assert.notEqual(manifest.peerDependenciesMeta?.typebox?.optional, true);
  assert.equal(manifest.devDependencies.typebox, host.dependencies.typebox);
});
