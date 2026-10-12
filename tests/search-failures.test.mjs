import assert from 'node:assert/strict';
import test from 'node:test';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { executeFileDiscoveryV1, FileDiscoveryExecutionErrorV1 } from '../dist/core/file-discovery.js';
import { projectDiscoverCandidateFilesOutputV1 } from '../dist/contracts/v1/index.js';
import { fixture } from './fixtures/discovery.mjs';

// Isolated Node test worker. Replace only the subprocess seam, never launch fake executables.
test('scripted process errors, timeout, cancellation and malformed capture cannot establish absence', async () => {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'discovery-process-')));
  const original = childProcess.spawn; let behavior; let calls = 0;
  const controller = new AbortController();
  childProcess.spawn = () => {
    calls++;
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.killed = false;
    let closed = false;
    const close = code => { if (closed) return; closed = true; child.stdout.end(); child.stderr.end(); child.emit('close', code); };
    child.kill = () => { child.killed = true; queueMicrotask(() => close(null)); return true; };
    queueMicrotask(() => behavior(child, close)); return child;
  }; syncBuiltinESMExports();
  const request = { queries: [{ pattern: 'needle', mode: 'literal' }], timeoutSecondsPerSearch: 1 };
  const run = signal => executeFileDiscoveryV1({ cwd: root, signal: signal ?? new AbortController().signal }, request, []);
  const dto = core => projectDiscoverCandidateFilesOutputV1({ ...fixture(), native: core });
  try {
    behavior = (_child, close) => close(1); const empty = await run(); assert.equal(dto(empty).ok, true); assert.equal(empty.coverage.negativeEvidenceCellCount, 1);
    behavior = (child, close) => { child.stderr.write('PRIVATE error parsing regex'); close(2); }; const regex = await run(); assert.equal(dto(regex).ok, false); assert.equal(regex.cells[0].status, 'invalid_regex'); assert.equal(JSON.stringify(dto(regex)).includes('PRIVATE'), false);
    behavior = (child, close) => { child.stdout.write('malformed JSON\n'); close(0); }; const malformed = await run(); assert.equal(malformed.cells[0].status, 'error'); assert.equal(dto(malformed).ok, false); assert.equal(malformed.coverage.negativeEvidenceCellCount, 0);
    behavior = (child, close) => { child.stdout.write(JSON.stringify({ type: 'match', data: { path: { text: path.join(root, '雪.txt') }, line_number: 1, lines: { text: '😀'.repeat(200) }, submatches: [{ start: 0 }] } }) + '\n'); close(0); };
    const unicode = await run(); assert.equal(dto(unicode).ok, true); assert.equal(unicode.candidates[0].path, '雪.txt'); assert.equal(unicode.candidates[0].excerpts[0].textTruncated, true);
    assert.equal(/[\uD800-\uDBFF]…$/.test(unicode.candidates[0].excerpts[0].text), false);
    behavior = () => {}; const timeout = await run(); assert.equal(timeout.cells[0].status, 'timeout'); assert.equal(timeout.cells[0].exitCode, null); assert.equal(dto(timeout).ok, false);
    behavior = (child, close) => { child.stdout.write(JSON.stringify({ type: 'match', data: { path: { text: path.join(root, '..', 'outside.txt') }, line_number: 1, lines: { text: 'needle' } } }) + '\n'); close(0); };
    const outside = await run(); assert.equal(dto(outside).ok, false); assert.equal(outside.candidates.length, 0);
    behavior = (child, close) => { child.stdout.write(JSON.stringify({ type: 'match', data: { path: { text: path.join(root, 'cap.txt') }, line_number: 1, lines: { text: 'needle' } } }) + '\n'); close(0); };
    const capped = await executeFileDiscoveryV1({ cwd: root, signal: new AbortController().signal }, { ...request, maxMatchesPerFile: 1 }, []); assert.equal(capped.cells[0].status, 'partial_limit'); assert.equal(dto(capped).observation.projection.searchLimited, true);
    const beforeCancel = calls;
    behavior = () => controller.abort();
    await assert.rejects(() => executeFileDiscoveryV1({ cwd: root, signal: controller.signal }, { queries: [...request.queries, { pattern: 'other', mode: 'literal' }] }, []), error => {
      assert(error instanceof FileDiscoveryExecutionErrorV1); assert.equal(error.name, 'AbortError'); assert.equal(dto(error.result).error.code, 'cancelled');
      assert.deepEqual(error.result.cells.map(c => c.status), ['cancelled', 'not_run_failure']); assert.equal(error.result.coverage.negativeEvidenceCellCount, 0); return true;
    }); assert.equal(calls, beforeCancel + 1, 'cancelled execution never dispatches subsequent cells or replays');
    behavior = child => child.emit('error', new Error('PRIVATE launch failure'));
    await assert.rejects(run, error => { assert(error instanceof FileDiscoveryExecutionErrorV1); assert.equal(dto(error.result).error.code, 'execution_failed'); return true; });
  } finally { childProcess.spawn = original; syncBuiltinESMExports(); await rm(root, { recursive: true, force: true }); }
});
