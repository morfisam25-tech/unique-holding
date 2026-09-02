from pathlib import Path
import sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2]); s=src.read_text(encoding='utf-8')
needle='mkdir -p "$PACK/reports" "$PACK/regression" /tmp/phase19-before-product\n'
replace=needle+'if [ -f /tmp/phase19-classifier-fixtures.json ]; then cp /tmp/phase19-classifier-fixtures.json "$PACK/reports/classifier-fixtures.json"; fi\n'
if needle not in s: raise SystemExit('PACK mkdir marker missing after Phase19 final patch')
s=s.replace(needle,replace,1)
needle='python3 "$QA/build_phase19.py" | tee "$PACK/reports/build.log"\n'
replace=needle+'PYTHONPATH="$QA" PHASE19_BASE="$BASE" python3 "$QA/test_source_graph_fixtures.py" | tee "$PACK/reports/source-graph-fixtures.json"\n'
if needle not in s: raise SystemExit('build marker missing')
s=s.replace(needle,replace,1)
dst.write_text(s,encoding='utf-8')
print('Phase 19 source-vs-runtime fixture evidence wired into final packet and post-build source graph gate.')
