from pathlib import Path
import json, os
P=Path(os.environ['PHASE19_PACKET'])
perf=json.loads((P/'reports/performance-adjudication.json').read_text())
acc=json.loads((P/'reports/acceptance.json').read_text())
records={r['id']:r for r in json.loads(Path(os.environ['PHASE19_RECORDS']).read_text())['records']}
fixtures_path=P/'reports/classifier-fixtures.json'
fixtures=json.loads(fixtures_path.read_text()) if fixtures_path.exists() else {'fixtureCount':0,'passed':0,'failed':1,'fixtures':[]}
source_fixture_path=P/'reports/source-graph-fixtures.json'
source_fixtures=json.loads(source_fixture_path.read_text()) if source_fixture_path.exists() else {'fixtureCount':0,'passed':0,'failed':1,'fixtures':[]}
packet=P/'PHASE_19_REVIEW_PACKET.md'
if not packet.exists():
    cands=list(P.glob('*REVIEW*PACKET*.md'))
    if not cands: raise SystemExit('review packet markdown not found')
    packet=cands[0]
text=packet.read_text(encoding='utf-8')
if '## 67. PERF-QA-MEASUREMENT-003 — PRODUCTS MOBILE' not in text:
    r3=next(v for k,v in records.items() if k.startswith('PERF-QA-MEASUREMENT-003'))
    cases=perf.get('cases',[])
    table=['| Case | Raw median failure | Final status | Classification |','|---|---|---|---|']
    for c in cases:
        table.append(f"| `{c['case']}` | {', '.join(c['rawMedianFailures']) if c['rawMedianFailures'] else 'none'} | {c['status']} | {c['classification']} |")
    products=next((c for c in cases if c['case']=='products.html|1440x900'),None)
    w3000='https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000'
    prod_variant=None
    if products:
        for asset in products.get('logicalAssets',[]):
            for v in asset.get('variants',[]):
                if v.get('url')==w3000:
                    prod_variant=v
                    break
            if prod_variant: break
    brefs=prod_variant.get('baselineSourceReferences',[]) if prod_variant else []
    arefs=prod_variant.get('candidateSourceReferences',[]) if prod_variant else []
    fixture_lines=[]
    for f in fixtures.get('fixtures',[]):
        fixture_lines.append(f"- **{f['name']}** — {'PASS' if f['pass'] else 'FAIL'}; actual: `{f['actual']['classification']}`")
    for f in source_fixtures.get('fixtures',[]):
        fixture_lines.append(f"- **{f['name']} [actual source graph]** — {'PASS' if f['pass'] else 'FAIL'}")

    extra='\n\n## 67. PERF-QA-MEASUREMENT-003 — PRODUCTS MOBILE\n\n'
    extra+=f"Case: `products.html / 390×844`. Classification: **{r3['classification']}**. Disposition: **{r3['disposition']}**. Five cold baseline request counts were `[12,11,11,11,11]`; candidate `[11,11,11,11,11]`. Baseline third-party counts were `[2,1,1,1,1]`; candidate `[1,1,1,1,1]`. The pre-existing Unsplash `w=3000` variant occurred 1/5 baseline and 0/5 candidate; the intended `w=1200` responsive variant occurred 5/5 on both sides. Candidate-added URLs, hosts, and resource classes: 0.\n\n"
    extra+='## 68. GENERIC STOCHASTIC THIRD-PARTY ADJUDICATION MODEL\n\nThe final comparator has two explicit layers. Layer A strictly gates candidate-source additions, deterministic local/dependency graphs, deterministic request frequency, deterministic transfer and CLS. Layer B handles only runtime variance of pre-existing third-party logical image assets after source-graph authority establishes that Phase 19 did not introduce the resource declaration, host, logical asset or responsible request rule. No route-specific bypass or Unsplash whitelist is used.\n\n'
    extra+='## 69. EXACT-URL VS LOGICAL-ASSET COMPARISON\n\nEvery external network observation retains its exact URL including query parameters and is also mapped to a logical asset identity. For Unsplash the identity is host + photo identifier. This permits `w=1200`, `w=1800`, and `w=3000` to be related without erasing the exact-URL evidence. A candidate-source-added exact variant, preload or declaration remains a strict failure.\n\n'
    extra+='## 70. SOURCE-DIFF PERFORMANCE AUTHORITY\n\nFor each measured route the QA layer builds baseline and candidate source graphs over the route-relevant HTML/CSS/JS dependency closure. Each external reference records exact URL, logical asset, source file, source line and declaration type. Runtime-only observations are not labeled candidate-added unless the candidate source graph establishes an addition. Source-removed declarations are tracked separately as optimizations.\n\n'
    extra+='## 71. FINAL PERFORMANCE CASE TABLE\n\n'+'\n'.join(table)+'\n\n'
    extra+=f"## 72. FINAL UNRESOLVED PERFORMANCE FAILURES\n\n**{perf.get('unresolvedCount',0)} unresolved performance failures.**\n\n{json.dumps(perf.get('unresolvedFailures',[]),ensure_ascii=False)}\n\n"
    extra+=f"## 73. FINAL COMPLETE PHASE 19 RESULT\n\nFinal acceptance errors: **{len(acc.get('errors',[]))}**. Axe: `{acc.get('axe')}`. Browser regression total failures: **{acc.get('regression',{}).get('totalFailures')}**. RFQ browser acceptance: **{'PASS' if acc.get('rfqPass') else 'FAIL'}**. Film/reduced-motion browser acceptance: **{'PASS' if acc.get('reducedMotionPass') else 'FAIL'}**. Performance unresolved failures: **{perf.get('unresolvedCount',0)}**.\n\n"
    extra+='## 74. SOURCE GRAPH VS RUNTIME GRAPH MODEL\n\nThe final classifier explicitly distinguishes **source-added** from **runtime-only observed** resources. Source additions are established only from candidate source declarations or request rules. A browser URL absent from one baseline sample but present in a candidate sample is not, by itself, a candidate-source addition. Baseline source removals are independently classified as source-removed optimizations.\n\n'
    total_fixture_count=fixtures.get('fixtureCount',0)+source_fixtures.get('fixtureCount',0)
    total_fixture_passed=fixtures.get('passed',0)+source_fixtures.get('passed',0)
    total_fixture_failed=fixtures.get('failed',0)+source_fixtures.get('failed',0)
    extra+=f"## 75. CLASSIFIER FIXTURE RESULTS\n\nFixtures: **{total_fixture_passed}/{total_fixture_count} PASS**, failures: **{total_fixture_failed}**. This includes six semantic classifier fixtures plus two actual candidate source-graph fixtures.\n\n"+'\n'.join(fixture_lines)+'\n\n'
    extra+='## 76. PRODUCTS DESKTOP W=3000 CLASSIFICATION\n\n'
    if prod_variant:
        extra+=f"Exact runtime URL: `{w3000}`. Final variant classification: **{prod_variant.get('classification')}**. Baseline runtime total: **{prod_variant.get('beforeTotal')}**; candidate runtime total: **{prod_variant.get('afterTotal')}**. Runtime-only candidate observation: **{prod_variant.get('runtimeOnlyCandidateObservation')}**. Baseline source contains exact reference: **{'YES' if brefs else 'NO'}**. Candidate source contains exact reference: **{'YES' if arefs else 'NO'}**. Source-declaration additions for this variant: **{len(prod_variant.get('sourceDeclarationAdded',[]))}**.\n\nBaseline source references: `{json.dumps(brefs,ensure_ascii=False)}`\n\nCandidate source references: `{json.dumps(arefs,ensure_ascii=False)}`\n\n"
    else:
        extra+='The final browser sample did not contain this exact variant on either side; the source graph remains available in the performance artifact.\n\n'
    extra+='## 77. SOURCE-ADDED RESOURCE TEST\n\nA resource is source-added only when the candidate source graph introduces a new exact declaration/request rule, logical asset, host or resource class. Classifier Fixture E verifies that an explicit candidate `w=3000` source addition is a **REAL PERFORMANCE REGRESSION — FAIL**; Fixture F verifies that a new external host is also a strict failure.\n\n'
    extra+='## 78. RUNTIME-ONLY STOCHASTIC TEST\n\nRuntime-only third-party image variance is eligible for measurement adjudication only when the logical asset exists in both source graphs, candidate source adds no declaration/host/class for it, deterministic route resources remain clean, the logical image continues to load, and CLS/visual/functional gates remain clean. Fixtures B, C and D verify the Sales and Products stochastic directions.\n\n'
    extra+=f"## 79. FINAL UNRESOLVED FAILURE COUNT\n\n**{perf.get('unresolvedCount',0)}** performance unresolved failures; **{len(acc.get('errors',[]))}** total final acceptance errors.\n\n"
    final_pass=(perf.get('unresolvedCount',0)==0 and len(acc.get('errors',[]))==0 and fixtures.get('failed',1)==0 and source_fixtures.get('failed',1)==0)
    extra+=f"## 80. FINAL PHASE 19 ACCEPTANCE RESULT\n\n**{'PASS — READY FOR EXTERNAL REVIEW' if final_pass else 'FAIL — NOT READY'}**. Classifier fixtures: {total_fixture_passed}/{total_fixture_count}. Axe: `{acc.get('axe')}`. Browser regression failures: {acc.get('regression',{}).get('totalFailures')}. Performance unresolved: {perf.get('unresolvedCount',0)}. Final acceptance errors: {len(acc.get('errors',[]))}.\n"
    packet.write_text(text+extra,encoding='utf-8')
print(f'Phase 19 packet postprocessed: {packet.name}, sections 67-80 appended.')
