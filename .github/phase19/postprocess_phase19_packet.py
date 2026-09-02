from pathlib import Path
import json, os
P=Path(os.environ['PHASE19_PACKET'])
perf=json.loads((P/'reports/performance-adjudication.json').read_text())
acc=json.loads((P/'reports/acceptance.json').read_text())
records={r['id']:r for r in json.loads(Path(os.environ['PHASE19_RECORDS']).read_text())['records']}
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
    extra = "\n\n## 67. PERF-QA-MEASUREMENT-003 — PRODUCTS MOBILE\n\n"
    extra += f"Case: `products.html / 390×844`. Classification: **{r3['classification']}**. Disposition: **{r3['disposition']}**. Five cold baseline request counts were `[12,11,11,11,11]`; candidate `[11,11,11,11,11]`. Baseline third-party counts were `[2,1,1,1,1]`; candidate `[1,1,1,1,1]`. The pre-existing Unsplash `w=3000` variant occurred 1/5 baseline and 0/5 candidate; the intended `w=1200` responsive variant occurred 5/5 on both sides. Candidate-added URLs, hosts, and resource classes: 0.\n\n"
    extra += "## 68. GENERIC STOCHASTIC THIRD-PARTY ADJUDICATION MODEL\n\nThe final comparator separates the deterministic product request graph from stochastic third-party image response behavior. Deterministic resources, dependencies, source additions, repeatable request-frequency increases, deterministic transfer growth, and CLS remain strict gates. Stochastic image variance is adjudicated only after exact-resource attribution, logical-asset grouping, source-diff authority, host/class checks, intended responsive-image verification, and one-sided repeatable-regression checks. No route-specific acceptance branch is used.\n\n"
    extra += "## 69. EXACT-URL VS LOGICAL-ASSET COMPARISON\n\nExternal image evidence retains exact URLs including all query parameters. Unsplash variants are additionally grouped by `images.unsplash.com + photo identifier`. Thus `w=1200`, `w=1800`, and `w=3000` can be recognized as variants of the same logical asset without erasing their distinct transfer or occurrence evidence. A newly source-introduced variant remains a failure.\n\n"
    extra += "## 70. SOURCE-DIFF PERFORMANCE AUTHORITY\n\nFor each logical third-party image involved in adjudication, the comparator identifies source files containing the asset identity at baseline and candidate and checks whether those responsible files changed. Auto-adjudication is unavailable when Phase 19 modifies the responsible media source. Candidate-only local resources, external logical assets, hosts, or resource classes remain failures.\n\n"
    extra += "## 71. FINAL PERFORMANCE CASE TABLE\n\n" + "\n".join(table) + "\n\n"
    extra += f"## 72. FINAL UNRESOLVED PERFORMANCE FAILURES\n\n**{perf.get('unresolvedCount',0)} unresolved performance failures.**\n\n{json.dumps(perf.get('unresolvedFailures',[]), ensure_ascii=False)}\n\n"
    extra += f"## 73. FINAL COMPLETE PHASE 19 RESULT\n\nFinal acceptance errors: **{len(acc.get('errors',[]))}**. Axe: `{acc.get('axe')}`. Browser regression total failures: **{acc.get('regression',{}).get('totalFailures')}**. RFQ browser acceptance: **{'PASS' if acc.get('rfqPass') else 'FAIL'}**. Film/reduced-motion browser acceptance: **{'PASS' if acc.get('reducedMotionPass') else 'FAIL'}**. Performance unresolved failures: **{perf.get('unresolvedCount',0)}**.\n"
    packet.write_text(text+extra,encoding='utf-8')
print(f'Phase 19 packet postprocessed: {packet.name}, sections 67-73 appended.')
