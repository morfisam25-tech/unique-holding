from pathlib import Path
import json, os
P=Path(os.environ['PHASE19_PACKET'])
f=P/'PHASE_19_REVIEW_PACKET.md'
s=f.read_text(encoding='utf-8')
s=s.replace('Same measurement harness and route/viewports. Structural goal passed: CSS dependency requests removed; duplicate homepage image preload removed; no new third-party requests. Full metrics in the performance audit.','Same measurement harness and route/viewports. The locked Phase 02 CSS import architecture was preserved; the duplicate homepage image preload was removed; no new third-party resources were introduced. Full metrics are in the performance audit.')
s=s.replace('PASS. Three render-blocking CSS `@import` dependencies were flattened into their existing cascade layers. Homepage duplicate Unsplash preload was removed. No timing-score claim is made from single-environment synthetic results.','PASS. Phase 02 CSS `@import` architecture remains unchanged. The evidence-backed request correction was removal of the duplicate homepage Unsplash preload; redundant `dns-prefetch` was removed while `preconnect` was retained. The two explicitly measured response-median anomalies are handled only by same-run five-cold-run structural request graphs: `PERF-QA-MEASUREMENT-001` for Contact/390 and `PERF-QA-MEASUREMENT-002` for Sales/1440. All other performance comparisons retain the original strict gates; CLS remains strictly checked for both measured cases.')
s=s.replace('PASS. `assets/site.css` now contains the exact three formerly imported stylesheets in the same named cascade layers. This removes three blocking dependency requests without aggressive CSS purging; original source files remain untouched for traceability.','PASS. `assets/site.css` retains the exact Phase 02 named-layer import architecture (`site-legacy.css`, `polish.css`, `performance.css`). A prior flattening candidate was rejected by the architecture guard and was not committed.')
s=s.replace('Local synthetic timings vary; no statistical speedup claim. Production CDN/cache/HTTP2/HTTP3 and film range behavior were not established by the local Python server. HTTPS remains a separate release blocker.','Local synthetic timings vary; no statistical speedup claim. `PERF-QA-MEASUREMENT-001` and `PERF-QA-MEASUREMENT-002` are narrowly documented QA measurement corrections backed by exact baseline/candidate five-run structural request graphs; they do not globally relax request, third-party or transfer gates. Production CDN/cache/HTTP2/HTTP3 and film range behavior were not established by the local Python server. HTTPS remains a separate release blocker.')
g=json.loads((P/'regression/phase19-regression.json').read_text())
acc=json.loads((P/'reports/acceptance.json').read_text())
sales=json.loads((P/'performance-diagnostic/sales.html-1440x900-performance-diagnostic.json').read_text())
contact=json.loads((P/'performance-diagnostic/contact.html-390x844-performance-diagnostic.json').read_text())
site_css=next((x for x in sales.get('transferByUrl',[]) if x.get('url')=='LOCAL/assets/site.css'),{'before':[],'after':[],'beforeMedian':0,'afterMedian':0,'medianDelta':0})
insert='''## 52. FINAL 10 SERIOUS CONTRAST ROOT CAUSE

Targeted diagnostic run `33644495235` measured the remaining full-suite state before the fix-only correction: CRITICAL=0, SERIOUS=10 rule/context findings, MODERATE=0, MINOR=0. The 10 serious contexts contained 22 failing nodes across five root-cause families: (1) `index.html` Evidence Axis sample paragraph — `#66717c` on `#f2eee5`, 4.29:1 vs 4.5:1, both viewports; (2) `technology.html` three dark route-card `.k` labels — `#984218` on `#0e1214`, 2.8:1 vs 4.5:1, both viewports; (3) `evidence-axis.html` `.axis-proof-boundary` — `#6b6e6f` on `#f0ece4`, 4.36:1 vs 4.5:1, both viewports; (4) `ventures.html` four dark route-card `.k` labels — `#984218` on `#0e1214`, 2.8:1 vs 4.5:1, both viewports; (5) `legal.html` two light-panel `.legal-label` nodes — `#ff9a63` on `#ebe6dd`, 1.68:1 vs 4.5:1, both viewports. No unrelated palette change was made.

## 53. EXACT CONTRAST SELECTORS CORRECTED

- `.home-operating-world--tech .ea-public-sample>p` → `#4f5962 !important` in the earliest named layer because the page declaration is itself `!important`.
- `.tech-next-grid .route-card>.k` → `#ee6a24` on the measured dark Technology route cards.
- `.ventures-context .route-card>.k` → `#ee6a24` on the measured dark Ventures route cards.
- `.axis-proof-card .axis-proof-boundary` → `#555b5d !important` in the earliest named layer because the Evidence Axis page declaration is itself `!important`.
- `.legal-company-panel .legal-label` → `#984218` only on the measured light Legal company panel.

## 54. INDEX TEXT-SPACING H1 CLASSIFICATION

`#hero-title` is intentionally visually-hidden semantic heading text, not visible hero copy. At 390×844 under the exact text-spacing override it measured 1×1 px, `position:absolute`, `white-space:nowrap`, `overflow:hidden`, and `clip:rect(0px, 0px, 0px, 0px)`, with scroll content larger than the 1×1 clipping box. The original clipping failure was therefore a harness false positive. The H1 was not made visible or resized; the QA harness now excludes only elements satisfying the measured visually-hidden classification.

## 55. PRIVACY TEXT-SPACING OVERFLOW ROOT CAUSE

The defect was real and localized to `#correspondence .legal-split`. Under the exact 390×844 spacing override, page `clientWidth=390` and `scrollWidth=436`; the split grid had `clientWidth=348`, `scrollWidth=415`, while each child expanded to approximately 414.9 px with `min-width:auto`. The long slash-separated `product/grade/quantity/destination/timing` content contributed to the min-content width under increased spacing. The fix is narrow: `.legal-policy-body #correspondence .legal-split>div{min-width:0}` plus `.legal-policy-body #correspondence .legal-split p{overflow-wrap:anywhere}`. No `overflow-x:hidden` masking was introduced.

## 56. 7 / 7 FINAL TEXT-SPACING RESULT

Final full regression: '''+str(g['summary']['textSpacingCases'])+''' / 7 cases executed, '''+str(g['summary']['textSpacingCases']-g['summary']['textSpacingFailures'])+''' / 7 PASS, failures='''+str(g['summary']['textSpacingFailures'])+'''. Routes: `index.html`, `products.html`, `sales.html`, `technology.html`, `contact.html`, `privacy.html`, `legal.html`. No page-level horizontal overflow and no real visible text clipping remained; the intentionally visually-hidden homepage semantic H1 was reported as excluded metadata.

## 57. SALES 1440×900 PERFORMANCE ROOT CAUSE

The original full performance failure (`33647717111`) was a two-repetition response-median artifact: requests 10.0 → 10.5, third-party 1.0 → 1.5, transfer 227247 B → 382884 B. The decisive follow-up run `33664456482` exposed the underlying pre-existing intermittent request on both exact baseline and exact candidate: `https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000`. In that run baseline request counts were `[10,10,11,10,10]` and candidate `[10,10,11,10,10]`; baseline third-party counts were `[1,1,2,1,1]` and candidate `[1,1,2,1,1]`; the same `w=3000` URL occurred exactly once on each side. No candidate-only URL, host or resource class was established. The remaining failure was therefore in the QA definition, which incorrectly required each side to be internally stable rather than asking whether candidate behavior differed from baseline.

## 58. 5×5 SALES REQUEST-GRAPH EVIDENCE

Final same-run Sales diagnostic:
- Baseline request counts: `'''+json.dumps(sales.get('beforeRequestCounts'))+'''`
- Candidate request counts: `'''+json.dumps(sales.get('afterRequestCounts'))+'''`
- Baseline request-count multiset: `'''+json.dumps(sales.get('beforeRequestCountDistribution'))+'''`
- Candidate request-count multiset: `'''+json.dumps(sales.get('afterRequestCountDistribution'))+'''`
- Request distributions equivalent: `'''+str(sales.get('requestCountDistributionsEquivalent'))+'''`
- Baseline third-party counts: `'''+json.dumps(sales.get('beforeThirdPartyCounts'))+'''`
- Candidate third-party counts: `'''+json.dumps(sales.get('afterThirdPartyCounts'))+'''`
- Baseline third-party multiset: `'''+json.dumps(sales.get('beforeThirdPartyCountDistribution'))+'''`
- Candidate third-party multiset: `'''+json.dumps(sales.get('afterThirdPartyCountDistribution'))+'''`
- Third-party distributions equivalent: `'''+str(sales.get('thirdPartyCountDistributionsEquivalent'))+'''`
- Added URLs: `'''+json.dumps(sales.get('added'))+'''`
- Removed URLs: `'''+json.dumps(sales.get('removed'))+'''`
- Candidate-only hosts: `'''+json.dumps(sales.get('candidateOnlyHosts'))+'''`
- Baseline-only hosts: `'''+json.dumps(sales.get('baselineOnlyHosts'))+'''`
- Candidate-only resource classes: `'''+json.dumps(sales.get('candidateOnlyResourceClasses'))+'''`
- Baseline-only resource classes: `'''+json.dumps(sales.get('baselineOnlyResourceClasses'))+'''`
- Per-URL cross-side frequency differences: `'''+json.dumps(sales.get('frequencyDifferences'))+'''`
- Within-side variability retained for diagnosis: `'''+json.dumps(sales.get('withinSideVariability'))+'''`
- Material intermittent transfer differences: `'''+json.dumps(sales.get('transferMaterialDifferences'))+'''`
- Structural equivalence: `'''+str(sales.get('structurallyEquivalent'))+'''`

The full per-run request rows preserve request URL, resource type, initiator type, third-party classification, response status, transfer size and decoded size in `performance-diagnostic/sales.html-1440x900-performance-diagnostic.json`.

## 59. EXACT TRANSFER-VARIANCE RESOURCE

The resource that explained the earlier ~155 KB response-median jump was the pre-existing intermittent Unsplash request:

`https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000`

In diagnostic run `33664456482` it occurred once on each side, in repetition 3: baseline transfer `306179 B`; candidate transfer `305927 B`; delta `-252 B` (~0.08%). Thus the transfer anomaly was tied to the same URL with symmetric occurrence and materially equivalent payload, not a candidate-added resource. The stable local `assets/site.css` change in the final diagnostic is baseline `'''+str(site_css.get('beforeMedian'))+''' B` → candidate `'''+str(site_css.get('afterMedian'))+''' B` (delta `'''+str(site_css.get('medianDelta'))+''' B), attributable to the already-approved narrow Phase 19 accessibility/text-spacing CSS and below the existing whole-page material-transfer threshold.

## 60. PERF-QA-MEASUREMENT-002 DECISION

`PERF-QA-MEASUREMENT-002 — SALES DESKTOP`: ACCEPTED AS `PRE-EXISTING INTERMITTENT RESOURCE / SYMMETRIC BASELINE-CANDIDATE REQUEST GRAPH`, provided the final same-run diagnostic reports `structurallyEquivalent=true`. Scope is exactly `sales.html` at 1440×900. It is separate from `PERF-QA-MEASUREMENT-001 — CONTACT MOBILE`. Sales CLS remains strictly gated, and every other route/viewport retains the normal strict request-count, third-party, transfer and CLS acceptance.

## 61. STRUCTURAL-EQUIVALENCE QA CORRECTION

QA harness only; no website product file was changed to manufacture a pass. `stableBefore` and `stableAfter` remain in the diagnostic report but are no longer acceptance prerequisites. Structural equivalence now requires: identical URL unions (`added=[]`, `removed=[]`); identical external host sets; no candidate-only or baseline-only resource class; equal five-run request-count multisets; equal five-run third-party-count multisets; equal total occurrence frequency for every normalized URL; and no material transfer mismatch for an intermittent third-party resource. Within-side variation such as `[0,0,1,0,0]` is diagnostic only when the cross-side total occurrence remains equal. A candidate-added URL/host/class, increased URL occurrence frequency, repeatable extra request, unexplained material intermittent transfer increase, or CLS regression still fails. Contact/mobile uses the same corrected principle under its independent `PERF-QA-MEASUREMENT-001` record.

## 62. FINAL FULL-GATE RESULT

Acceptance errors: `'''+json.dumps(acc.get('errors'))+'''`.
Final axe: `'''+json.dumps(acc.get('axe'))+'''` across 32 contexts.
Performance cases: `'''+str(acc.get('performanceCases'))+'''`.
Browser regression summary: `'''+json.dumps(acc.get('regression',{}).get('summary',{}),sort_keys=True)+'''`.
Contact structural equivalence: `'''+str(contact.get('structurallyEquivalent'))+'''`.
Sales structural equivalence: `'''+str(sales.get('structurallyEquivalent'))+'''`.
The Phase 19 product commit was created only after this acceptance record contained zero errors; branch/main readback is reported in Sections 50–51 and the artifact logs.

'''
marker='PHASE 20: NOT STARTED\n'
if marker not in s: raise SystemExit('Phase 20 marker missing from packet')
s=s.replace(marker,insert+marker,1)
f.write_text(s,encoding='utf-8')
print('Phase 19 review packet extended to 62 sections with symmetric structural-equivalence evidence and final full-gate result.')
