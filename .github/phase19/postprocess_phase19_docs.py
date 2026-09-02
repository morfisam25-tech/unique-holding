from pathlib import Path
import json, os
P=Path(os.environ['PHASE19_PACKET'])
records=json.loads(Path(os.environ['PHASE19_RECORDS']).read_text())['records']
perf=json.loads((P/'reports/performance-adjudication.json').read_text())
f=Path('docs/qa/phase19-performance-audit.md')
text=f.read_text(encoding='utf-8')
if '## PERFORMANCE MEASUREMENT MODEL' not in text:
    lines=['','## PERFORMANCE MEASUREMENT MODEL','',
    'Phase 19 performance acceptance uses two layers rather than treating every small-sample network observation as a product-graph change.','',
    '**Layer A — deterministic product graph.** Candidate-added local resources, candidate-introduced external assets/hosts/resource classes, candidate-introduced preloads or image sources, repeatable deterministic request-frequency increases, new JS/CSS/font dependencies, unexplained deterministic transfer growth, and CLS regressions remain strict failures.','',
    '**Layer B — stochastic third-party image response.** Exact third-party image URLs are retained, but image variants are also grouped by logical asset identity. For Unsplash this is host + photo identifier. A varying variant may be adjudicated as measurement variance only when the logical asset already exists at the approved baseline, its responsible source files are unchanged by Phase 19, the intended responsive image still loads, no new host/class is introduced, no repeatable candidate increase is established, deterministic transfer remains within budget, and visual/functional regression gates pass.','',
    '**Exact URL vs logical asset.** Query parameters such as `w=1200`, `w=1800`, and `w=3000` remain visible in the evidence. Logical normalization is used only to establish whether those URLs belong to the same pre-existing image asset; it never permits a source-introduced large variant or preload.','',
    '**Source-diff authority.** The adjudicator uses the product diff and the source files containing the logical image identity. If Phase 19 changed the responsible media source, auto-adjudication is disabled and the case must be investigated as a real candidate change.','',
    '**One-sided regression rule.** Exact stochastic occurrence equality is not required. What remains prohibited is candidate-added graph surface, repeatable extra behavior, unexplained deterministic transfer increase, or CLS regression.','']
    for r in records:
        lines += [f"### {r['id']}", '', f"Classification: **{r['classification']}**  ", f"Disposition: **{r['disposition']}**", '']
        if r['id'].startswith('PERF-QA-MEASUREMENT-003'):
            lines += [f"Case: `{r['route']} / {r['width']}×{r['height']}`. The pre-existing `w=3000` Unsplash variant was observed {r['baselineObservedOccurrences']} time(s) in five baseline cold runs and {r['candidateObservedOccurrences']} time(s) in five candidate cold runs. The intended `w=1200` responsive image occurred {r['intendedBaselineOccurrences']}/5 baseline and {r['intendedCandidateOccurrences']}/5 candidate. Candidate-added URLs, hosts and resource classes were all zero.",'']
    lines += ['### Final generic adjudication summary','',f"Unresolved performance failures: **{perf['unresolvedCount']}**.",'']
    text += '\n'.join(lines)
    f.write_text(text,encoding='utf-8')
print('Phase 19 performance audit postprocessed with measurement model and PERF-QA-MEASUREMENT-003.')
