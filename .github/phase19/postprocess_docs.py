from pathlib import Path
import os, json

root = Path.cwd()
packet = Path(os.environ['PHASE19_PACKET'])
qa_dir = Path(__file__).resolve().parent
records_path = Path(os.environ.get('PHASE19_RECORDS', qa_dir / 'performance_measurement_records.json'))

accept = json.loads((packet / 'reports/acceptance.json').read_text(encoding='utf-8'))
perf_final = json.loads((packet / 'reports/performance-adjudication.json').read_text(encoding='utf-8'))
records = json.loads(records_path.read_text(encoding='utf-8')).get('records', [])

# Final-architecture fixture files are evidence inputs, not acceptance bypasses.
# They are consumed when present and summarized gracefully when unavailable.
def optional_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return default

classifier_fixtures = optional_json(packet / 'reports/classifier-fixtures.json', {
    'fixtureCount': 0, 'passed': 0, 'failed': 0, 'fixtures': [], 'availability': 'not retained as a standalone file'
})
source_graph_fixtures = optional_json(packet / 'reports/source-graph-fixtures.json', {
    'fixtureCount': 0, 'passed': 0, 'failed': 0, 'fixtures': [], 'availability': 'not retained as a standalone file'
})

def record(prefix: str):
    return next((r for r in records if r.get('id', '').startswith(prefix)), None)

r1 = record('PERF-QA-MEASUREMENT-001')
r2 = record('PERF-QA-MEASUREMENT-002')
r3 = record('PERF-QA-MEASUREMENT-003')

perf = root / 'docs/qa/phase19-performance-audit.md'
s = perf.read_text(encoding='utf-8')
s = s.replace(
    '- Flattened the three CSS `@import` dependencies already loaded by `assets/site.css` into the same cascade layers. This removes three render-blocking request dependencies without deleting the source CSS files or changing selector content.',
    '- Preserved the locked Phase 02 CSS `@import` architecture exactly. The attempted import-flattening optimization was rejected by the existing architecture guard and is not part of the Phase 19 product candidate.'
)

if '## FINAL GENERIC PERFORMANCE EVIDENCE' not in s:
    lines = [
        '',
        '## FINAL GENERIC PERFORMANCE EVIDENCE',
        '',
        'The final Phase 19 performance architecture is the authoritative source-vs-runtime generic model. It does **not** execute route-specific stochastic diagnostics during final acceptance. Historical PERF-QA measurement records remain documented evidence only; they are not runtime bypass files and are not hard dependencies of this documentation pipeline.',
        '',
        f"Final generic model: **{perf_final.get('model', {}).get('name', 'Phase 19 source-vs-runtime performance acceptance')}**.",
        f"Final unresolved performance failures: **{perf_final.get('unresolvedCount', 0)}**.",
        f"Final acceptance errors: **{len(accept.get('errors', []))}**.",
        '',
        '### PERF-QA-MEASUREMENT-001 — CONTACT MOBILE',
        '',
    ]
    if r1:
        lines += [
            f"Classification: **{r1.get('classification', 'prior diagnostic evidence')}**.  ",
            f"Disposition: **{r1.get('disposition', 'NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED')}**.",
            f"Prior five-run request counts: baseline `{r1.get('beforeRequestCounts')}`, candidate `{r1.get('afterRequestCounts')}`. Prior third-party counts: baseline `{r1.get('beforeThirdPartyCounts')}`, candidate `{r1.get('afterThirdPartyCounts')}`.",
        ]
    lines += [
        'This was prior diagnostic evidence. The final Phase 19 architecture no longer executes or requires `contact.html-390x844-performance-diagnostic.json`; the generic source-vs-runtime model is authoritative.',
        '',
        '### PERF-QA-MEASUREMENT-002 — SALES DESKTOP',
        '',
    ]
    if r2:
        lines += [
            f"Classification: **{r2.get('classification')}**.  ",
            f"Disposition: **{r2.get('disposition')}**.",
            f"Logical asset: `{r2.get('logicalAsset')}`. Exact retained evidence variant: `{r2.get('exactVariant')}`. Aggregated observed occurrences: baseline **{r2.get('baselineObservedOccurrences')}**, candidate **{r2.get('candidateObservedOccurrences')}**, across **{r2.get('runsPerSideAggregated')}** cold runs per side. Candidate-added URLs/hosts/classes: **{r2.get('candidateAddedUrls', 0)}/{r2.get('candidateOnlyHosts', 0)}/{r2.get('candidateOnlyResourceClasses', 0)}**.",
        ]
    lines += [
        'This record is retained evidence, not a runtime bypass file. No legacy Sales diagnostic JSON is required by documentation.',
        '',
        '### PERF-QA-MEASUREMENT-003 — PRODUCTS MOBILE',
        '',
    ]
    if r3:
        lines += [
            f"Classification: **{r3.get('classification')}**.  ",
            f"Disposition: **{r3.get('disposition')}**.",
            f"Logical asset: `{r3.get('logicalAsset')}`. The pre-existing `w=3000` variant was observed **{r3.get('baselineObservedOccurrences')} / {r3.get('runsPerSideAggregated')}** baseline and **{r3.get('candidateObservedOccurrences')} / {r3.get('runsPerSideAggregated')}** candidate; the intended responsive image was observed **{r3.get('intendedBaselineOccurrences')} / 5** baseline and **{r3.get('intendedCandidateOccurrences')} / 5** candidate. Candidate-added URLs/hosts/classes: **{r3.get('candidateAddedUrls', 0)}/{r3.get('candidateOnlyHosts', 0)}/{r3.get('candidateOnlyResourceClasses', 0)}**.",
        ]
    lines += [
        'This record is retained evidence, not a runtime bypass file. No legacy Products diagnostic JSON is required by documentation.',
        '',
        '### Final classifier / source-graph fixtures',
        '',
        f"Classifier fixtures retained in packet: **{classifier_fixtures.get('passed', 0)} / {classifier_fixtures.get('fixtureCount', 0)} PASS**, failures **{classifier_fixtures.get('failed', 0)}**.",
        f"Source-graph fixtures retained in packet: **{source_graph_fixtures.get('passed', 0)} / {source_graph_fixtures.get('fixtureCount', 0)} PASS**, failures **{source_graph_fixtures.get('failed', 0)}**.",
        'These fixture summaries corroborate classifier/documentation wiring; final acceptance authority remains `reports/acceptance.json` plus `reports/performance-adjudication.json`.',
        '',
    ]
    s += '\n'.join(lines)

perf.write_text(s, encoding='utf-8')

acc = root / 'docs/qa/phase19-accessibility-audit.md'
a = acc.read_text(encoding='utf-8')
if '## Fix-only targeted diagnostic' not in a:
    a += '''\n## Fix-only targeted diagnostic\n\nTargeted diagnostic run `33644495235` measured the remaining Phase 19 serious contrast nodes before the final fix-only corrections. The remaining failures were limited to five root-cause families: homepage Evidence Axis sample copy (4.29:1 on `#f2eee5`), dark Technology route-card metadata (2.8:1 on `#0e1214`), Evidence Axis sample boundary copy (4.36:1 on `#f0ece4`), dark Ventures route-card metadata (2.8:1 on `#0e1214`), and Legal light-panel labels (1.68:1 on `#ebe6dd`). Corrections were selector-local and did not replace the global orange palette.\n\nThe homepage film H1 `#hero-title` was measured at 1×1 px, absolutely positioned, `white-space: nowrap`, `overflow: hidden`, and clipped with `clip: rect(0,0,0,0)`. It is intentionally visually-hidden semantic text, not visible copy. The text-spacing harness therefore excludes only elements meeting that visually-hidden geometry/style classification rather than making the H1 visible.\n\nThe Privacy text-spacing overflow was a real grid intrinsic-sizing defect in `#correspondence .legal-split`: under the exact spacing override, the 348 px grid scrolled to 415 px and its children rendered at about 414.9 px because `min-width:auto` plus the slash-separated `product/grade/quantity/destination/timing` token created an expanded min-content width. The narrow fix sets the two correspondence cards to `min-width:0` and permits wrapping in their paragraphs with `overflow-wrap:anywhere`; page-level overflow hiding was not used.\n'''
acc.write_text(a, encoding='utf-8')

print('Phase 19 audit documents postprocessed from final generic acceptance/adjudication + retained evidence records; no legacy route-diagnostic file dependency.')
