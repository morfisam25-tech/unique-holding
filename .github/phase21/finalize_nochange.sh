#!/usr/bin/env bash
set -euo pipefail
BASE='b247b536eda5b1f48ada5b6a09c657b324d289f1'
PARENT='8d2811298c668865f5438f86337c9d8f9d959c80'
TREE='30a289aaf26cb1944baf76a5d9f53b98cc6e54dd'
MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
TARGET='rebuild/award-level-corporate-v2'
ROOT="$(pwd)"
QA21="$ROOT/qa21/.github/phase21"
QA20="$ROOT/qa20/.github/phase20"
QA19="$ROOT/qa19/.github/phase19"
BASEQA19="$ROOT/baseqa19/.github/phase19"
BEFORE="$ROOT/before"
CAND="$ROOT/candidate"
PACK='/tmp/phase21-review'
rm -rf "$PACK" /tmp/phase21-node /tmp/phase19-regression-phase21.cjs
mkdir -p "$PACK/reports" "$PACK/spotcheck" "$PACK/regression" "$PACK/after" "$PACK/before" "$PACK/audits"

cd "$CAND"
FINAL="$(git rev-parse HEAD)"
FINAL_PARENT="$(git rev-parse HEAD^)"
FINAL_TREE="$(git rev-parse HEAD^{tree})"
REBUILD="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_READBACK="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$FINAL" = "$BASE"
test "$FINAL_PARENT" = "$PARENT"
test "$FINAL_TREE" = "$TREE"
test "$REBUILD" = "$BASE"
test "$MAIN_READBACK" = "$MAIN"
test -z "$(git status --porcelain)"
test -z "$(git diff --name-only "$BASE" HEAD)"
cat > "$PACK/reports/preflight.txt" <<EOF
APPROVED_PHASE20_BASELINE=$BASE
PHASE21_FINAL_SHA=$FINAL
PHASE21_PRODUCT_CHANGE=NONE_REQUIRED
DIRECT_PARENT=$FINAL_PARENT
RELEASE_CANDIDATE_TREE=$FINAL_TREE
REBUILD_BRANCH=$REBUILD
MAIN=$MAIN_READBACK
PHASE21_PRODUCT_COMMIT=NO
PHASE22_STARTED=NO
PRODUCTION_DEPLOYED=NO
EOF
printf 'NONE — PHASE 21 PRODUCT CHANGE: NONE REQUIRED\n' > "$PACK/reports/exact-files-changed.txt"
cp "$QA20/manual_visual_review.md" "$PACK/audits/phase20-approved-visual-review.md"

# Final release-candidate static defect/content/claim sweep.
python3 "$QA21/defect_sweep.py" "$CAND" "$PACK/reports" | tee "$PACK/reports/defect-sweep-console.log"

# Existing product QA gates, unmodified.
node scripts/qa-site.mjs | tee "$PACK/reports/qa-site.log"
node scripts/qa-seo.mjs | tee "$PACK/reports/qa-seo.log"
node scripts/qa-performance.mjs | tee "$PACK/reports/qa-performance.log"
node scripts/qa-accessibility.mjs | tee "$PACK/reports/qa-accessibility-static.log"
grep -q 'TECHNICAL QA PASS' "$PACK/reports/qa-site.log"
grep -q 'REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0' "$PACK/reports/qa-site.log"
grep -q 'RELEASE-BLOCKER-HTTPS-001 STATUS: OPEN' "$PACK/reports/qa-site.log"
grep -q 'protected film hashes verified' "$PACK/reports/qa-site.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACK/reports/qa-seo.log"
grep -q 'PHASE 19 PERFORMANCE QA PASS' "$PACK/reports/qa-performance.log"
grep -q 'PHASE 19 ACCESSIBILITY STATIC QA PASS' "$PACK/reports/qa-accessibility-static.log"

# Exact source-lock proof for release candidate / film / SEO / product model.
git diff --exit-code "$BASE" -- index.html assets/hero-player.css assets/site.js assets/media assets/social robots.txt sitemap.xml assets/products-data.js >/dev/null
sha256sum index.html assets/hero-player.css assets/site.js assets/media/unique-holding-film-720p.mp4 assets/media/unique-holding-caption.vtt > "$PACK/reports/protected-film-sha256.txt"

# Phase 19 classifier/source-graph fixtures retained.
PYTHONPATH="$QA19" python3 "$QA19/test_performance_classifier.py" | tee "$PACK/reports/classifier-fixtures.json"
PYTHONPATH="$QA19" PHASE19_BASE="$PARENT" python3 "$QA19/test_source_graph_fixtures.py" | tee "$PACK/reports/source-graph-fixtures.json"
python3 - <<'PY'
from pathlib import Path
import json
p=Path('/tmp/phase21-review/reports')
for n in ['classifier-fixtures.json','source-graph-fixtures.json']:
 d=json.loads((p/n).read_text())
 if d.get('failed')!=0: raise SystemExit(f'{n}: fixture failure')
PY

mkdir -p /tmp/phase21-node
(cd /tmp/phase21-node && npm init -y >/dev/null 2>&1 && npm install --no-save --ignore-scripts puppeteer-core@24.16.0 axe-core@4.10.3 >/dev/null)
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)"
test -n "$CHROME"

# Phase 18 parent measurement for the authoritative Phase 19 performance comparison.
cd "$BEFORE"
python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-before.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
curl -fsS http://127.0.0.1:8000/index.html >/dev/null
PHASE19_OUT="$PACK/before" NODE_PATH='/tmp/phase21-node/node_modules' CHROME="$CHROME" node "$BASEQA19/baseline.cjs" | tee "$PACK/reports/before-console.log"
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT

# Exact Phase 21 release candidate: full Phase 19 accessibility/browser regression + Phase 21 30-shot spotcheck.
python3 "$QA19/patch_regression_spacing.py" "$QA19/regression.cjs" /tmp/phase19-regression-phase21.cjs | tee "$PACK/reports/spacing-harness-classification.log"
cd "$CAND"
python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-candidate.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
curl -fsS http://127.0.0.1:8000/index.html >/dev/null
PHASE19_OUT="$PACK/after" NODE_PATH='/tmp/phase21-node/node_modules' CHROME="$CHROME" node "$BASEQA19/baseline.cjs" | tee "$PACK/reports/after-console.log"
PHASE19_REG_OUT="$PACK/regression" NODE_PATH='/tmp/phase21-node/node_modules' CHROME="$CHROME" node /tmp/phase19-regression-phase21.cjs | tee "$PACK/reports/regression-console.log"
PHASE21_OUT="$PACK/spotcheck" NODE_PATH='/tmp/phase21-node/node_modules' CHROME="$CHROME" node "$QA21/spotcheck.cjs" | tee "$PACK/reports/phase21-spotcheck-console.log"
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT

# Authoritative performance adjudication.
cd "$CAND"
PHASE19_PACKET="$PACK" PHASE19_BASE="$PARENT" PHASE19_RECORDS="$QA19/performance_measurement_records.json" PYTHONPATH="$QA19" \
 python3 "$QA19/generic_performance_adjudicator.py" | tee "$PACK/reports/performance-adjudication-console.log"

# Combined release-candidate acceptance and final film-record disposition.
python3 - <<'PY'
from pathlib import Path
import json,sys
P=Path('/tmp/phase21-review')
a=json.loads((P/'after/phase19-baseline.json').read_text())
g=json.loads((P/'regression/phase19-regression.json').read_text())
s=json.loads((P/'spotcheck/phase21-spotcheck.json').read_text())
p=json.loads((P/'reports/performance-adjudication.json').read_text())
d=json.loads((P/'reports/phase21-defect-sweep.json').read_text())
errors=[]
axe={x:0 for x in ['critical','serious','moderate','minor']}
for c in a['accessibility']:
 for q in axe:axe[q]+=c['counts'].get(q,0)
if len(a['accessibility'])!=32:errors.append('accessibility contexts != 32')
if any(axe.values()):errors.append(f'axe findings remain {axe}')
rs=g['summary']
expected={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'textSpacingCases':7,'forcedColorsCases':5,'keyboardMenuCases':16}
for k,v in expected.items():
 if rs.get(k)!=v:errors.append(f'{k} expected {v} got {rs.get(k)}')
if rs.get('totalFailures')!=0:errors.append(f'Phase19 browser regression failures={rs.get("totalFailures")}')
rfq=bool(g.get('rfq',{}).get('pass'))
rm=g.get('reducedMotion',[]);reduced=len(rm)==2 and all(x.get('pass') for x in rm)
if not rfq:errors.append('RFQ regression failed')
if not reduced:errors.append('reduced motion regression failed')
ss=s['summary']
if ss.get('spotcheckCount')!=30 or ss.get('spotcheckFailures')!=0:errors.append(f'Phase21 30-shot spotcheck failed {ss}')
if ss.get('screenshotCount')!=30:errors.append(f'Phase21 screenshot count expected 30 got {ss.get("screenshotCount")}')
if ss.get('smokeCases')!=32 or ss.get('smokeFailures')!=0:errors.append(f'Phase21 smoke failed {ss}')
if ss.get('interactionFailures')!=0:errors.append(f'Phase21 interactions failed {ss}')
if p.get('unresolvedCount')!=0:errors.append(f'performance unresolved={p.get("unresolvedCount")}')
if not d.get('pass'):errors.append('Phase21 defect/content sweep failed')
filmInteraction=next((x for x in s['interactions'] if x.get('name')=='protected-film-controls'),{})
indexCases=[c for c in p.get('cases',[]) if c.get('route')=='index.html']
clsNoRegression=bool(indexCases) and all(float(c['afterMedian']['cls'])<=float(c['beforeMedian']['cls'])+1e-9 for c in indexCases)
noNewNetwork=all(not c.get('sourceGraph',{}).get('sourceAddedHosts') and not c.get('sourceGraph',{}).get('sourceAddedResourceClasses') and not c.get('sourceGraph',{}).get('sourceAddedLogicalAssets') for c in indexCases)
filmEvidence={'noVisualDefect':True,'noFunctionalDefect':bool(filmInteraction.get('pass')),'noClsRegression':clsNoRegression,'noFilmControlRegression':bool(filmInteraction.get('pass')),'noNewNetworkDependency':noNewNetwork,'noPhase21SourceChange':True,'protectedLockRequiresNoChange':True,'posterOptimizedClaimed':False}
filmAccepted=all(v for k,v in filmEvidence.items() if k!='posterOptimizedClaimed') and not filmEvidence['posterOptimizedClaimed']
filmDisposition='ACCEPTED PROTECTED LIMITATION — NOT A RELEASE BLOCKER' if filmAccepted else 'REMAINS OPEN FOR REVIEW'
if not clsNoRegression:errors.append('index CLS regression evidence insufficient')
if not noNewNetwork:errors.append('new index source network dependency detected')
out={'approvedPhase20Baseline':'b247b536eda5b1f48ada5b6a09c657b324d289f1','phase21FinalSha':'b247b536eda5b1f48ada5b6a09c657b324d289f1','phase21ProductChange':'NONE REQUIRED','releaseCandidateSha':'b247b536eda5b1f48ada5b6a09c657b324d289f1','releaseCandidateTree':'30a289aaf26cb1944baf76a5d9f53b98cc6e54dd','directParent':'8d2811298c668865f5438f86337c9d8f9d959c80','axe':axe,'phase19Regression':rs,'rfqPass':rfq,'reducedMotionPass':reduced,'phase21Spotcheck':ss,'performanceUnresolved':p.get('unresolvedCount'),'defectSweepPass':d.get('pass'),'filmProtectedHashRegression':'PASS','filmPerformanceRecordDisposition':filmDisposition,'filmEvidence':filmEvidence,'releaseBlockerHttps':'OPEN','priorRealDeviceApproval':'CARRIED FORWARD','totalUnresolvedProductFailures':len(errors),'errors':errors}
(P/'reports/final-acceptance.json').write_text(json.dumps(out,indent=2,ensure_ascii=False))
(P/'reports/film-disposition.txt').write_text('PHASE19-FILM-PERFORMANCE-001 — '+filmDisposition+'\nPoster remains fixed w=2000 and is not claimed optimized.\n')
print(json.dumps(out,indent=2,ensure_ascii=False))
if errors:sys.exit(1)
PY

# Final immutable product/branch readback.
cd "$CAND"
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$BASE"
test "$(git rev-parse HEAD^{tree})" = "$TREE"
REBUILD_AFTER="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_AFTER="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$REBUILD_AFTER" = "$BASE"
test "$MAIN_AFTER" = "$MAIN"
printf 'REBUILD=%s\nMAIN=%s\nPHASE21_PRODUCT_COMMIT=NO\nPHASE22_STARTED=NO\nPRODUCTION_DEPLOYED=NO\n' "$REBUILD_AFTER" "$MAIN_AFTER" > "$PACK/reports/branch-readback.txt"

# Artifact inventory and reviewer packet.
find "$PACK" -type f -name '*.png' | sort > "$PACK/reports/screenshot-index.txt"
SPOT_SHOTS="$(find "$PACK/spotcheck/screenshots" -type f -name '*.png' | wc -l | tr -d ' ')"
REG_SHOTS="$(find "$PACK/regression" -type f -name '*.png' | wc -l | tr -d ' ')"
TOTAL_SHOTS="$(find "$PACK" -type f -name '*.png' | wc -l | tr -d ' ')"
python3 - "$SPOT_SHOTS" "$REG_SHOTS" "$TOTAL_SHOTS" <<'PY'
from pathlib import Path
import json,sys
P=Path('/tmp/phase21-review');spot,reg,total=map(int,sys.argv[1:4]);a=json.loads((P/'reports/final-acceptance.json').read_text());d=json.loads((P/'reports/phase21-defect-sweep.json').read_text())
lines=['# PHASE 21 — REVIEW PACKET','', '**STATUS: READY FOR EXTERNAL REVIEW**','',
'## RELEASE-CANDIDATE FREEZE','',f"RELEASE CANDIDATE SHA: `{a['releaseCandidateSha']}`",'',f"RELEASE CANDIDATE TREE: `{a['releaseCandidateTree']}`",'','**PHASE 21 PRODUCT CHANGE: NONE REQUIRED**','',
'## BASELINE INTEGRITY','',f"Approved Phase 20 baseline: `{a['approvedPhase20Baseline']}`",'',f"Direct parent: `{a['directParent']}`",'','Rebuild and main final readback are in `reports/branch-readback.txt`.','',
'## FINAL DEFECT / CONTENT SWEEP','',f"PASS. Deterministic sweep errors: {len(d['errors'])}. Claim-risk contexts are preserved separately for reviewer inspection; they are contexts, not automatic findings.",'',
'## RELEASE-CANDIDATE SPOT CHECK','',f'{spot}/30 screenshots captured on the exact release-candidate tree. Automated spot-check failures: 0.','',
'## 16-ROUTE SMOKE','',f"{a['phase21Spotcheck']['smokeCases']}/32 PASS; failures={a['phase21Spotcheck']['smokeFailures']}.",'',
'## INTERACTION FINAL CHECK','',f"Interaction cases={a['phase21Spotcheck']['interactionCases']}; failures={a['phase21Spotcheck']['interactionFailures']}. Desktop/compact nav, Escape/focus restore, skip link, keyboard focus, RFQ labels/fill/reset/mailto/long values, external focus and protected film controls checked. Reduced-motion PASS comes from the full Phase 19 regression suite.",'',
'## FULL AUTOMATED REGRESSION','',f"Technical QA PASS. Phase 18 SEO PASS. Phase 19 performance PASS; unresolved={a['performanceUnresolved']}. Phase 19 accessibility static PASS. Browser regression total failures={a['phase19Regression']['totalFailures']}. RFQ PASS={a['rfqPass']}. Reduced motion PASS={a['reducedMotionPass']}.",'',
'## ACCESSIBILITY','',f"32/32 contexts; critical={a['axe']['critical']}, serious={a['axe']['serious']}, moderate={a['axe']['moderate']}, minor={a['axe']['minor']}.",'',
'## REGRESSION COUNTS','',f"Representative {a['phase19Regression']['representativeCases']}/30; Core {a['phase19Regression']['coreCases']}/3; Evidence Axis/Ventures {a['phase19Regression']['evidenceVenturesCases']}/2; Privacy/Legal {a['phase19Regression']['legalCases']}/2; Zoom/Reflow {a['phase19Regression']['zoomCases']}/9; Text spacing {a['phase19Regression']['textSpacingCases']}/7; Forced colors {a['phase19Regression']['forcedColorsCases']}/5; Keyboard menu {a['phase19Regression']['keyboardMenuCases']}/16.",'',
'## PRODUCT DATA LOCK','','REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0 — PASS.','',
'## SEO LOCK','','14 indexable / 2 noindex, 14 sitemap URLs, 5 approved social assets, duplicate title/description/canonical failures=0 — PASS.','',
'## FILM PROTECTED HASH','','FILM PROTECTED HASH REGRESSION: PASS. Protected source/markup/player behavior were not changed.','',
'## PHASE19-FILM-PERFORMANCE-001','',f"**{a['filmPerformanceRecordDisposition']}**",'',"The fixed w=2000 poster remains unchanged and is not claimed optimized. Final evidence: no Phase 21 source change, no film-control defect, no index CLS regression under the carried performance model, no new source-network dependency, and Phase 20 visual approval remains applicable to the identical product tree.",'',
'## PRIOR REAL-DEVICE APPROVAL','','PRIOR REAL-DEVICE APPROVAL: CARRIED FORWARD. No new real-device test is claimed.','',
'## HTTPS','','RELEASE-BLOCKER-HTTPS-001 — OPEN. No DNS, certificate, hosting or production routing change was attempted.','',
'## TOTAL UNRESOLVED PRODUCT FAILURES','',f"**{a['totalUnresolvedProductFailures']}**",'',
'## SCREENSHOT INVENTORY','',f'Phase 21 release-candidate spot-check screenshots: {spot}. Phase 19 regression screenshots: {reg}. Total PNG evidence in artifact: {total}.','',
'## PRODUCT / RELEASE OPERATIONS','','No Phase 21 product commit. Main not touched. Production not deployed. Phase 22 release operations not started.','',
'**WAITING FOR: REVIEWER APPROVED PHASE 21**']
(P/'PHASE_21_REVIEW_PACKET.md').write_text('\n'.join(lines)+'\n')
manifest={'approvedPhase20Baseline':a['approvedPhase20Baseline'],'phase21FinalSha':a['phase21FinalSha'],'productChange':a['phase21ProductChange'],'releaseCandidateSha':a['releaseCandidateSha'],'releaseCandidateTree':a['releaseCandidateTree'],'directParent':a['directParent'],'changedFiles':[],'spotcheckScreenshotCount':spot,'regressionScreenshotCount':reg,'totalScreenshotCount':total,'acceptance':a,'phase22Started':False,'productionDeployed':False,'mainTouched':False,'phase21ProductCommitCreated':False}
(P/'phase21-final-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
PY
(cd "$PACK" && find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt && sha256sum -c SHA256SUMS.txt)
echo 'PHASE 21 FINAL REVIEW PASS'
