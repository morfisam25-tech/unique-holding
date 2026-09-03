from __future__ import annotations
from pathlib import Path
import json, os, sys
from source_inert_media_model import classify_source_inert_media

PACK=Path(os.environ.get('PHASE19_PACKET','/tmp/phase21-review'))
REPORT=PACK/'reports/performance-adjudication.json'
RECORDS=Path(os.environ.get('PHASE21_SOURCE_INERT_RECORDS','.github/phase21/performance_evidence_records.json'))

if not REPORT.exists():
    raise SystemExit(f'missing raw performance adjudication report: {REPORT}')
if not RECORDS.exists():
    raise SystemExit(f'missing SOURCE-INERT evidence records: {RECORDS}')

report=json.loads(REPORT.read_text())
records=json.loads(RECORDS.read_text()).get('records',[])
record_index={(r['route'],int(r['width']),int(r['height']),r['logicalAsset']):r for r in records}
adjudicated=[]

for case in report.get('cases',[]):
    route=case.get('route'); w=int(case.get('width')); h=int(case.get('height'))
    source_graph=case.get('sourceGraph',{})
    baseline_graph=source_graph.get('baseline',{})
    candidate_graph=source_graph.get('candidate',{})
    logical_details={x.get('logicalAsset'):x for x in case.get('logicalAssets',[])}

    remaining=list(case.get('issues',[]))
    applied=[]
    for issue in list(remaining):
        prefix='pre-existing logical image asset no longer loads '
        if not isinstance(issue,str) or not issue.startswith(prefix):
            continue
        asset_id=issue[len(prefix):]
        rec=record_index.get((route,w,h,asset_id))
        if not rec:
            continue
        ev=rec.get('sourceInertMedia',{})
        detail=logical_details.get(asset_id,{})

        # Cross-check the evidence record against the raw source graph. A record
        # cannot override candidate-added source/host/class evidence or a changed
        # responsible declaration reported by the strict graph.
        graph_shared=(asset_id in baseline_graph.get('logicalAssets',[]) and asset_id in candidate_graph.get('logicalAssets',[]))
        graph_added_media=bool(detail.get('sourceAddedDeclarations'))
        graph_changed_responsible=bool(detail.get('responsibleSourceFilesChanged'))
        graph_candidate_only_host=bool(source_graph.get('sourceAddedHosts'))
        graph_candidate_only_class=bool(source_graph.get('sourceAddedResourceClasses'))
        graph_candidate_only_asset=bool(source_graph.get('sourceAddedLogicalAssets'))

        model=classify_source_inert_media(
            baseline_logical_source=bool(ev.get('baselineLogicalSource')) and graph_shared,
            candidate_logical_source=bool(ev.get('candidateLogicalSource')) and graph_shared,
            responsible_source_changed=bool(ev.get('responsibleSourceChanged')) or graph_changed_responsible,
            candidate_added_media_declaration=bool(ev.get('candidateAddedMediaDeclaration')) or graph_added_media or graph_candidate_only_asset,
            candidate_only_host=bool(ev.get('candidateOnlyHost')) or graph_candidate_only_host,
            candidate_only_resource_class=bool(ev.get('candidateOnlyResourceClass')) or graph_candidate_only_class,
            baseline_effective_suppressed=bool(ev.get('baselineEffectiveSuppressed')),
            candidate_effective_suppressed=bool(ev.get('candidateEffectiveSuppressed')),
            baseline_suppression_stable=bool(ev.get('baselineSuppressionStable')),
            candidate_suppression_stable=bool(ev.get('candidateSuppressionStable')),
            affected_region_visual_regression=bool(ev.get('affectedRegionVisualRegression')),
            geometry_regression=bool(ev.get('geometryRegression')),
            intended_media_disappears=bool(ev.get('intendedMediaDisappears')),
            cls_regression=bool(ev.get('clsRegression')),
            deterministic_graph_regression=bool(ev.get('deterministicGraphRegression')),
            full_page_visual_covered_separately=bool(ev.get('fullPageVisualCoveredSeparately')),
            unrelated_outside_region_raster_delta=bool(ev.get('unrelatedOutsideRegionRasterDelta')),
        )
        if model['status']!='PASS' or 'SOURCE-INERT ASSET' not in model['classification']:
            continue

        remaining.remove(issue)
        applied.append({'record':rec,'model':model})
        adjudicated.append({
            'case':case.get('case'),
            'logicalAsset':asset_id,
            'recordId':rec.get('id'),
            'classification':model['classification'],
            'controlledOccurrence':rec.get('controlledOccurrence'),
            'evidenceRun':rec.get('evidenceRun'),
            'artifactId':rec.get('artifactId'),
        })

    case['issues']=remaining
    if applied:
        case['sourceInertEvidence']=applied
        if not remaining:
            case['status']='PASS'
            case['classification']='SOURCE-INERT ASSET — NO CANDIDATE-INTRODUCED PERFORMANCE REGRESSION'

unresolved=[]
for case in report.get('cases',[]):
    if case.get('issues'):
        unresolved.append({'case':case.get('case'),'issues':case.get('issues')})

model=report.setdefault('model',{})
model.update({
    'sourceDeclaredLogicalAssetDistinctFromEffectiveRouteMedia':True,
    'sourceInertMediaRule':'PASS only when shared source is unchanged, candidate adds no media/host/class, effective media is suppressed on both sides at all required lifecycle checkpoints, affected-region visual output and geometry do not regress, intended media remains, CLS does not regress, deterministic graph stays strict, and whole-page presentation remains covered by separate visual gates.',
    'affectedRegionVisualAuthority':True,
    'wholeViewportPixelIdentityRequiredForMediaSpecificSourceInertAdjudication':False,
    'wholePageVisualQAStillStrictSeparately':True,
})
report['sourceInertEvidenceRecords']=records
report['adjudicatedSourceInertAssets']=adjudicated
report['unresolvedFailures']=unresolved
report['unresolvedCount']=len(unresolved)
REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')

summary={
    'sourceInertAdjudicated':len(adjudicated),
    'unresolvedCount':len(unresolved),
    'adjudicatedSourceInertAssets':adjudicated,
    'unresolvedFailures':unresolved,
}
print(json.dumps(summary,indent=2,ensure_ascii=False))
if unresolved:
    sys.exit(1)
