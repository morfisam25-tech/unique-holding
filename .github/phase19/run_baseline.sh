#!/usr/bin/env bash
set -euo pipefail
BASE='8d2811298c668865f5438f86337c9d8f9d959c80'
MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
TARGET='rebuild/award-level-corporate-v2'
OUT='/tmp/phase19-baseline'
QA="${PHASE19_QA_DIR:-../qa-harness/.github/phase19}"
rm -rf "$OUT" /tmp/phase19-node
mkdir -p "$OUT"
test "$(git rev-parse HEAD)" = "$BASE"
test "$(git ls-remote origin refs/heads/$TARGET | cut -f1)" = "$BASE"
test "$(git ls-remote origin refs/heads/main | cut -f1)" = "$MAIN"
node scripts/qa-site.mjs | tee "$OUT/qa-site.log"
node scripts/qa-seo.mjs | tee "$OUT/qa-seo.log"
grep -q 'TECHNICAL QA PASS' "$OUT/qa-site.log"
grep -q 'PHASE 18 SEO QA PASS' "$OUT/qa-seo.log"
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)"
test -n "$CHROME"
mkdir -p /tmp/phase19-node
(cd /tmp/phase19-node && npm init -y >/dev/null 2>&1 && npm install --no-save --ignore-scripts puppeteer-core@24.16.0 axe-core@4.10.3 >/dev/null)
python3 -m http.server 8000 --bind 127.0.0.1 >"$OUT/server.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
PHASE19_OUT="$OUT" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$QA/baseline.cjs" | tee "$OUT/baseline-console.log"
kill "$PID" 2>/dev/null || true
trap - EXIT
python3 - <<'PY'
from pathlib import Path
import json, statistics
p=Path('/tmp/phase19-baseline')
r=json.loads((p/'phase19-baseline.json').read_text())
perf={}
for x in r['performance']:
 k=f"{x['route']}|{x['w']}x{x['h']}";perf.setdefault(k,[]).append(x)
rows=[]
for k,v in perf.items():
 med=lambda key:int(statistics.median([x[key] for x in v]));t=[x['timing'] for x in v]
 rows.append({'case':k,'requests':med('requests'),'transfer':med('transfer'),'image':med('image'),'video':med('video'),'css':med('css'),'js':med('js'),'thirdParty':med('thirdParty'),'cls':statistics.median([x['cls'] for x in t]),'fcp':statistics.median([x['fcp'] or 0 for x in t]),'lcp':statistics.median([(x['lcp'] or {}).get('startTime',0) for x in t]),'largest':max(v,key=lambda x:(x.get('largest') or {}).get('encoded',0)).get('largest')})
(p/'performance-summary.json').write_text(json.dumps(rows,indent=2))
roll={}
for a in r['accessibility']:
 for v in a['violations']:
  key=(v['impact'] or 'unknown')+'|'+v['id'];roll.setdefault(key,{'impact':v['impact'],'id':v['id'],'contexts':0,'nodes':0,'routes':set()});z=roll[key];z['contexts']+=1;z['nodes']+=len(v['nodes']);z['routes'].add(a['route'])
out=[]
for z in roll.values():z['routes']=sorted(z['routes']);out.append(z)
out.sort(key=lambda x:({'critical':0,'serious':1,'moderate':2,'minor':3}.get(x['impact'],4),x['id']))
(p/'axe-rollup.json').write_text(json.dumps(out,indent=2))
m={}
for c in r['media']:
 for x in c['items']:
  u=x['url'];q=m.setdefault(u,{'url':u,'kind':x['kind'],'routes':set(),'contexts':0,'aboveFold':False,'natural':x['natural'],'rendered':[]});q['routes'].add(c['route']);q['contexts']+=1;q['aboveFold']=q['aboveFold'] or x['aboveFold'];q['rendered'].append(x['rendered'])
mo=[]
for q in m.values():q['routes']=sorted(q['routes']);mo.append(q)
(p/'media-rollup.json').write_text(json.dumps(mo,indent=2))
PY
find "$OUT" -type f -print0 | sort -z | xargs -0 sha256sum > "$OUT/SHA256SUMS.txt"
