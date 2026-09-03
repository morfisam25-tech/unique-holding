#!/usr/bin/env bash
set -euo pipefail

BASE='8d2811298c668865f5438f86337c9d8f9d959c80'
FINAL='b247b536eda5b1f48ada5b6a09c657b324d289f1'
TREE='30a289aaf26cb1944baf76a5d9f53b98cc6e54dd'
MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
TARGET='rebuild/award-level-corporate-v2'
ROOT="$(pwd)"
QA="$ROOT/qa-harness/.github/phase19"
BASEQA="$ROOT/baseline-harness/.github/phase19"
BEFORE="$ROOT/before"
CAND="$ROOT/candidate"
PACK='/tmp/phase19-review-final'

rm -rf "$PACK" /tmp/phase19-node /tmp/phase19-regression-final.cjs
mkdir -p "$PACK/reports" "$PACK/regression" "$PACK/audits"

cd "$CAND"
ACTUAL="$(git rev-parse HEAD)"
PARENT="$(git rev-parse HEAD^)"
ACTUAL_TREE="$(git rev-parse HEAD^{tree})"
REBUILD="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_READBACK="$(git ls-remote origin refs/heads/main | cut -f1)"
AHEAD="$(git rev-list --count "$BASE..$FINAL")"
BEHIND="$(git rev-list --count "$FINAL..$BASE")"

test "$ACTUAL" = "$FINAL"
test "$PARENT" = "$BASE"
test "$ACTUAL_TREE" = "$TREE"
test "$REBUILD" = "$FINAL"
test "$MAIN_READBACK" = "$MAIN"
test "$AHEAD" = '1'
test "$BEHIND" = '0'

cat > "$PACK/reports/finalization-preflight.txt" <<EOF
BASELINE=$BASE
FINAL_SHA=$FINAL
DIRECT_PARENT=$PARENT
TESTED_TREE=$ACTUAL_TREE
REBUILD_BRANCH=$REBUILD
MAIN=$MAIN_READBACK
AHEAD_BY=$AHEAD
BEHIND_BY=$BEHIND
PRODUCT_COMMIT_CREATED_BY_FINALIZATION=NO
EOF

# Exact one-commit product diff/readback. No product write occurs here.
git diff-tree --no-commit-id --name-only -r "$FINAL" | sort > "$PACK/reports/exact-files-changed.txt"
cat > /tmp/phase19-expected-files.txt <<'EOF'
assets/site.css
docs/qa/phase19-accessibility-audit.md
docs/qa/phase19-media-inventory.md
docs/qa/phase19-performance-audit.md
index.html
scripts/qa-accessibility.mjs
scripts/qa-performance.mjs
EOF
diff -u /tmp/phase19-expected-files.txt "$PACK/reports/exact-files-changed.txt"
git show --stat --oneline "$FINAL" > "$PACK/reports/commit-stat.txt"
git show --no-patch --format=fuller "$FINAL" > "$PACK/reports/commit-metadata.txt"
printf 'NEW_SHA=%s\nREBUILD_BRANCH=%s\nMAIN=%s\nDIRECT_PARENT=%s\nTESTED_TREE=%s\nAHEAD_BY=%s\nBEHIND_BY=%s\n' "$FINAL" "$REBUILD" "$MAIN_READBACK" "$PARENT" "$ACTUAL_TREE" "$AHEAD" "$BEHIND" > "$PACK/reports/branch-readback.txt"

# Static committed-tree readback.
node scripts/qa-site.mjs | tee "$PACK/reports/qa-site-finalization.log"
node scripts/qa-seo.mjs | tee "$PACK/reports/qa-seo-finalization.log"
node scripts/qa-performance.mjs | tee "$PACK/reports/qa-performance-finalization.log"
node scripts/qa-accessibility.mjs | tee "$PACK/reports/qa-accessibility-static-finalization.log"
grep -q 'TECHNICAL QA PASS' "$PACK/reports/qa-site-finalization.log"
grep -q 'REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0' "$PACK/reports/qa-site-finalization.log"
grep -q 'RELEASE-BLOCKER-HTTPS-001 STATUS: OPEN' "$PACK/reports/qa-site-finalization.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACK/reports/qa-seo-finalization.log"
grep -q 'PHASE 19 PERFORMANCE QA PASS' "$PACK/reports/qa-performance-finalization.log"
grep -q 'PHASE 19 ACCESSIBILITY STATIC QA PASS' "$PACK/reports/qa-accessibility-static-finalization.log"

git diff --exit-code "$BASE" -- assets/social robots.txt sitemap.xml assets/media assets/hero-player.css assets/site.js assets/products-data.js >/dev/null

# Classifier and source-graph fixtures against the exact committed candidate.
PYTHONPATH="$QA" python3 "$QA/test_performance_classifier.py" | tee "$PACK/reports/classifier-fixtures.json"
PYTHONPATH="$QA" PHASE19_BASE="$BASE" python3 "$QA/test_source_graph_fixtures.py" | tee "$PACK/reports/source-graph-fixtures.json"
python3 - <<'PY'
from pathlib import Path
import json
p=Path('/tmp/phase19-review-final/reports')
for name in ['classifier-fixtures.json','source-graph-fixtures.json']:
    d=json.loads((p/name).read_text())
    if d.get('failed') != 0: raise SystemExit(f'{name}: fixture failure')
PY

# Browser evidence regeneration. Same browser harness; exact committed tree, no builder.
mkdir -p /tmp/phase19-node
(cd /tmp/phase19-node && npm init -y >/dev/null 2>&1 && npm install --no-save --ignore-scripts puppeteer-core@24.16.0 axe-core@4.10.3 >/dev/null)
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)"
test -n "$CHROME"

mkdir -p "$PACK/before"
(cd "$BEFORE" && python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-before.log" 2>&1) &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
PHASE19_OUT="$PACK/before" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/before-console.log"
kill "$PID" 2>/dev/null || true
trap - EXIT

python3 "$QA/patch_regression_spacing.py" "$QA/regression.cjs" /tmp/phase19-regression-final.cjs | tee "$PACK/reports/spacing-harness-classification.log"
mkdir -p "$PACK/after"
(cd "$CAND" && python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-after.log" 2>&1) &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
PHASE19_OUT="$PACK/after" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/after-console.log"
cd "$CAND"
PHASE19_REG_OUT="$PACK/regression" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node /tmp/phase19-regression-final.cjs | tee "$PACK/reports/regression-console.log"
kill "$PID" 2>/dev/null || true
trap - EXIT

# Final generic source-vs-runtime performance adjudication.
PHASE19_PACKET="$PACK" PHASE19_BASE="$BASE" PHASE19_RECORDS="$QA/performance_measurement_records.json" PYTHONPATH="$QA" \
  python3 "$QA/generic_performance_adjudicator.py" | tee "$PACK/reports/performance-adjudication-console.log"

# Zero-failure acceptance result.
python3 - <<'PY'
from pathlib import Path
import json,sys
P=Path('/tmp/phase19-review-final')
a=json.loads((P/'after/phase19-baseline.json').read_text())
g=json.loads((P/'regression/phase19-regression.json').read_text())
p=json.loads((P/'reports/performance-adjudication.json').read_text())
errors=[]
axe={'critical':0,'serious':0,'moderate':0,'minor':0}
for c in a['accessibility']:
    for q in axe: axe[q]+=c['counts'].get(q,0)
if len(a['accessibility']) != 32: errors.append('final axe contexts != 32')
if any(axe.values()): errors.append(f'axe acceptance failed {axe}')
s=g['summary']
expect={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'textSpacingCases':7,'forcedColorsCases':5,'keyboardMenuCases':16}
for k,v in expect.items():
    if s.get(k) != v: errors.append(f'{k} expected {v} got {s.get(k)}')
if s.get('totalFailures') != 0: errors.append(f'browser regression failures={s.get("totalFailures")}')
if not g.get('rfq',{}).get('pass'): errors.append('RFQ browser acceptance failed')
if len(g.get('reducedMotion',[])) != 2 or any(not x.get('pass') for x in g.get('reducedMotion',[])): errors.append('film/reduced-motion browser acceptance failed')
if p.get('unresolvedCount') != 0: errors.append(f'performance unresolved failures={p.get("unresolvedCount")}')
out={'axe':axe,'performanceCases':len(p.get('cases',[])),'performanceModel':p.get('model'),'performanceAdjudications':p.get('adjudicatedMeasurementVariance',[]),'performanceUnresolved':p.get('unresolvedFailures',[]),'regression':s,'rfqPass':g.get('rfq',{}).get('pass'),'reducedMotionPass':len(g.get('reducedMotion',[]))==2 and all(x.get('pass') for x in g.get('reducedMotion',[])),'errors':errors}
(P/'reports/acceptance.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
if errors: sys.exit(1)
PY

# Build machine-readable route summary without modifying the committed product tree.
python3 - <<'PY'
from pathlib import Path
import json,statistics
P=Path('/tmp/phase19-review-final')
b=json.loads((P/'before/phase19-baseline.json').read_text()); a=json.loads((P/'after/phase19-baseline.json').read_text()); g=json.loads((P/'regression/phase19-regression.json').read_text())
def median_rows(data):
    d={}
    for x in data['performance']: d.setdefault((x['route'],x['w'],x['h']),[]).append(x)
    out={}
    for k,v in d.items():
        med=lambda key:int(statistics.median([x[key] for x in v])); t=[x['timing'] for x in v]
        out[k]={'requests':med('requests'),'transfer':med('transfer'),'image':med('image'),'css':med('css'),'js':med('js'),'video':med('video'),'thirdParty':med('thirdParty'),'cls':round(statistics.median([x['cls'] for x in t]),5),'fcp':round(statistics.median([x['fcp'] or 0 for x in t]),1),'lcp':round(statistics.median([(x['lcp'] or {}).get('startTime',0) for x in t]),1)}
    return out
def axe_summary(data):
    z={'critical':0,'serious':0,'moderate':0,'minor':0,'contexts':len(data['accessibility'])}
    for c in data['accessibility']:
        for k in ['critical','serious','moderate','minor']: z[k]+=c['counts'].get(k,0)
    return z
bm,am=median_rows(b),median_rows(a)
s={'baselineAxe':axe_summary(b),'afterAxe':axe_summary(a),'routeMetrics':[],'regression':g['summary']}
for k in sorted(bm): s['routeMetrics'].append({'route':k[0],'viewport':f'{k[1]}x{k[2]}','before':bm[k],'after':am[k]})
(P/'phase19-summary.json').write_text(json.dumps(s,indent=2))
PY

# Preserve committed audit documents in the review artifact.
cp "$CAND"/docs/qa/phase19-*.md "$PACK/audits/"

# Generate and postprocess final packet only; no product write/commit.
NEW_SHA="$FINAL" REBUILD_SHA="$REBUILD" MAIN_SHA="$MAIN_READBACK" PHASE19_PACKET="$PACK" python3 "$QA/generate_packet.py"
PHASE19_PACKET="$PACK" PHASE19_RECORDS="$QA/performance_measurement_records.json" python3 "$QA/postprocess_packet.py"
PHASE19_PACKET="$PACK" PHASE19_RECORDS="$QA/performance_measurement_records.json" python3 "$QA/postprocess_phase19_packet.py"

python3 - <<'PY'
from pathlib import Path
import json,os
P=Path('/tmp/phase19-review-final')
f=P/'PHASE_19_REVIEW_PACKET.md'
s=f.read_text(encoding='utf-8')
needle='NEW SHA:\n`b247b536eda5b1f48ada5b6a09c657b324d289f1`\n'
extra='''NEW SHA:\n`b247b536eda5b1f48ada5b6a09c657b324d289f1`\n\nDIRECT PARENT:\n`8d2811298c668865f5438f86337c9d8f9d959c80`\n\nTESTED TREE:\n`30a289aaf26cb1944baf76a5d9f53b98cc6e54dd`\n'''
if needle in s: s=s.replace(needle,extra,1)
s += '''\n\n## ARTIFACT FINALIZATION READBACK\n\n- Rebuild branch: `b247b536eda5b1f48ada5b6a09c657b324d289f1`.\n- Main: `6d106520dd82bf4448312b5f45b54ae15981b1db`.\n- Direct parent: `8d2811298c668865f5438f86337c9d8f9d959c80`.\n- Tested tree: `30a289aaf26cb1944baf76a5d9f53b98cc6e54dd`.\n- Ahead by 1; behind by 0 relative to the approved baseline.\n- `RELEASE-BLOCKER-HTTPS-001`: **OPEN**.\n- `PHASE19-FILM-PERFORMANCE-001`: **OPEN FOR REVIEW**.\n- No second Phase 19 product commit was created during artifact finalization.\n- Main was not modified; production was not deployed; Phase 20 was not started.\n'''
f.write_text(s,encoding='utf-8')
acc=json.loads((P/'reports/acceptance.json').read_text())
perf=json.loads((P/'reports/performance-adjudication.json').read_text())
manifest={
  'baseline':'8d2811298c668865f5438f86337c9d8f9d959c80',
  'final':'b247b536eda5b1f48ada5b6a09c657b324d289f1',
  'directParent':'8d2811298c668865f5438f86337c9d8f9d959c80',
  'testedTree':'30a289aaf26cb1944baf76a5d9f53b98cc6e54dd',
  'rebuild':'b247b536eda5b1f48ada5b6a09c657b324d289f1',
  'main':'6d106520dd82bf4448312b5f45b54ae15981b1db',
  'aheadBy':1,'behindBy':0,
  'acceptanceErrors':acc.get('errors',[]),
  'performanceUnresolved':perf.get('unresolvedCount'),
  'axe':acc.get('axe'),
  'regression':acc.get('regression'),
  'rfqPass':acc.get('rfqPass'),
  'reducedMotionPass':acc.get('reducedMotionPass'),
  'releaseBlockerHttps':'OPEN',
  'filmPerformanceFinding':'OPEN FOR REVIEW',
  'secondProductCommitCreated':False,
  'githubRunId':os.environ.get('GITHUB_RUN_ID'),
  'screenshotPngCount':len(list(P.rglob('*.png')))
}
(P/'artifact-finalization-manifest.json').write_text(json.dumps(manifest,indent=2))
PY

# Candidate checkout must remain byte-clean: artifact finalization created no product change.
cd "$CAND"
test -z "$(git status --porcelain)"
test "$(git rev-parse HEAD)" = "$FINAL"
test "$(git rev-parse HEAD^{tree})" = "$TREE"
test "$(git ls-remote origin refs/heads/$TARGET | cut -f1)" = "$FINAL"
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$MAIN"

(
  cd "$PACK"
  find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt
)

echo 'PHASE 19 ARTIFACT FINALIZATION PASS'
