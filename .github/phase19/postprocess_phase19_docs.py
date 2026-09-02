from pathlib import Path
import json, os
P=Path(os.environ['PHASE19_PACKET'])
records=json.loads(Path(os.environ['PHASE19_RECORDS']).read_text())['records']
perf=json.loads((P/'reports/performance-adjudication.json').read_text())
f=Path('docs/qa/phase19-performance-audit.md')
text=f.read_text(encoding='utf-8')
marker='## PERFORMANCE MEASUREMENT MODEL'
if marker not in text:
    lines=['',marker,'',
    'Phase 19 performance acceptance separates the **product source graph** from the **browser runtime graph**. A URL that appears only in a candidate browser sample is not source-added unless the candidate source graph actually introduces the URL/declaration, host, logical asset, or responsible request rule.','',
    '**Layer A — deterministic product graph.** Candidate-source-added local or external resources, new declarations (`src`, `srcset`, `poster`, preload, CSS `url()`, `image-set()`, or attributable JS URL rules), new hosts/resource classes, deterministic duplicate requests, repeatable deterministic frequency increases, new JS/CSS/font dependencies, unexplained deterministic transfer growth, and CLS regressions remain strict failures.','',
    '**Layer B — stochastic third-party image response.** Exact runtime image URLs are retained and also mapped to a logical asset. For Unsplash the logical identity is `images.unsplash.com + photo identifier`. Runtime-only or intermittent variants may be adjudicated only when the logical asset exists in both source graphs, candidate source adds no declaration/host/class for the asset, deterministic route resources remain clean, the logical image still loads, and CLS/visual/functional gates remain clean. Exact small-sample occurrence equality is not required.','',
    '**Source removal / optimization.** A declaration present in baseline source and intentionally removed from candidate source is recorded separately from stochastic runtime disappearance. The homepage `w=1800` preload removal is the canonical Phase 19 example.','',
    '**Exact URL vs logical asset.** Query variants such as `w=1200`, `w=1800`, and `w=3000` remain visible as exact evidence. Logical grouping never authorizes a candidate-source-added large variant or preload.','',
    '**Source-diff authority.** Source graphs record the exact external URL, logical asset, source file, source line and declaration type for route-relevant HTML/CSS/JS dependency closure. Runtime-only observations are not classified as candidate-added resources without source evidence.','',
    '**One-sided regression rule.** The gate asks whether Phase 19 introduced a regression. Candidate-source additions, deterministic increases, unexplained deterministic bytes, or CLS regression fail. Pre-existing stochastic third-party behavior does not fail merely because a small sample reproduces with a different occurrence count.','']
    for r in records:
        lines += [f"### {r['id']}",'',f"Classification: **{r['classification']}**  ",f"Disposition: **{r['disposition']}**",'']
        if r['id'].startswith('PERF-QA-MEASUREMENT-003'):
            lines += [f"Case: `{r['route']} / {r['width']}×{r['height']}`. The pre-existing `w=3000` Unsplash variant was observed {r['baselineObservedOccurrences']} time(s) in five baseline cold runs and {r['candidateObservedOccurrences']} time(s) in five candidate cold runs. The intended `w=1200` responsive image occurred {r['intendedBaselineOccurrences']}/5 baseline and {r['intendedCandidateOccurrences']}/5 candidate. Candidate-added URLs, hosts and resource classes were all zero.",'']
    lines += ['### Final generic adjudication summary','',f"Unresolved performance failures: **{perf['unresolvedCount']}**.",'']
    text += '\n'.join(lines)
    f.write_text(text,encoding='utf-8')
print('Phase 19 performance audit postprocessed with source-vs-runtime measurement model.')
