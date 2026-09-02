#!/usr/bin/env bash
set -euo pipefail
BASE='8d2811298c668865f5438f86337c9d8f9d959c80'
MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
TARGET='rebuild/award-level-corporate-v2'
PACK='/tmp/phase19-review'
QA='../qa-harness/.github/phase19'
BASEQA='../baseline-harness/.github/phase19'
rm -rf "$PACK" /tmp/phase19-baseline
mkdir -p "$PACK/reports" "$PACK/regression"

echo '=== PHASE 19 PREFLIGHT ==='
test "$(git rev-parse HEAD)" = "$BASE"
TARGET_BEFORE="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_BEFORE="$(git ls-remote origin refs/heads/main | cut -f1)"
printf 'BASELINE=%s\nTARGET_BEFORE=%s\nMAIN_BEFORE=%s\n' "$BASE" "$TARGET_BEFORE" "$MAIN_BEFORE" | tee "$PACK/reports/preflight.txt"
test "$TARGET_BEFORE" = "$BASE"
test "$MAIN_BEFORE" = "$MAIN"

# Exact baseline measurement before any product change.
bash "$BASEQA/run_baseline.sh"
mv /tmp/phase19-baseline "$PACK/before"

# Build only evidence-backed candidate changes.
python3 "$QA/build_phase19.py" | tee "$PACK/reports/build.log"
node --check scripts/qa-performance.mjs
node --check scripts/qa-accessibility.mjs

echo '=== STATIC PRECOMMIT GATES ==='
node scripts/qa-site.mjs | tee "$PACK/reports/qa-site-precommit.log"
node scripts/qa-seo.mjs | tee "$PACK/reports/qa-seo-precommit.log"
node scripts/qa-performance.mjs | tee "$PACK/reports/qa-performance-precommit.log"
node scripts/qa-accessibility.mjs | tee "$PACK/reports/qa-accessibility-static-precommit.log"
grep -q 'TECHNICAL QA PASS' "$PACK/reports/qa-site-precommit.log"
grep -q 'REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0' "$PACK/reports/qa-site-precommit.log"
grep -q 'RELEASE-BLOCKER-HTTPS-001 STATUS: OPEN' "$PACK/reports/qa-site-precommit.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACK/reports/qa-seo-precommit.log"
grep -q 'PHASE 19 PERFORMANCE QA PASS' "$PACK/reports/qa-performance-precommit.log"
grep -q 'PHASE 19 ACCESSIBILITY STATIC QA PASS' "$PACK/reports/qa-accessibility-static-precommit.log"

# Phase 18/17/film-sensitive assets must remain byte-identical where Phase 19 has no authority.
git diff --exit-code "$BASE" -- assets/social robots.txt sitemap.xml assets/media assets/hero-player.css assets/site.js assets/products-data.js 2>/dev/null || {
  echo 'Protected/locked non-Phase19 scope changed'; exit 1;
}

# After measurement: identical browser harness to baseline.
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)"
test -n "$CHROME"
mkdir -p "$PACK/after"
python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-after.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
PHASE19_OUT="$PACK/after" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/after-console.log"
PHASE19_REG_OUT="$PACK/regression" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$QA/regression.cjs" | tee "$PACK/reports/regression-console.log"
kill "$PID" 2>/dev/null || true
trap - EXIT

# Evidence-derived performance budgets and accessibility acceptance.
python3 - <<'PY'
from pathlib import Path
import json,statistics,sys
P=Path('/tmp/phase19-review')
b=json.loads((P/'before/phase19-baseline.json').read_text()); a=json.loads((P/'after/phase19-baseline.json').read_text()); g=json.loads((P/'regression/phase19-regression.json').read_text())
def med(data):
 d={}
 for x in data['performance']: d.setdefault((x['route'],x['w'],x['h']),[]).append(x)
 out={}
 for k,v in d.items():
  f=lambda key:statistics.median([x[key] for x in v])
  out[k]={key:f(key) for key in ['requests','transfer','thirdParty']};out[k]['cls']=statistics.median([x['timing']['cls'] for x in v])
 return out
bm,am=med(b),med(a); errors=[]
for k,bv in bm.items():
 av=am[k]
 if av['requests']>bv['requests']:errors.append(f'{k}: request regression {bv["requests"]}->{av["requests"]}')
 if av['thirdParty']>bv['thirdParty']:errors.append(f'{k}: third-party regression {bv["thirdParty"]}->{av["thirdParty"]}')
 if bv['transfer'] and av['transfer']>bv['transfer']*1.10:errors.append(f'{k}: material transfer regression {bv["transfer"]}->{av["transfer"]}')
 if av['cls']>bv['cls']+0.03:errors.append(f'{k}: material CLS regression {bv["cls"]}->{av["cls"]}')
axe={'critical':0,'serious':0,'moderate':0,'minor':0}
for c in a['accessibility']:
 for q in axe:axe[q]+=c['counts'].get(q,0)
if len(a['accessibility'])!=32: errors.append('final axe contexts != 32')
if axe['critical'] or axe['serious']: errors.append(f'axe acceptance failed {axe}')
s=g['summary']
expect={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'forcedColorsCases':5,'keyboardMenuCases':16}
for k,v in expect.items():
 if s.get(k)!=v:errors.append(f'{k} expected {v} got {s.get(k)}')
if s.get('totalFailures')!=0:errors.append(f'browser regression failures={s.get("totalFailures")}')
print(json.dumps({'axe':axe,'performanceCases':len(am),'regression':s,'errors':errors},indent=2))
(P/'reports/acceptance.json').write_text(json.dumps({'axe':axe,'performanceCases':len(am),'regression':s,'errors':errors},indent=2))
if errors:sys.exit(1)
PY

# Build the three required internal audit documents from measured evidence.
PHASE19_PACKET="$PACK" python3 "$QA/generate_docs.py" | tee "$PACK/reports/docs-generation.log"

cat > /tmp/phase19-expected-files.txt <<'EOF'
assets/site.css
docs/qa/phase19-accessibility-audit.md
docs/qa/phase19-media-inventory.md
docs/qa/phase19-performance-audit.md
index.html
scripts/qa-accessibility.mjs
scripts/qa-performance.mjs
EOF
{ git diff --name-only; git ls-files --others --exclude-standard; } | sort -u > /tmp/phase19-actual-files.txt
diff -u /tmp/phase19-expected-files.txt /tmp/phase19-actual-files.txt
git diff --check
cp /tmp/phase19-actual-files.txt "$PACK/reports/exact-files-changed.txt"

# Create exactly one authorized product commit after every precommit gate passes.
mapfile -t FILES < /tmp/phase19-expected-files.txt
git add -- "${FILES[@]}"
test -z "$(git status --porcelain | grep '^??' || true)"
TESTED_TREE="$(git write-tree)"
echo "TESTED_TREE=$TESTED_TREE" | tee "$PACK/reports/tested-tree.txt"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'PHASE 19 — Harden performance, media delivery and accessibility'
NEW="$(git rev-parse HEAD)"
test "$(git rev-parse HEAD^)" = "$BASE"
test "$(git rev-parse HEAD^{tree})" = "$TESTED_TREE"

# Race-safe fast-forward only. No force and no main mutation.
REMOTE_TARGET="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
REMOTE_MAIN="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$REMOTE_TARGET" = "$BASE"
test "$REMOTE_MAIN" = "$MAIN"
git push origin "HEAD:refs/heads/$TARGET"
TARGET_AFTER="$(git ls-remote origin refs/heads/$TARGET | cut -f1)"
MAIN_AFTER="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$TARGET_AFTER" = "$NEW"
test "$MAIN_AFTER" = "$MAIN"
printf 'NEW_SHA=%s\nREBUILD_BRANCH=%s\nMAIN=%s\n' "$NEW" "$TARGET_AFTER" "$MAIN_AFTER" | tee "$PACK/reports/branch-readback.txt"

git diff-tree --no-commit-id --name-only -r "$NEW" | sort > /tmp/phase19-commit-files.txt
diff -u /tmp/phase19-expected-files.txt /tmp/phase19-commit-files.txt
cp /tmp/phase19-commit-files.txt "$PACK/reports/commit-files.txt"
git show --stat --oneline "$NEW" > "$PACK/reports/commit-stat.txt"
git show --no-patch --format=fuller "$NEW" > "$PACK/reports/commit-metadata.txt"

# Exact committed-tree static readback.
node scripts/qa-site.mjs | tee "$PACK/reports/qa-site-postcommit.log"
node scripts/qa-seo.mjs | tee "$PACK/reports/qa-seo-postcommit.log"
node scripts/qa-performance.mjs | tee "$PACK/reports/qa-performance-postcommit.log"
node scripts/qa-accessibility.mjs | tee "$PACK/reports/qa-accessibility-static-postcommit.log"
grep -q 'TECHNICAL QA PASS' "$PACK/reports/qa-site-postcommit.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACK/reports/qa-seo-postcommit.log"
test -z "$(git status --porcelain)"

mkdir -p "$PACK/audits"
cp docs/qa/phase19-*.md "$PACK/audits/"
NEW_SHA="$NEW" REBUILD_SHA="$TARGET_AFTER" MAIN_SHA="$MAIN_AFTER" PHASE19_PACKET="$PACK" python3 "$QA/generate_packet.py"
(
 cd "$PACK"
 find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt
)
echo '=== PHASE 19 COMPLETE ==='
echo "NEW_SHA=$NEW"
echo "REBUILD_BRANCH=$TARGET_AFTER"
echo "MAIN=$MAIN_AFTER"
