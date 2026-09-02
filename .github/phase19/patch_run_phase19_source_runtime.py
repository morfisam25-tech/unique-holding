from pathlib import Path
import sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2]); s=src.read_text(encoding='utf-8')
needle='mkdir -p "$PACK/reports" "$PACK/regression"\n'
replace=needle+'if [ -f /tmp/phase19-classifier-fixtures.json ]; then cp /tmp/phase19-classifier-fixtures.json "$PACK/reports/classifier-fixtures.json"; fi\n'
if needle not in s: raise SystemExit('PACK mkdir marker missing')
s=s.replace(needle,replace,1)
dst.write_text(s,encoding='utf-8')
print('Phase 19 source-vs-runtime fixture evidence wired into final packet.')
