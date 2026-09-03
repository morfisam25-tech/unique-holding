#!/usr/bin/env bash
set -euo pipefail

P19='b247b536eda5b1f48ada5b6a09c657b324d289f1'
P19_PARENT='8d2811298c668865f5438f86337c9d8f9d959c80'
TREE='30a289aaf26cb1944baf76a5d9f53b98cc6e54dd'
MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
TARGET='rebuild/award-level-corporate-v2'
ROOT="$(pwd)"
QA20="$ROOT/qa20/.github/phase20"
QA19="$ROOT/qa19/.github/phase19"
BASEQA19="$ROOT/baseqa19/.github/phase19"
BEFORE="$ROOT/before"
CAND="$ROOT/candidate"
PACK='/tmp/phase20-review'

rm -rf "$PACK" /tmp/phase20-node /tmp/phase20-visual-qc-final.cjs /tmp/phase19-regression-final.cjs
mkdir -p "$PACK/reports" "$PACK/visual" "$PACK/regression" "$PACK/audits"

cd "$CAND"
FINAL="$(git rev-parse HEAD)"
PARENT="$(git rev-parse HEAD^)"
ACTUAL_TREE="$(git rev-parse HEAD^{tree})"
REBUILD="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_READBACK="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$FINAL" = "$P19"
test "$PARENT" = "$P19_PARENT"
test "$ACTUAL_TREE" = "$TREE"
test "$REBUILD" = "$P19"
test "$MAIN_READBACK" = "$MAIN"
test -z "$(git status --porcelain)"
# No Phase 20 product delta is permitted in the no-change finalization.
test -z "$(git diff --name-only "$P19" HEAD)"

cat > "$PACK/reports/preflight.txt" <<EOF
APPROVED_PHASE19_BASELINE=$P19
PHASE20_FINAL_SHA=$FINAL
PHASE20_PRODUCT_CHANGE=NONE_REQUIRED
DIRECT_PARENT=$PARENT
TESTED_TREE=$ACTUAL_TREE
REBUILD_BRANCH=$REBUILD
MAIN=$MAIN_READBACK
SECOND_PHASE19_PRODUCT_COMMIT=NO
PHASE20_PRODUCT_COMMIT=NO
PHASE21_STARTED=NO
PRODUCTION_DEPLOYED=NO
EOF
printf 'NONE — PHASE 20 PRODUCT CHANGE: NONE REQUIRED\n' > "$PACK/reports/exact-files-changed.txt"
cp "$QA20/manual_visual_review.md" "$PACK/audits/phase20-manual-visual-review.md"

# Static committed-tree regressions.
node scripts/qa-site.mjs | tee "$PACK/reports/qa-site.log"
node scripts/qa-seo.mjs | tee "$PACK/reports/qa-seo.log"
node scripts/qa-performance.mjs | tee "$PACK/reports/qa-performance.log"
node scripts/qa-accessibility.mjs | tee "$PACK/reports/qa-accessibility-static.log"
grep -q 'TECHNICAL QA PASS' "$PACK/reports/qa-site.log"
grep -q 'REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0' "$PACK/reports/qa-site.log"
grep -q 'RELEASE-BLOCKER-HTTPS-001 STATUS: OPEN' "$PACK/reports/qa-site.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACK/reports/qa-seo.log"
grep -q 'PHASE 19 PERFORMANCE QA PASS' "$PACK/reports/qa-performance.log"
grep -q 'PHASE 19 ACCESSIBILITY STATIC QA PASS' "$PACK/reports/qa-accessibility-static.log"
# Locked film/SEO/social/runtime-sensitive assets remain Phase 19-identical by definition of exact SHA.
git diff --exit-code "$P19" -- assets/social robots.txt sitemap.xml assets/media assets/hero-player.css assets/site.js assets/products-data.js >/dev/null

# Classifier/source graph fixtures.
PYTHONPATH="$QA19" python3 "$QA19/test_performance_classifier.py" | tee "$PACK/reports/classifier-fixtures.json"
PYTHONPATH="$QA19" PHASE19_BASE="$P19_PARENT" python3 "$QA19/test_source_graph_fixtures.py" | tee "$PACK/reports/source-graph-fixtures.json"
python3 - <<'PY'
from pathlib import Path
import json
p=Path('/tmp/phase20-review/reports')
for n in ['classifier-fixtures.json','source-graph-fixtures.json']:
 d=json.loads((p/n).read_text())
 if d.get('failed')!=0: raise SystemExit(f'{n}: fixture failure')
PY

mkdir -p /tmp/phase20-node
(cd /tmp/phase20-node && npm init -y >/dev/null 2>&1 && npm install --no-save --ignore-scripts puppeteer-core@24.16.0 axe-core@4.10.3 >/dev/null)
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)"
test -n "$CHROME"

# Phase 18 baseline measurement required by the carried Phase 19 performance adjudicator.
mkdir -p "$PACK/before"
cd "$BEFORE"
python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-before.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
curl -fsS http://127.0.0.1:8000/index.html >/dev/null
PHASE19_OUT="$PACK/before" NODE_PATH='/tmp/phase20-node/node_modules' CHROME="$CHROME" node "$BASEQA19/baseline.cjs" | tee "$PACK/reports/before-console.log"
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT

# Exact approved Phase 19 tree: accessibility/browser regression + Phase 20 visual matrix.
python3 "$QA19/patch_regression_spacing.py" "$QA19/regression.cjs" /tmp/phase19-regression-final.cjs | tee "$PACK/reports/spacing-harness-classification.log"
python3 "$QA20/patch_visual_qc.py" "$QA20/visual_qc.cjs" /tmp/phase20-visual-qc-final.cjs | tee "$PACK/reports/phase20-harness-classification.log"
mkdir -p "$PACK/after" "$PACK/visual"
cd "$CAND"
python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-candidate.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
curl -fsS http://127.0.0.1:8000/index.html >/dev/null
PHASE19_OUT="$PACK/after" NODE_PATH='/tmp/phase20-node/node_modules' CHROME="$CHROME" node "$BASEQA19/baseline.cjs" | tee "$PACK/reports/after-console.log"
PHASE19_REG_OUT="$PACK/regression" NODE_PATH='/tmp/phase20-node/node_modules' CHROME="$CHROME" node /tmp/phase19-regression-final.cjs | tee "$PACK/reports/regression-console.log"
PHASE20_OUT="$PACK/visual" NODE_PATH='/tmp/phase20-node/node_modules' CHROME="$CHROME" node /tmp/phase20-visual-qc-final.cjs | tee "$PACK/reports/phase20-visual-console.log"

# Explicit external-destination focus-state visual on the actual Privacy link.
NODE_PATH='/tmp/phase20-node/node_modules' CHROME="$CHROME" PHASE20_OUT="$PACK/visual" node - <<'NODE'
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
(async()=>{const b=await puppeteer.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const p=await b.newPage();await p.setViewport({width:390,height:844});await p.goto('http://127.0.0.1:8000/privacy.html',{waitUntil:'load'});const a=await p.$('a[href="https://evidenceaxis.com/contact/"]');if(!a)throw new Error('Privacy external destination missing');await a.focus();await a.evaluate(e=>e.scrollIntoView({block:'center'}));await new Promise(r=>setTimeout(r,120));const vis=await p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,href:e.getAttribute('href'),outline:s.outlineStyle+' '+s.outlineWidth,boxShadow:s.boxShadow,w:r.width,h:r.height}});if(vis.tag!=='A'||!vis.href||vis.w<=0||vis.h<=0)throw new Error('external focus state invalid');const dir=path.join(process.env.PHASE20_OUT,'screenshots');fs.mkdirSync(dir,{recursive:true});await p.screenshot({path:path.join(dir,'interaction-privacy-external-link-focus-390x844.png')});fs.writeFileSync(path.join(process.env.PHASE20_OUT,'external-link-focus.json'),JSON.stringify({pass:true,...vis},null,2));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
NODE

kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT

# Generic Phase 19 performance adjudication retained as the authoritative unresolved-performance gate.
cd "$CAND"
PHASE19_PACKET="$PACK" PHASE19_BASE="$P19_PARENT" PHASE19_RECORDS="$QA19/performance_measurement_records.json" PYTHONPATH="$QA19" \
  python3 "$QA19/generic_performance_adjudicator.py" | tee "$PACK/reports/performance-adjudication-console.log"

# Combined final acceptance.
python3 - <<'PY'
from pathlib import Path
import json,sys
P=Path('/tmp/phase20-review')
a=json.loads((P/'after/phase19-baseline.json').read_text())
g=json.loads((P/'regression/phase19-regression.json').read_text())
v=json.loads((P/'visual/phase20-visual.json').read_text())
p=json.loads((P/'reports/performance-adjudication.json').read_text())
ext=json.loads((P/'visual/external-link-focus.json').read_text())
errors=[]
axe={'critical':0,'serious':0,'moderate':0,'minor':0}
for c in a['accessibility']:
 for q in axe: axe[q]+=c['counts'].get(q,0)
if len(a['accessibility'])!=32: errors.append('accessibility contexts != 32')
if any(axe.values()): errors.append(f'axe findings remain: {axe}')
s=g['summary']
expect={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'textSpacingCases':7,'forcedColorsCases':5,'keyboardMenuCases':16}
for k,val in expect.items():
 if s.get(k)!=val: errors.append(f'{k} expected {val} got {s.get(k)}')
if s.get('totalFailures')!=0: errors.append(f'phase19 browser regression failures={s.get("totalFailures")}')
if not g.get('rfq',{}).get('pass'): errors.append('RFQ regression failed')
rm=g.get('reducedMotion',[])
if len(rm)!=2 or any(not x.get('pass') for x in rm): errors.append('reduced-motion regression failed')
vs=v['summary']
if vs.get('matrixCount')!=53 or vs.get('matrixFailures')!=0: errors.append(f'Phase20 visual matrix failed {vs}')
if vs.get('smokeCases')!=32 or vs.get('smokeFailures')!=0: errors.append(f'Phase20 32-route smoke failed {vs}')
if vs.get('interactionFailures')!=0: errors.append(f'Phase20 interaction visual failures {vs}')
if not ext.get('pass'): errors.append('Privacy external-link focus visual failed')
if p.get('unresolvedCount')!=0: errors.append(f'performance unresolved={p.get("unresolvedCount")}')
out={'approvedPhase19Baseline':'b247b536eda5b1f48ada5b6a09c657b324d289f1','phase20FinalSha':'b247b536eda5b1f48ada5b6a09c657b324d289f1','phase20ProductChange':'NONE REQUIRED','directParent':'8d2811298c668865f5438f86337c9d8f9d959c80','testedTree':'30a289aaf26cb1944baf76a5d9f53b98cc6e54dd','axe':axe,'phase19Regression':s,'rfqPass':g.get('rfq',{}).get('pass'),'reducedMotionPass':len(rm)==2 and all(x.get('pass') for x in rm),'phase20Visual':vs,'externalLinkFocusPass':ext.get('pass'),'performanceUnresolved':p.get('unresolvedCount'),'errors':errors}
(P/'reports/final-acceptance.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
if errors: sys.exit(1)
PY

# Final readback after every browser/static operation; no product write is allowed.
cd "$CAND"
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$P19"
test "$(git rev-parse HEAD^{tree})" = "$TREE"
REBUILD_AFTER="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_AFTER="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$REBUILD_AFTER" = "$P19"
test "$MAIN_AFTER" = "$MAIN"
printf 'REBUILD=%s\nMAIN=%s\nPHASE20_PRODUCT_COMMIT=NO\n' "$REBUILD_AFTER" "$MAIN_AFTER" > "$PACK/reports/branch-readback.txt"

# Screenshot inventory and review packet.
find "$PACK" -type f -name '*.png' | sort > "$PACK/reports/screenshot-index.txt"
TOTAL_SHOTS="$(wc -l < "$PACK/reports/screenshot-index.txt" | tr -d ' ')"
VISUAL_SHOTS="$(find "$PACK/visual/screenshots" -type f -name '*.png' | wc -l | tr -d ' ')"
REG_SHOTS="$(find "$PACK/regression" -type f -name '*.png' | wc -l | tr -d ' ')"

python3 - "$TOTAL_SHOTS" "$VISUAL_SHOTS" "$REG_SHOTS" <<'PY'
from pathlib import Path
import json,sys,os
P=Path('/tmp/phase20-review')
total,visual,reg=map(int,sys.argv[1:4])
a=json.loads((P/'reports/final-acceptance.json').read_text())
pre=(P/'reports/preflight.txt').read_text().strip()
lines=['# PHASE 20 — REVIEW PACKET','', '**STATUS: READY FOR EXTERNAL REVIEW**','',
'## 1. APPROVED PHASE 19 BASELINE SHA','', '`b247b536eda5b1f48ada5b6a09c657b324d289f1`','',
'## 2. PHASE 20 FINAL SHA / NO-CHANGE RESULT','', '**PHASE 20 PRODUCT CHANGE: NONE REQUIRED**','', '`b247b536eda5b1f48ada5b6a09c657b324d289f1` remains the rebuild head.','',
'## 3. DIRECT PARENT','', '`8d2811298c668865f5438f86337c9d8f9d959c80`','',
'## 4. TESTED TREE','', '`30a289aaf26cb1944baf76a5d9f53b98cc6e54dd`','',
'## 5. EXACT CHANGED FILES','', 'None. No Phase 20 product file was changed and no Phase 20 product commit was created.','',
'## 6. EXACT VISUAL FINDINGS','', 'Customer-eye review found no BLOCKER, MAJOR, MODERATE or MINOR customer-facing defect requiring product correction. Full route-by-route notes are in `audits/phase20-manual-visual-review.md`.','',
'## 7. SEVERITY TABLE','', '| Severity | Count |','|---|---:|','| BLOCKER | 0 |','| MAJOR | 0 |','| MODERATE | 0 |','| MINOR requiring correction | 0 |','| OBSERVATION / non-defect | 4 |','',
'## 8. BEFORE / AFTER EVIDENCE','', 'N/A for product corrections: the approved Phase 19 tree is also the Phase 20 final tree. Baseline and final visual evidence are therefore the same committed product. Four non-defect observations are documented without code changes.','',
'## 9. FULL REQUIRED SCREENSHOT MATRIX','', f'53/53 required customer-eye matrix screenshots regenerated and passed. Phase 20 visual folder contains {visual} screenshots including interaction states.','',
'## 10. 16-ROUTE SMOKE RESULT','', '32/32 PASS at 1440×900 and 390×844; route load, navigation/internal-link traversal, no document overflow, main/H1/footer structure and browser errors checked.','',
'## 11. AUTOMATED REGRESSION RESULTS','', f"Phase 19 browser suite: total failures **{a['phase19Regression']['totalFailures']}**. Representative 30/30, Core 3/3, Evidence Axis/Ventures 2/2, Privacy/Legal 2/2, zoom/reflow 9/9, text spacing 7/7, forced colors 5/5, keyboard menu 16/16. RFQ PASS. Reduced motion PASS.",'',
'## 12. ACCESSIBILITY RESULT','', f"32/32 contexts. critical={a['axe']['critical']}, serious={a['axe']['serious']}, moderate={a['axe']['moderate']}, minor={a['axe']['minor']}.",'',
'## 13. PERFORMANCE RESULT','', f"`node scripts/qa-performance.mjs`: PASS. Generic source-vs-runtime adjudication unresolved failures: **{a['performanceUnresolved']}**.",'',
'## 14. SEO REGRESSION','', 'Phase 18 SEO QA PASS: 14 indexable / 2 noindex architecture retained, 14 sitemap URLs and five approved social cards preserved.','',
'## 15. PRODUCT-COUNT REGRESSION','', 'PASS — REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0.','',
'## 16. LEGAL / PRIVACY REGRESSION','', 'PASS — 2/2 browser legal/privacy cases, zero failures. Phase 17 unresolved formal legal/privacy review boundaries remain unchanged.','',
'## 17. FILM PROTECTED-HASH RESULT','', '**FILM PROTECTED HASH REGRESSION: PASS.** Protected player CSS, hero/player markup and player behavior remain unchanged.','',
'## 18. PRIOR REAL-DEVICE FILM APPROVAL','', '**PRIOR REAL-DEVICE APPROVAL: CARRIED FORWARD.** No new real-device test is claimed.','',
'## 19. PHASE19-FILM-PERFORMANCE-001 STATUS','', '**OPEN FOR REVIEW.** Protected `w=2000` film poster remains unchanged.','',
'## 20. RELEASE-BLOCKER-HTTPS-001 STATUS','', '**OPEN.** No domain/DNS/certificate remediation attempted.','',
'## 21. REBUILD READBACK','', '`b247b536eda5b1f48ada5b6a09c657b324d289f1`','',
'## 22. MAIN READBACK','', '`6d106520dd82bf4448312b5f45b54ae15981b1db`','',
'## 23. ARTIFACT ID','', 'Supplied in the external handoff after GitHub Actions upload completes.','',
'## 24. ARTIFACT DIGEST','', 'Supplied in the external handoff after GitHub Actions upload completes.','',
'## 25. SCREENSHOT COUNT','', f'Phase 20 visual screenshots: **{visual}**. Phase 19 regression screenshots carried in this artifact: **{reg}**. Total PNG evidence: **{total}**.','',
'## 26. FINAL UNRESOLVED VISUAL DEFECTS BY SEVERITY','', 'BLOCKER=0; MAJOR=0; MODERATE=0; MINOR requiring correction=0. Four documented observations are non-defects and do not require product changes.','',
'## PHASE 19 ACCESSIBILITY-COLOR VISUAL REGRESSION','', 'PASS across all twelve explicitly requested review areas: footer secondary text; homepage metadata; Corporate metadata; Energy metadata; Products labels/numbers; Sales boundary copy; Technology route labels; Evidence Axis boundary/sample copy; Ventures labels; Contact metadata/address/direct labels; Legal labels/external copy; Privacy correspondence wrapping. No compliant color was reverted for aesthetic preference.','',
'## INTERACTION VISUAL QC','', 'Desktop navigation PASS; compact navigation PASS; Escape/focus restoration PASS; skip-link focus PASS; CTA focus PASS; Privacy external-link focus PASS; RFQ long-input layout PASS; film controls visual state PASS.','',
'## PRE-FLIGHT / FINALIZATION INTEGRITY','', '```text',pre,'```','',
'No Phase 20 product commit was created. Main was not touched. Production was not deployed. Phase 21 was not started.','',
'**WAITING FOR: REVIEWER APPROVED PHASE 20**','']
(P/'PHASE_20_REVIEW_PACKET.md').write_text('\n'.join(lines),encoding='utf-8')
manifest={'approvedPhase19Baseline':'b247b536eda5b1f48ada5b6a09c657b324d289f1','phase20FinalSha':'b247b536eda5b1f48ada5b6a09c657b324d289f1','directParent':'8d2811298c668865f5438f86337c9d8f9d959c80','testedTree':'30a289aaf26cb1944baf76a5d9f53b98cc6e54dd','productChange':'NONE REQUIRED','changedFiles':[],'rebuild':'b247b536eda5b1f48ada5b6a09c657b324d289f1','main':'6d106520dd82bf4448312b5f45b54ae15981b1db','visualRequiredMatrix':53,'visualScreenshotCount':visual,'regressionScreenshotCount':reg,'totalScreenshotCount':total,'acceptance':a,'releaseBlockerHttps':'OPEN','phase19FilmPerformance001':'OPEN FOR REVIEW','filmProtectedHashRegression':'PASS','priorRealDeviceApproval':'CARRIED FORWARD','phase21Started':False,'productionDeployed':False,'mainTouched':False,'phase20ProductCommitCreated':False,'githubRunId':os.environ.get('GITHUB_RUN_ID')}
(P/'phase20-final-manifest.json').write_text(json.dumps(manifest,indent=2))
PY

(
 cd "$PACK"
 find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt
)

echo 'PHASE 20 NO-CHANGE FINALIZATION PASS'
