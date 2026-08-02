import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
test("package exposes the public File Discovery identity and extension", () => {
  assert.equal(manifest.name, "@aefree/pi-file-discovery");
  assert.equal(manifest.private, undefined);
  assert.deepEqual(manifest.publishConfig, { access: "public" });
  assert.deepEqual(manifest.pi, {
    extensions: ["./extensions/index.ts"],
    skills: ["./skills/using-file-discovery/SKILL.md"],
  });
  assert.equal(manifest.sideEffects, false);
  assert(existsSync(new URL("../extensions/index.ts", import.meta.url)));
});
