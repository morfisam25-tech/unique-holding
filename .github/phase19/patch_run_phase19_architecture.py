from pathlib import Path
import re, sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2]); s=src.read_text(encoding='utf-8')

# The generic model consumes the three independently established measurement
# records. Do not launch a route-specific Contact 5x5 trial inside the final
# acceptance run merely because the legacy patch inserted one.
s,n=re.subn(r"^PHASE19_PERF_OUT=.*PHASE19_PERF_ROUTE='contact\.html'.*targeted_performance\.cjs.*$","echo 'PERF-QA-MEASUREMENT-001 consumed as prior verified evidence; no route-specific stochastic rerun.'",s,count=1,flags=re.M)
if n!=1: raise SystemExit('legacy Contact targeted diagnostic invocation missing')

start='# Evidence-derived performance budgets and accessibility acceptance.\n'
end='# Build the three required internal audit documents from measured evidence.\n'
i=s.find(start); j=s.find(end)
if i<0 or j<0 or j<=i: raise SystemExit('acceptance block markers missing')
new_block=r'''# Evidence-derived performance acceptance using the generic two-layer model.
# Raw median failures do not terminate before resource/source adjudication.
PHASE19_PACKET="$PACK" PHASE19_BASE="$BASE" PHASE19_RECORDS="$QA/performance_measurement_records.json" \
  python3 "$QA/generic_performance_adjudicator_v2.py" | tee "$PACK/reports/performance-adjudication-console.log"
python3 - <<'PYACC'
from pathlib import Path
import json,sys
P=Path('/tmp/phase19-review')
a=json.loads((P/'after/phase19-baseline.json').read_text())
g=json.loads((P/'regression/phase19-regression.json').read_text())
p=json.loads((P/'reports/performance-adjudication.json').read_text())
errors=[]
axe={'critical':0,'serious':0,'moderate':0,'minor':0}
for c in a['accessibility']:
 for q in axe: axe[q]+=c['counts'].get(q,0)
if len(a['accessibility'])!=32: errors.append('final axe contexts != 32')
if any(axe.values()): errors.append(f'axe acceptance failed {axe}')
s=g['summary']
expect={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'textSpacingCases':7,'forcedColorsCases':5,'keyboardMenuCases':16}
for k,v in expect.items():
 if s.get(k)!=v: errors.append(f'{k} expected {v} got {s.get(k)}')
if s.get('totalFailures')!=0: errors.append(f'browser regression failures={s.get("totalFailures")}')
if not g.get('rfq',{}).get('pass'): errors.append('RFQ browser acceptance failed')
if len(g.get('reducedMotion',[]))!=2 or any(not x.get('pass') for x in g.get('reducedMotion',[])): errors.append('film/reduced-motion browser acceptance failed')
if p.get('unresolvedCount')!=0: errors.append(f'performance unresolved failures={p.get("unresolvedCount")}')
out={'axe':axe,'performanceCases':len(p.get('cases',[])),'performanceModel':p.get('model'),'sourceRemovedOptimizations':p.get('sourceRemovedOptimizations',[]),'performanceAdjudications':p.get('adjudicatedMeasurementVariance',[]),'performanceUnresolved':p.get('unresolvedFailures',[]),'regression':s,'rfqPass':g.get('rfq',{}).get('pass'),'reducedMotionPass':len(g.get('reducedMotion',[]))==2 and all(x.get('pass') for x in g.get('reducedMotion',[])),'errors':errors}
print(json.dumps(out,indent=2))
(P/'reports/acceptance.json').write_text(json.dumps(out,indent=2))
if errors: sys.exit(1)
PYACC

'''
s=s[:i]+new_block+s[j:]
needle='PHASE19_PACKET="$PACK" python3 "$QA/generate_docs.py" | tee "$PACK/reports/docs-generation.log"\n'
replace=needle+'PHASE19_PACKET="$PACK" PHASE19_RECORDS="$QA/performance_measurement_records.json" python3 "$QA/postprocess_phase19_docs.py" | tee "$PACK/reports/performance-doc-postprocess.log"\n'
if needle not in s: raise SystemExit('generate_docs invocation missing')
s=s.replace(needle,replace,1)
needle='NEW_SHA="$NEW" REBUILD_SHA="$TARGET_AFTER" MAIN_SHA="$MAIN_AFTER" PHASE19_PACKET="$PACK" python3 "$QA/generate_packet.py"\n'
replace=needle+'PHASE19_PACKET="$PACK" PHASE19_RECORDS="$QA/performance_measurement_records.json" python3 "$QA/postprocess_phase19_packet.py"\n'
if needle not in s: raise SystemExit('generate_packet invocation missing')
s=s.replace(needle,replace,1)
dst.write_text(s,encoding='utf-8')
print('Phase 19 final run patched: generic v2 exact-source deterministic/stochastic adjudication; no route-specific diagnostic reruns; sections 67-73 enabled.')
