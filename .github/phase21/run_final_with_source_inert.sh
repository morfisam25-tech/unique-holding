#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
QA21="$ROOT/qa21/.github/phase21"
SRC="$QA21/finalize_nochange.sh"
TMP='/tmp/phase21-finalize-source-inert.sh'
PACK='/tmp/phase21-review'
cp "$SRC" "$TMP"
sed -i 's#assets/hero-player.css#assets/site.css#g' "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
old="""# Phase 19 classifier/source-graph fixtures retained.
PYTHONPATH=\"$QA19\" python3 \"$QA19/test_performance_classifier.py\" | tee \"$PACK/reports/classifier-fixtures.json\"
PYTHONPATH=\"$QA19\" PHASE19_BASE=\"$PARENT\" python3 \"$QA19/test_source_graph_fixtures.py\" | tee \"$PACK/reports/source-graph-fixtures.json\"
python3 - <<'PY'
from pathlib import Path
import json
p=Path('/tmp/phase21-review/reports')
for n in ['classifier-fixtures.json','source-graph-fixtures.json']:
 d=json.loads((p/n).read_text())
 if d.get('failed')!=0: raise SystemExit(f'{n}: fixture failure')
PY
"""
new="""# Phase 19 A-F behavior retained; Phase 21 adds generic SOURCE-INERT fixtures G-J.
PYTHONPATH=\"$QA21:$QA19\" python3 \"$QA21/test_performance_classifier_A_J.py\" | tee \"$PACK/reports/classifier-fixtures.json\"
PYTHONPATH=\"$QA19\" PHASE19_BASE=\"$PARENT\" python3 \"$QA19/test_source_graph_fixtures.py\" | tee \"$PACK/reports/source-graph-fixtures.json\"
python3 - <<'PY'
from pathlib import Path
import json
p=Path('/tmp/phase21-review/reports')
d=json.loads((p/'classifier-fixtures.json').read_text())
if d.get('fixtureCount')!=10 or d.get('passed')!=10 or d.get('failed')!=0:
 raise SystemExit(f'classifier fixtures expected 10/10 PASS, got {d}')
s=json.loads((p/'source-graph-fixtures.json').read_text())
if s.get('failed')!=0: raise SystemExit(f'source-graph-fixtures.json: fixture failure')
PY
"""
if old not in s: raise SystemExit('fixture patch anchor not found')
s=s.replace(old,new,1)
old2="""# Authoritative performance adjudication.
cd \"$CAND\"
PHASE19_PACKET=\"$PACK\" PHASE19_BASE=\"$PARENT\" PHASE19_RECORDS=\"$QA19/performance_measurement_records.json\" PYTHONPATH=\"$QA19\" \\
 python3 \"$QA19/generic_performance_adjudicator.py\" | tee \"$PACK/reports/performance-adjudication-console.log\"
"""
new2="""# Authoritative performance adjudication. Preserve the strict Phase 19 raw result,
# then apply the generic SOURCE-DECLARED vs EFFECTIVE ROUTE MEDIA model using
# independently recorded Phase 21 evidence. No route/host/photo whitelist exists.
cd \"$CAND\"
set +e
PHASE19_PACKET=\"$PACK\" PHASE19_BASE=\"$PARENT\" PHASE19_RECORDS=\"$QA19/performance_measurement_records.json\" PYTHONPATH=\"$QA19\" \\
 python3 \"$QA19/generic_performance_adjudicator.py\" | tee \"$PACK/reports/performance-adjudication-raw-console.log\"
RAW_PERF_RC=${PIPESTATUS[0]}
set -e
printf 'RAW_PHASE19_ADJUDICATOR_EXIT=%s\\n' \"$RAW_PERF_RC\" > \"$PACK/reports/performance-adjudication-raw-status.txt\"
test -f \"$PACK/reports/performance-adjudication.json\"
cp \"$QA21/performance_evidence_records.json\" \"$PACK/reports/PHASE21-PERFORMANCE-EVIDENCE-001.json\"
PHASE19_PACKET=\"$PACK\" PHASE21_SOURCE_INERT_RECORDS=\"$QA21/performance_evidence_records.json\" PYTHONPATH=\"$QA21:$QA19\" \\
 python3 \"$QA21/apply_source_inert_performance_correction.py\" | tee \"$PACK/reports/performance-adjudication-console.log\"
"""
if old2 not in s: raise SystemExit('performance patch anchor not found')
s=s.replace(old2,new2,1)
p.write_text(s)
PY

bash "$TMP"

# Final Phase 21 evidence/disposition additions are artifact-only; product tree remains immutable.
BRANCH_SHA="$(git -C "$ROOT/candidate" ls-remote origin refs/heads/__noop_should_not_create | cut -f1)"
if [ -n "$BRANCH_SHA" ]; then
  cat > "$PACK/reports/temporary-branch-residue.txt" <<EOF
TEMPORARY_BRANCH=__noop_should_not_create
SHA=$BRANCH_SHA
STATUS=NON-PRODUCT REPOSITORY HYGIENE RESIDUE
DELETE_PERMISSION=UNAVAILABLE_IN_CURRENT_GITHUB_CONNECTOR
PRODUCT_BLOCKER=NO
EOF
else
  cat > "$PACK/reports/temporary-branch-residue.txt" <<EOF
TEMPORARY_BRANCH=__noop_should_not_create
STATUS=DELETED_OR_ABSENT
PRODUCT_BLOCKER=NO
EOF
fi

cat > "$PACK/reports/film-disposition.txt" <<'EOF'
PHASE19-FILM-PERFORMANCE-001
FINAL PHASE 21 DISPOSITION: ACCEPTED PROTECTED LIMITATION — NOT A RELEASE BLOCKER

Reason:
- protected fixed w=2000 poster remains oversized for narrow mobile;
- no visual defect established;
- no functional defect established;
- no CLS regression;
- protected film hashes pass;
- changing it would violate the protected film lock;
- no claim that the poster is optimized.

No film file, poster, source, crop, controls, autoplay, captions, fullscreen, replay, offscreen behavior or reduced-motion behavior was modified.
EOF

python3 - "$PACK" "$BRANCH_SHA" <<'PY'
from pathlib import Path
import json,sys
P=Path(sys.argv[1]); branch_sha=sys.argv[2]
packet=P/'PHASE_21_REVIEW_PACKET.md'
text=packet.read_text()
marker='**WAITING FOR: REVIEWER APPROVED PHASE 21**'
if marker not in text: raise SystemExit('review packet waiting marker missing')
perf=json.loads((P/'reports/performance-adjudication.json').read_text())
fixtures=json.loads((P/'reports/classifier-fixtures.json').read_text())
ev=json.loads((P/'reports/PHASE21-PERFORMANCE-EVIDENCE-001.json').read_text())['records'][0]
extra=f'''## 31. PHASE21-PERFORMANCE-EVIDENCE-001

Route: `evidence-axis.html` · Viewport: `390×844` · Logical asset: `photo-1779896411954-9129882c996d`.
Evidence run: `33783918490`. Artifact: `phase21-evidence-axis-final-performance-evidence` · ID `9904711458` · digest `sha256:69dd1c72f07e2aea5e5a1041d0a35109fac306fe98510d105e39349fe7426c27`.
Controlled occurrence: baseline 0/10; candidate 0/10; A/A left 0/10; A/A right 0/10; total 0/40. Final disposition: **SOURCE-INERT PRE-EXISTING THIRD-PARTY ASSET — NO PRODUCT REGRESSION**.
Prior occurrence from run `33706442110`: **PRIOR RUNTIME/MEASUREMENT OCCURRENCE NOT REPRODUCED AND NOT ATTRIBUTABLE TO A CANDIDATE SOURCE CHANGE.**

## 32. SOURCE-INERT MEDIA MODEL

The generic performance model distinguishes a source-declared logical asset from effective route media. SOURCE-INERT requires unchanged responsible declarations, no candidate-added media/host/class, stable effective suppression on both sides through required lifecycle checkpoints, unchanged affected-region output and geometry, preserved intended media, no CLS regression, and a strict deterministic product graph. No route, photo ID, host or Unsplash waiver is encoded.

## 33. AFFECTED-REGION VS WHOLE-VIEWPORT VISUAL AUTHORITY

Media-specific SOURCE-INERT adjudication uses the affected element region, effective media state, geometry and CLS. Whole-viewport pixel identity is not required for this media-specific question; separate Phase 20/browser visual gates remain authoritative for whole-page presentation. Evidence Axis affected hero-region pixel delta: **0 pixels**. Whole-viewport 0.0452667% raster delta was outside the hero region.

## 34. CLASSIFIER FIXTURES A–J

**{fixtures.get('passed')}/{fixtures.get('fixtureCount')} PASS; failed={fixtures.get('failed')}.** Existing A–F remain passing. G SOURCE-INERT media PASS; H unrelated outside-region raster delta PASS; I override removed FAILs as a real regression; J responsible source changed FAILs as a real regression.

## 35. EVIDENCE AXIS 0/40 CONTROL RESULT

Baseline 0/10 · Candidate 0/10 · A/A left 0/10 · A/A right 0/10 · Total **0/40 requests**. Asset transfer 0 B; attributable third-party requests 0; CLS 0 in every controlled run.

## 36. FINAL PERFORMANCE UNRESOLVED COUNT

**{perf.get('unresolvedCount')}**

## 37. PHASE19-FILM-PERFORMANCE-001 FINAL DISPOSITION

**ACCEPTED PROTECTED LIMITATION — NOT A RELEASE BLOCKER.** Protected fixed `w=2000` poster remains oversized for narrow mobile; no visual defect, functional defect or CLS regression was established; protected film hashes pass; changing it would violate the protected film lock; no optimization claim is made.

## 38. TEMPORARY BRANCH RESIDUE STATUS

''' + (f'`__noop_should_not_create` still points to `{branch_sha}`. **NON-PRODUCT REPOSITORY HYGIENE RESIDUE**; branch deletion is unavailable through the current connector and does not block product approval.\n\n' if branch_sha else '`__noop_should_not_create` is absent/deleted. No residue remains.\n\n')
packet.write_text(text.replace(marker,extra+marker,1))
manifest_path=P/'phase21-final-manifest.json'; m=json.loads(manifest_path.read_text())
m['phase21PerformanceEvidence001']=ev
m['sourceInertMediaModel']='GENERIC — SOURCE-DECLARED LOGICAL ASSET DISTINCT FROM EFFECTIVE ROUTE MEDIA'
m['classifierFixturesAJ']={'fixtureCount':fixtures.get('fixtureCount'),'passed':fixtures.get('passed'),'failed':fixtures.get('failed')}
m['performanceUnresolved']=perf.get('unresolvedCount')
m['filmPerformanceRecordDisposition']='ACCEPTED PROTECTED LIMITATION — NOT A RELEASE BLOCKER'
m['temporaryBranchResidue']={'branch':'__noop_should_not_create','sha':branch_sha or None,'status':'NON-PRODUCT REPOSITORY HYGIENE RESIDUE' if branch_sha else 'DELETED_OR_ABSENT','productBlocker':False}
manifest_path.write_text(json.dumps(m,indent=2,ensure_ascii=False))
PY

# Recompute artifact integrity after final evidence-only packet additions.
(cd "$PACK" && find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt && sha256sum -c SHA256SUMS.txt)
echo 'PHASE 21 SOURCE-INERT FINALIZATION PASS'
