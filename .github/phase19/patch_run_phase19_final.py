from pathlib import Path
import sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2]); s=src.read_text(encoding='utf-8')
old='PHASE19_REG_OUT="$PACK/regression" NODE_PATH=\'/tmp/phase19-node/node_modules\' CHROME="$CHROME" node "$QA/regression.cjs" | tee "$PACK/reports/regression-console.log"'
new='python3 "$QA/patch_regression_spacing.py" "$QA/regression.cjs" /tmp/phase19-regression-final.cjs | tee "$PACK/reports/spacing-harness-classification.log"\nPHASE19_REG_OUT="$PACK/regression" NODE_PATH=\'/tmp/phase19-node/node_modules\' CHROME="$CHROME" node /tmp/phase19-regression-final.cjs | tee "$PACK/reports/regression-console.log"'
if old not in s: raise SystemExit('regression invocation target missing')
s=s.replace(old,new,1)
old="expect={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'forcedColorsCases':5,'keyboardMenuCases':16}"
new="expect={'smokeCases':32,'representativeCases':30,'coreCases':3,'evidenceVenturesCases':2,'legalCases':2,'zoomCases':9,'textSpacingCases':7,'forcedColorsCases':5,'keyboardMenuCases':16}"
if old not in s: raise SystemExit('acceptance case-count target missing')
s=s.replace(old,new,1)
old="if s.get('totalFailures')!=0:errors.append(f'browser regression failures={s.get(\"totalFailures\")}')"
new="if s.get('totalFailures')!=0:errors.append(f'browser regression failures={s.get(\"totalFailures\")}')\nif not g.get('rfq',{}).get('pass'): errors.append('RFQ browser acceptance failed')\nif len(g.get('reducedMotion',[]))!=2 or any(not x.get('pass') for x in g.get('reducedMotion',[])): errors.append('film/reduced-motion browser acceptance failed')"
if old not in s: raise SystemExit('acceptance total-failure target missing')
s=s.replace(old,new,1)
old='PHASE19_PACKET="$PACK" python3 "$QA/generate_docs.py" | tee "$PACK/reports/docs-generation.log"'
new='PHASE19_PACKET="$PACK" python3 "$QA/generate_docs.py" | tee "$PACK/reports/docs-generation.log"\nPHASE19_PACKET="$PACK" python3 "$QA/postprocess_docs.py" | tee "$PACK/reports/docs-fixonly-postprocess.log"'
if old not in s: raise SystemExit('docs generation target missing')
s=s.replace(old,new,1)
old='NEW_SHA="$NEW" REBUILD_SHA="$TARGET_AFTER" MAIN_SHA="$MAIN_AFTER" PHASE19_PACKET="$PACK" python3 "$QA/generate_packet.py"'
new='NEW_SHA="$NEW" REBUILD_SHA="$TARGET_AFTER" MAIN_SHA="$MAIN_AFTER" PHASE19_PACKET="$PACK" python3 "$QA/generate_packet.py"\nPHASE19_PACKET="$PACK" python3 "$QA/postprocess_packet.py"'
if old not in s: raise SystemExit('packet generation target missing')
s=s.replace(old,new,1)
dst.write_text(s,encoding='utf-8')
print('Final Phase 19 gate script prepared: visually-hidden spacing classification, 7-case spacing acceptance, RFQ/film explicit acceptance, corrected docs, 56-section packet.')
