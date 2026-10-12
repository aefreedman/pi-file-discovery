import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import * as core from '@aefree/pi-file-discovery/core';
import * as contracts from '@aefree/pi-file-discovery/contracts/v1';
import * as service from '@aefree/pi-file-discovery';

// Manual gate: copy this consumer into a disposable production-only packed
// installation outside the workspace, then execute it there (bare ESM imports).
const root = path.dirname(fileURLToPath(import.meta.url));
const requireFromFixture = createRequire(import.meta.url);
for (const name of ['pi-ai', 'pi-coding-agent', 'pi-tui']) await assert.rejects(readFile(path.join(root, 'node_modules/@earendil-works', name, 'package.json')), { code: 'ENOENT' });
assert.equal(typeof core.executeFileDiscoveryV1, 'function');
assert.equal(contracts.DiscoverCandidateFilesOutputSchemaV1.anyOf.length, 2);
contracts.assertDiscoverCandidateFilesOutputV1(contracts.discoveryFailureV1('service_unavailable'));
const canonical = await service.createFileDiscoveryServiceV1(); assert.equal(canonical.id, 'file-discovery.ripgrep');
assert.equal(canonical.owner.packageName, '@aefree/pi-file-discovery'); assert(canonical.owner.packageRoot.startsWith(root));
assert(requireFromFixture.resolve('typebox').startsWith(root));
const manifest = JSON.parse(await readFile(path.join(root, 'node_modules/@aefree/pi-file-discovery/package.json'), 'utf8'));
assert.equal(manifest.version, '0.2.1');
assert.equal(manifest.dependencies?.typebox, undefined);
assert.equal(manifest.peerDependencies.typebox, '*');
assert.notEqual(manifest.peerDependenciesMeta?.typebox?.optional, true, 'standalone consumers require the TypeBox peer');
for (const name of ['typebox', '@aefree/pi-capability-registry']) {
  const installed = JSON.parse(await readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8')); console.log(`${name} ${installed.version}`);
}
console.log('PASS: packed standalone bare ESM core/contracts/service with declared runtime dependency and required TypeBox peer; no Pi SDK peers or workspace resolution');
