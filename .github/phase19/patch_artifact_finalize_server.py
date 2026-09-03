from pathlib import Path
import sys

src=Path(sys.argv[1]); dst=Path(sys.argv[2])
s=src.read_text(encoding='utf-8')

old='''(cd "$BEFORE" && python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-before.log" 2>&1) &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
PHASE19_OUT="$PACK/before" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/before-console.log"
kill "$PID" 2>/dev/null || true
trap - EXIT
'''
new='''python3 -m http.server 8000 --bind 127.0.0.1 --directory "$BEFORE" >"$PACK/reports/server-before.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true' EXIT
sleep 1
kill -0 "$PID"
curl -fsS http://127.0.0.1:8000/index.html | grep -q 'rel="preload" as="image"'
PHASE19_OUT="$PACK/before" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/before-console.log"
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT
for _ in $(seq 1 40); do
  if ! curl -fsS --max-time 0.2 http://127.0.0.1:8000/index.html >/dev/null 2>&1; then break; fi
  sleep 0.1
done
if curl -fsS --max-time 0.2 http://127.0.0.1:8000/index.html >/dev/null 2>&1; then
  echo 'baseline server did not release port 8000'; exit 1
fi
'''
if old not in s: raise SystemExit('baseline server block not found')
s=s.replace(old,new,1)

old='''(cd "$CAND" && python3 -m http.server 8000 --bind 127.0.0.1 >"$PACK/reports/server-after.log" 2>&1) &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 1
PHASE19_OUT="$PACK/after" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/after-console.log"
cd "$CAND"
PHASE19_REG_OUT="$PACK/regression" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node /tmp/phase19-regression-final.cjs | tee "$PACK/reports/regression-console.log"
kill "$PID" 2>/dev/null || true
trap - EXIT
'''
new='''python3 -m http.server 8000 --bind 127.0.0.1 --directory "$CAND" >"$PACK/reports/server-after.log" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true' EXIT
sleep 1
kill -0 "$PID"
# Prove the browser server is the exact Phase 19 candidate, not a stale baseline process.
TMP_INDEX="$(mktemp)"
curl -fsS http://127.0.0.1:8000/index.html > "$TMP_INDEX"
if grep -q 'rel="preload" as="image"' "$TMP_INDEX"; then echo 'candidate server served baseline preload'; exit 1; fi
grep -q 'role="group" aria-label="Evidence Axis public sample preview"' "$TMP_INDEX"
rm -f "$TMP_INDEX"
PHASE19_OUT="$PACK/after" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node "$BASEQA/baseline.cjs" | tee "$PACK/reports/after-console.log"
cd "$CAND"
PHASE19_REG_OUT="$PACK/regression" NODE_PATH='/tmp/phase19-node/node_modules' CHROME="$CHROME" node /tmp/phase19-regression-final.cjs | tee "$PACK/reports/regression-console.log"
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
trap - EXIT
'''
if old not in s: raise SystemExit('candidate server block not found')
s=s.replace(old,new,1)

dst.write_text(s,encoding='utf-8')
print('Artifact finalizer server lifecycle patched: direct python PID, wait/release check, exact candidate HTTP probe.')
