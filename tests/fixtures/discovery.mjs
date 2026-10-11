export function fixture() {
  const match = { path: 'src/雪.txt', line: 1, column: 0, text: '雪 evidence', textTruncated: false };
  const native = { workspaceRoot: '/fixture', requestedRoots: ['/fixture/src'], rootDiagnostics: [], queries: [{ id: 'q1', pattern: '雪', mode: 'literal', caseSensitive: false }],
    roots: [{ path: '/fixture/src', displayPath: 'src', ignoreFiles: ['/private/ignore'], exclusions: [], disclosures: [], explicitRoot: true, filterBypassed: false, filterDecision: 'skipped', filterDecisionCodes: [] }],
    cells: [{ queryId: 'q1', root: '/fixture/src', status: 'matched', matches: [match], appliedIgnoreFiles: ['/private/ignore'], filterExclusions: [], filterDecision: 'skipped', disclosures: [], exitCode: 0 }],
    candidates: [{ path: match.path, queryIds: ['q1'], roots: ['/fixture/src'], matchCount: 1, score: 1101, excerpts: [match] }], coverage: { ranCellCount: 1, completeCellCount: 1, incompleteCellCount: 0, negativeEvidenceCellCount: 0 }, completeness: 'complete',
    filters: { mode: 'recommended', filteringDegraded: false, explicitRootOverride: false, includeHidden: false, globs: [], requested: {}, effective: { maxMatches: 80, maxMatchesPerFile: 5, maxSnippetChars: 240 } }, providerOutcomes: [], filterDecisions: [], retrySuggestions: [], outputMode: 'compact' };
  return { text: 'Candidate files: src/雪.txt', native, reportTruncated: false, details: { candidates: native.candidates }, provenance: { schema: '@aefree/pi-file-discovery/execution-provenance', version: 1, canonical: { serviceId: 'file-discovery.ripgrep', packageName: '@aefree/pi-file-discovery', packageVersion: '0.1.5', contractVersion: 1 }, providers: [], fallbacks: [] } };
}
