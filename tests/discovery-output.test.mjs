import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDiscoverCandidateFilesOutputV1, projectDiscoverCandidateFilesOutputV1, jsonUTF8BytesV1, DISCOVERY_OUTPUT_LIMITS_V1 } from '../dist/contracts/v1/index.js';

import { fixture } from './fixtures/discovery.mjs';
test('closed output preserves native values, exact Unicode references and ignores private records', () => {
  const f = fixture(); f.details.secret = 'PRIVATE'; f.provenance.canonical.packageRoot = 'PRIVATE';
  const r = projectDiscoverCandidateFilesOutputV1(f); assert.equal(r.ok, true); assertDiscoverCandidateFilesOutputV1(r);
  assert.equal(r.observation.queries[0].caseSensitive, false); assert.equal(r.observation.cells[0].exitCode, 0); assert.equal(r.observation.candidates[0].excerpts[0].column, 0);
  assert.equal(r.observation.candidates[0].path, 'src/雪.txt'); assert.equal(JSON.stringify(r).includes('PRIVATE'), false); assert.equal(JSON.stringify(r).includes('/private/ignore'), false);
  assert.throws(() => assertDiscoverCandidateFilesOutputV1({ ...r, unexpected: true }));
  const f2 = fixture(); delete f2.native.queries[0].caseSensitive; f2.native.cells[0].exitCode = null; delete f2.native.candidates[0].excerpts[0].column;
  const r2 = projectDiscoverCandidateFilesOutputV1(f2); assert.equal(r2.observation.cells[0].exitCode, null); assert.equal('caseSensitive' in r2.observation.queries[0], false); assert.equal('column' in r2.observation.candidates[0].excerpts[0], false);
});
test('only completed no_matches establishes scoped absence; all-failed has bounded full matrix', () => {
  for (const status of ['no_matches','invalid_regex','timeout','error','root_unavailable','not_run_global_limit','partial_limit']) {
    const f = fixture(); f.native.cells[0].status = status; f.native.cells[0].matches = []; f.native.candidates = [];
    f.native.coverage = { ranCellCount: 1, completeCellCount: status === 'no_matches' ? 1 : 0, incompleteCellCount: status === 'no_matches' ? 0 : 1, negativeEvidenceCellCount: status === 'no_matches' ? 1 : 0 };
    f.native.completeness = status === 'no_matches' ? 'complete' : 'partial';
    const r = projectDiscoverCandidateFilesOutputV1(f); assert.equal(r.ok, status === 'no_matches'); assert.equal(r.observation.cells[0].status, status); assert.equal(r.observation.coverage.negativeEvidenceCellCount, status === 'no_matches' ? 1 : 0);
  }
  const f = fixture(); f.native.cells[0].status = 'partial_limit'; f.native.completeness = 'partial'; const r = projectDiscoverCandidateFilesOutputV1(f); assert.equal(r.ok, true); assert.equal(r.observation.projection.searchLimited, true);
});
test('candidate/excerpt omission, projection omissions and report clipping remain separate', () => {
  const f = fixture(); f.native.cells[0].matches.push({ ...f.native.cells[0].matches[0], path: 'unreturned.txt' }); f.native.candidates[0].matchCount = 4;
  f.native.roots[0].disclosures = Array(10).fill('雪'.repeat(600)); f.native.roots[0].exclusions = Array(35).fill('!cache/**');
  f.provenance.providers = Array.from({ length: 35 }, (_, i) => ({ providerId: `provider${i}`, packageName: 'fixture', packageVersion: '1', contractVersion: 1, decision: 'degraded', private: 'PRIVATE' }));
  f.native.filters.filteringDegraded = true; f.reportTruncated = true;
  const r = projectDiscoverCandidateFilesOutputV1(f, false); assert.equal(r.ok, true);
  assert.deepEqual(r.observation.candidateCount, { total: 2, returned: 1, omitted: 1 }); assert.equal(r.observation.candidates[0].excerptsOmitted, 3);
  assert.equal(r.observation.roots[0].disclosuresOmitted, 2); assert.equal(r.observation.roots[0].exclusionsOmitted, 3); assert.equal(r.observation.projection.clippedTextCount, 8); assert.equal(r.observation.provenance.providersOmitted, 3);
  assert.deepEqual(r.observation.presentation, { reportTruncated: true, hostTruncated: false }); assert.equal(r.observation.projection.searchLimited, false);
});
test('admitted references are rejected before clipping, not unknown/unemitted references', () => {
  const f = fixture(); f.native.candidates[0].path = 'x'.repeat(4096); assert.equal(projectDiscoverCandidateFilesOutputV1(f).ok, true);
  f.native.candidates[0].path += 'x'; assert.equal(projectDiscoverCandidateFilesOutputV1(f).error.code, 'output_contract_error');
  const f2 = fixture(); f2.native.cells[0].matches.push({ ...f2.native.cells[0].matches[0], path: 'x'.repeat(5000) });
  f2.provenance.providers = Array.from({length: 33}, (_, i) => ({ providerId: i === 32 ? 'x'.repeat(1000) : 'safe', packageName: 'fixture', packageVersion: '1', contractVersion: 1, decision: 'skipped' }));
  assert.equal(projectDiscoverCandidateFilesOutputV1(f2).ok, true);
});
test('malformed native observations and UTF-8 overflow fail safely without parsing presentation', () => {
  const f = fixture(); delete f.native; assert.equal(projectDiscoverCandidateFilesOutputV1(f).error.code, 'output_contract_error');
  const f2 = fixture(); f2.native.queries[0].mode = 'unsupported'; assert.equal(projectDiscoverCandidateFilesOutputV1(f2).ok, false);
  const f3 = fixture(); f3.native.queries = Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, pattern: '雪'.repeat(2000), mode: 'literal' }));
  f3.native.cells = Array.from({ length: 80 }, (_, i) => ({ ...f3.native.cells[0], queryId: `q${i % 8}`, root: '雪'.repeat(4096) }));
  const r = projectDiscoverCandidateFilesOutputV1(f3); assert.equal(r.ok, false); assert.equal(r.error.code, 'output_contract_error'); assert(jsonUTF8BytesV1(r) <= DISCOVERY_OUTPUT_LIMITS_V1.nativeBytes);
});
