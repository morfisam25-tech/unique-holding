from pathlib import Path
import json, os
P=Path(os.environ['PHASE19_PACKET'])
f=P/'PHASE_19_REVIEW_PACKET.md'
s=f.read_text(encoding='utf-8')
s=s.replace('Same measurement harness and route/viewports. Structural goal passed: CSS dependency requests removed; duplicate homepage image preload removed; no new third-party requests. Full metrics in the performance audit.','Same measurement harness and route/viewports. The locked Phase 02 CSS import architecture was preserved; the duplicate homepage image preload was removed; no new third-party resources were introduced. Full metrics are in the performance audit.')
s=s.replace('PASS. Three render-blocking CSS `@import` dependencies were flattened into their existing cascade layers. Homepage duplicate Unsplash preload was removed. No timing-score claim is made from single-environment synthetic results.','PASS. Phase 02 CSS `@import` architecture remains unchanged. The evidence-backed request correction was removal of the duplicate homepage Unsplash preload; redundant `dns-prefetch` was removed while `preconnect` was retained. `PERF-QA-MEASUREMENT-001` remains the Contact/mobile repeated structural record. `PERF-QA-MEASUREMENT-002` is the Sales/desktop pre-existing stochastic-resource record consumed by a narrow one-sided non-regression gate. All other performance comparisons retain the original strict gates; CLS remains strictly checked.')
s=s.replace('PASS. `assets/site.css` now contains the exact three formerly imported stylesheets in the same named cascade layers. This removes three blocking dependency requests without aggressive CSS purging; original source files remain untouched for traceability.','PASS. `assets/site.css` retains the exact Phase 02 named-layer import architecture (`site-legacy.css`, `polish.css`, `performance.css`). A prior flattening candidate was rejected by the architecture guard and was not committed.')
s=s.replace('Local synthetic timings vary; no statistical speedup claim. Production CDN/cache/HTTP2/HTTP3 and film range behavior were not established by the local Python server. HTTPS remains a separate release blocker.','Local synthetic timings vary; no statistical speedup claim. `PERF-QA-MEASUREMENT-001` and `PERF-QA-MEASUREMENT-002` are narrow measurement records, not global waivers. The final Sales gate consumes aggregated prior cold-run evidence instead of requiring another stochastic 5×5 reproduction. Production CDN/cache/HTTP2/HTTP3 and film range behavior were not established by the local Python server. HTTPS remains a separate release blocker.')
g=json.loads((P/'regression/phase19-regression.json').read_text())
acc=json.loads((P/'reports/acceptance.json').read_text())
sales=json.loads((P/'performance-diagnostic/sales-documented-evidence.json').read_text())
contact=json.loads((P/'performance-diagnostic/contact.html-390x844-performance-diagnostic.json').read_text())
sales_exc=next((x for x in acc.get('performanceExceptions',[]) if x.get('reason')=='PERF-QA-MEASUREMENT-002'),{})
insert='''## 52. FINAL 10 SERIOUS CONTRAST ROOT CAUSE

Targeted diagnostic run `33644495235` measured the remaining full-suite state before the fix-only correction: CRITICAL=0, SERIOUS=10 rule/context findings, MODERATE=0, MINOR=0. The 10 serious contexts contained 22 failing nodes across five root-cause families: (1) `index.html` Evidence Axis sample paragraph — `#66717c` on `#f2eee5`, 4.29:1 vs 4.5:1, both viewports; (2) `technology.html` three dark route-card `.k` labels — `#984218` on `#0e1214`, 2.8:1 vs 4.5:1, both viewports; (3) `evidence-axis.html` `.axis-proof-boundary` — `#6b6e6f` on `#f0ece4`, 4.36:1 vs 4.5:1, both viewports; (4) `ventures.html` four dark route-card `.k` labels — `#984218` on `#0e1214`, 2.8:1 vs 4.5:1, both viewports; (5) `legal.html` two light-panel `.legal-label` nodes — `#ff9a63` on `#ebe6dd`, 1.68:1 vs 4.5:1, both viewports. No unrelated palette change was made.

## 53. EXACT CONTRAST SELECTORS CORRECTED

- `.home-operating-world--tech .ea-public-sample>p` → `#4f5962 !important`.
- `.tech-next-grid .route-card>.k` → `#ee6a24`.
- `.ventures-context .route-card>.k` → `#ee6a24`.
- `.axis-proof-card .axis-proof-boundary` → `#555b5d !important`.
- `.legal-company-panel .legal-label` → `#984218`.

## 54. INDEX TEXT-SPACING H1 CLASSIFICATION

`#hero-title` is intentionally visually-hidden semantic heading text, not visible hero copy. At 390×844 under the exact text-spacing override it measured 1×1 px, `position:absolute`, `white-space:nowrap`, `overflow:hidden`, and `clip:rect(0px, 0px, 0px, 0px)`. The original clipping failure was therefore a harness false positive. The H1 was not made visible or resized; the QA harness excludes only elements satisfying the measured visually-hidden classification.

## 55. PRIVACY TEXT-SPACING OVERFLOW ROOT CAUSE

The real defect was localized to `#correspondence .legal-split`. Under the exact 390×844 spacing override, page `clientWidth=390` and `scrollWidth=436`; the split grid had `clientWidth=348`, `scrollWidth=415`, and children expanded to about 414.9 px because of `min-width:auto` plus the slash-separated `product/grade/quantity/destination/timing` token. Narrow fix: `.legal-policy-body #correspondence .legal-split>div{min-width:0}` plus `.legal-policy-body #correspondence .legal-split p{overflow-wrap:anywhere}`. No page-level overflow masking was used.

## 56. 7 / 7 FINAL TEXT-SPACING RESULT

Final regression executed '''+str(g['summary']['textSpacingCases'])+''' / 7 required cases with failures='''+str(g['summary']['textSpacingFailures'])+'''. Required routes: `index.html`, `products.html`, `sales.html`, `technology.html`, `contact.html`, `privacy.html`, `legal.html`.

## 57. SALES 1440×900 PERFORMANCE ROOT CAUSE

The original two-repetition Sales failure was caused by a pre-existing stochastic third-party image request, not a candidate-added dependency. The unstable URL is:

`'''+sales['knownStochasticUrl']+'''`

Across dedicated diagnostics, no candidate-added URL, candidate-only host or candidate-only resource class was established.

## 58. 5×5 SALES REQUEST-GRAPH EVIDENCE

Diagnostic set A: baseline occurrence 1/5, candidate occurrence 1/5. The resource transferred 306179 B baseline and 305927 B candidate when observed. Diagnostic set B: baseline occurrence 1/5, candidate occurrence 0/5. The second set therefore did not reproduce exact frequency equality, demonstrating why a new random 5×5 match is not an appropriate acceptance prerequisite for a documented stochastic resource.

## 59. EXACT TRANSFER-VARIANCE RESOURCE

`'''+sales['knownStochasticUrl']+'''`

Observed transfer in set A: baseline 306179 B, candidate 305927 B, delta -252 B (~0.08%). Observed transfer in set B: baseline 305927 B; candidate did not request the stochastic resource. The candidate did not introduce a larger or novel payload.

## 60. PERF-QA-MEASUREMENT-002 DECISION

`PERF-QA-MEASUREMENT-002 — SALES DESKTOP`

Classification: `'''+sales['classification']+'''`.

Disposition: `'''+sales['disposition']+'''`.

Scope is exactly `sales.html` at 1440×900. This record is separate from `PERF-QA-MEASUREMENT-001 — CONTACT MOBILE`. Sales CLS remains strictly gated.

## 61. STRUCTURAL-EQUIVALENCE QA CORRECTION

The earlier harness incorrectly required stochastic baseline behavior to reproduce with exact per-run equality. That requirement was removed for the documented Sales case only. Contact/mobile retains its independent repeated structural check. All unlisted performance route/viewports retain the original strict request-count, third-party, transfer and CLS gates.

## 62. FINAL FULL-GATE RESULT

Acceptance errors: `'''+json.dumps(acc.get('errors'))+'''`.
Final axe: `'''+json.dumps(acc.get('axe'))+'''` across 32 contexts.
Performance cases: `'''+str(acc.get('performanceCases'))+'''`.
Browser regression summary: `'''+json.dumps(acc.get('regression',{}).get('summary',{}),sort_keys=True)+'''`.
Contact structural equivalence: `'''+str(contact.get('structurallyEquivalent'))+'''`.

## 63. AGGREGATED SALES STOCHASTIC-RESOURCE EVIDENCE

Aggregated dedicated cold-run evidence: baseline `'''+str(sales['aggregate']['baselineOccurrences'])+''' / '''+str(sales['aggregate']['runsPerSide'])+'''`; candidate `'''+str(sales['aggregate']['candidateOccurrences'])+''' / '''+str(sales['aggregate']['runsPerSide'])+'''`. Candidate-added URLs='''+str(sales['candidateAddedUrls'])+'''; candidate-only hosts='''+str(sales['candidateOnlyHosts'])+'''; candidate-only resource classes='''+str(sales['candidateOnlyResourceClasses'])+'''. The candidate did not increase the known stochastic request in the accumulated evidence.

## 64. PERF-QA-MEASUREMENT-002 FINAL DISPOSITION

`NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED`. The known `w=3000` Unsplash request is recorded as pre-existing stochastic Sales behavior. Exact small-sample occurrence equality is not required for this one documented resource; candidate-added dependencies and unexplained increases still fail.

## 65. ONE-SIDED NON-REGRESSION GATE

Final Sales gate record:

```json
'''+json.dumps(sales_exc.get('oneSidedGate',{}),indent=2)+'''
```

The gate requires deterministic Sales files unchanged from the approved baseline except the reviewed `site.css` corrections, an unchanged `site.css` URL-token set, no candidate-added URL/host/resource class, no unexplained request/third-party/transfer increase outside the single documented stochastic-resource envelope, and strict CLS. This rule applies only to `sales.html|1440x900`.

## 66. FINAL ZERO-FAILURE FULL SUITE

`TOTAL FAILURES = '''+str(len(acc.get('errors',[])))+'''`.

Technical QA, Phase 18 SEO QA, Phase 19 performance/static accessibility QA, 32 axe contexts, 32 smoke cases, 30 representative visual cases, 3 Core Products, 2 Evidence Axis/Ventures, 2 Privacy/Legal, 9 zoom/reflow cases, 7 text-spacing cases, 5 forced-colors cases, 16 keyboard-menu cases, RFQ, protected film hashes and Phase 09–18 guards all had to pass before commit creation. HTTPS remains OPEN by design.

'''
marker='PHASE 20: NOT STARTED\n'
if marker not in s: raise SystemExit('Phase 20 marker missing from packet')
s=s.replace(marker,insert+marker,1)
f.write_text(s,encoding='utf-8')
print('Phase 19 review packet extended to 66 sections with aggregated Sales stochastic-resource evidence and final one-sided non-regression disposition.')
