from pathlib import Path
from urllib.parse import urlparse
import json, os, re, statistics, sys
from collections import Counter
from performance_source_classifier import extract_source_graph, logical_asset, changed_responsible_files

PACK=Path(os.environ.get('PHASE19_PACKET','/tmp/phase19-review'))
BASE=os.environ.get('PHASE19_BASE','8d2811298c668865f5438f86337c9d8f9d959c80')
RECORDS_PATH=Path(os.environ.get('PHASE19_RECORDS','.github/phase19/performance_measurement_records.json'))
BEFORE=json.loads((PACK/'before/phase19-baseline.json').read_text())
AFTER=json.loads((PACK/'after/phase19-baseline.json').read_text())
RECORDS=json.loads(RECORDS_PATH.read_text()) if RECORDS_PATH.exists() else {'records':[]}
LOCAL_RE=re.compile(r'^https?://127\.0\.0\.1:\d+/')


def median(xs): return statistics.median(xs) if xs else 0

def normalize_url(u):
    if LOCAL_RE.match(u): return 'LOCAL/'+LOCAL_RE.sub('',u,1)
    return u

def resource_class(r):
    mime=(r.get('mime') or '').lower(); u=r.get('url','').lower()
    if mime.startswith('image/') or re.search(r'\.(?:png|jpe?g|webp|avif|gif|svg)(?:\?|$)',u): return 'Image'
    if mime.startswith('video/') or re.search(r'\.(?:mp4|webm)(?:\?|$)',u): return 'Video'
    if 'javascript' in mime or re.search(r'\.m?js(?:\?|$)',u): return 'Script'
    if 'text/css' in mime or re.search(r'\.css(?:\?|$)',u): return 'Stylesheet'
    if 'text/html' in mime or u.endswith('.html'): return 'Document'
    if 'font' in mime or re.search(r'\.(?:woff2?|ttf|otf)(?:\?|$)',u): return 'Font'
    return 'Other'

def third_party(u): return not u.startswith('LOCAL/')

def rows_by_case(data):
    out={}
    for x in data['performance']: out.setdefault((x['route'],x['w'],x['h']),[]).append(x)
    for v in out.values(): v.sort(key=lambda x:x.get('rep',0))
    return out

def run_resource_maps(rows):
    runs=[]
    for row in rows:
        rr=[]
        for r0 in row.get('resources',[]):
            u=normalize_url(r0.get('url','')); cls=resource_class({'url':u,**r0})
            rr.append({'url':u,'class':cls,'thirdParty':third_party(u),'encoded':int(r0.get('encoded') or 0),'decoded':int(r0.get('decoded') or 0),'logicalAsset':logical_asset(u,cls) if third_party(u) else None,'mime':r0.get('mime'),'status':r0.get('status')})
        runs.append(rr)
    return runs

def occurrence_vector(runs,u): return [sum(1 for r in rr if r['url']==u) for rr in runs]
def deterministic_transfer(runs, stochastic_urls): return [sum(r['encoded'] for r in rr if r['url'] not in stochastic_urls) for rr in runs]
def deterministic_request_count(runs, stochastic_urls): return [sum(1 for r in rr if r['url'] not in stochastic_urls) for rr in runs]
def deterministic_thirdparty_count(runs, stochastic_urls): return [sum(1 for r in rr if r['thirdParty'] and r['url'] not in stochastic_urls) for rr in runs]
def ref_signature(r): return (r['exactUrl'],r['sourceFile'],r['declarationType'])
def ref_public(r): return {k:r[k] for k in ['exactUrl','logicalAsset','resourceClass','host','sourceFile','line','declarationType']}

def record_for(case_key):
    route,w,h=case_key
    for r in RECORDS.get('records',[]):
        if r.get('route')==route and r.get('width')==w and r.get('height')==h: return r
    return None

B=rows_by_case(BEFORE); A=rows_by_case(AFTER)
case_reports=[]; unresolved=[]; adjudicated=[]
source_graph_cache={}
for key,brows in B.items():
    arows=A[key]; route,w,h=key
    bmed={k:median([x[k] for x in brows]) for k in ['requests','transfer','thirdParty']}; bmed['cls']=median([x['timing']['cls'] for x in brows])
    amed={k:median([x[k] for x in arows]) for k in ['requests','transfer','thirdParty']}; amed['cls']=median([x['timing']['cls'] for x in arows])
    raw=[]
    if amed['requests']>bmed['requests']: raw.append('requests')
    if amed['thirdParty']>bmed['thirdParty']: raw.append('thirdParty')
    if bmed['transfer'] and amed['transfer']>bmed['transfer']*1.10: raw.append('transfer')
    if amed['cls']>bmed['cls']+0.03: raw.append('cls')

    bruns=run_resource_maps(brows); aruns=run_resource_maps(arows)
    bunion=sorted(set(r['url'] for rr in bruns for r in rr)); aunion=sorted(set(r['url'] for rr in aruns for r in rr))
    runtime_added=sorted(set(aunion)-set(bunion)); runtime_removed=sorted(set(bunion)-set(aunion))
    all_urls=sorted(set(bunion+aunion))
    freq={u:{'before':occurrence_vector(bruns,u),'after':occurrence_vector(aruns,u)} for u in all_urls}
    for u,v in freq.items(): v.update({'beforeTotal':sum(v['before']),'afterTotal':sum(v['after'])})

    if route not in source_graph_cache:
        source_graph_cache[route]=(extract_source_graph('baseline',BASE,route),extract_source_graph('candidate',BASE,route))
    bsg,asg=source_graph_cache[route]
    bsig_counts=Counter(ref_signature(r) for r in bsg['references']); asig_counts=Counter(ref_signature(r) for r in asg['references'])
    source_added_refs=[]; source_removed_refs=[]
    for sig,n in (asig_counts-bsig_counts).items():
        source_added_refs += [next(r for r in asg['references'] if ref_signature(r)==sig)]*n
    for sig,n in (bsig_counts-asig_counts).items():
        source_removed_refs += [next(r for r in bsg['references'] if ref_signature(r)==sig)]*n
    source_added_hosts=sorted(set(asg['hosts'])-set(bsg['hosts']))
    source_added_classes=sorted(set(asg['resourceClasses'])-set(bsg['resourceClasses']))
    source_added_logical=sorted(set(asg['logicalAssets'])-set(bsg['logicalAssets']))

    issues=[]
    if source_added_hosts: issues.append(f'candidate-source-added hosts {source_added_hosts}')
    if source_added_classes: issues.append(f'candidate-source-added resource classes {source_added_classes}')
    if source_added_logical: issues.append(f'candidate-source-added logical assets {source_added_logical}')
    if source_added_refs:
        issues.append('candidate-source-added external declarations '+json.dumps([ref_public(r) for r in source_added_refs],sort_keys=True))

    logical_runtime={}
    for side,runs in [('before',bruns),('after',aruns)]:
        for rr in runs:
            for r in rr:
                if r['thirdParty'] and r['class']=='Image' and r['logicalAsset']:
                    g=logical_runtime.setdefault(r['logicalAsset'],{'before':{},'after':{}})
                    g[side][r['url']]=g[side].get(r['url'],0)+1

    stochastic_urls=set(); logical_details=[]
    for aid,g in sorted(logical_runtime.items()):
        brefs=[r for r in bsg['references'] if r.get('logicalAsset')==aid]
        arefs=[r for r in asg['references'] if r.get('logicalAsset')==aid]
        b_ref_counts=Counter(ref_signature(r) for r in brefs); a_ref_counts=Counter(ref_signature(r) for r in arefs)
        asset_added_refs=[]; asset_removed_refs=[]
        for sig,n in (a_ref_counts-b_ref_counts).items(): asset_added_refs += [next(r for r in arefs if ref_signature(r)==sig)]*n
        for sig,n in (b_ref_counts-a_ref_counts).items(): asset_removed_refs += [next(r for r in brefs if ref_signature(r)==sig)]*n
        changed_files=changed_responsible_files(BASE,bsg,asg,aid)
        baseline_logical_source=bool(brefs); candidate_logical_source=bool(arefs)
        baseline_total=sum(g['before'].values()); candidate_total=sum(g['after'].values())
        if baseline_total>0 and candidate_logical_source and candidate_total==0 and not asset_removed_refs:
            issues.append(f'pre-existing logical image asset no longer loads {aid}')
        if asset_added_refs:
            issues.append('candidate-source-added image declaration '+json.dumps([ref_public(r) for r in asset_added_refs],sort_keys=True))

        variants=[]
        for u in sorted(set(g['before'])|set(g['after'])):
            bv=occurrence_vector(bruns,u); av=occurrence_vector(aruns,u)
            exact_brefs=[r for r in brefs if r['exactUrl']==u]; exact_arefs=[r for r in arefs if r['exactUrl']==u]
            exact_b_counts=Counter(ref_signature(r) for r in exact_brefs); exact_a_counts=Counter(ref_signature(r) for r in exact_arefs)
            exact_added=[]; exact_removed=[]
            for sig,n in (exact_a_counts-exact_b_counts).items(): exact_added += [next(r for r in exact_arefs if ref_signature(r)==sig)]*n
            for sig,n in (exact_b_counts-exact_a_counts).items(): exact_removed += [next(r for r in exact_brefs if ref_signature(r)==sig)]*n
            runtime_only_candidate=(sum(bv)==0 and sum(av)>0 and not exact_added)
            source_removed_optimization=(bool(exact_removed) and not exact_added and sum(av)<=sum(bv))
            stochastic_eligible=(baseline_logical_source and candidate_logical_source and not asset_added_refs and not source_added_hosts and not source_added_classes)
            if stochastic_eligible and not source_removed_optimization:
                stochastic_urls.add(u)
            variants.append({
                'url':u,'before':bv,'after':av,'beforeTotal':sum(bv),'afterTotal':sum(av),
                'baselineSourceReferences':[ref_public(r) for r in exact_brefs],
                'candidateSourceReferences':[ref_public(r) for r in exact_arefs],
                'sourceDeclarationAdded':[ref_public(r) for r in exact_added],
                'sourceDeclarationRemoved':[ref_public(r) for r in exact_removed],
                'runtimeOnlyCandidateObservation':runtime_only_candidate,
                'sourceRemovedOptimization':source_removed_optimization,
                'stochasticEligible':stochastic_eligible,
                'classification':('SOURCE-REMOVED OPTIMIZATION' if source_removed_optimization else ('RUNTIME-ONLY STOCHASTIC VARIANT OF UNCHANGED PRE-EXISTING LOGICAL ASSET' if stochastic_eligible and sum(bv)!=sum(av) else 'PRE-EXISTING SOURCE/RUNTIME'))
            })
        logical_details.append({
            'logicalAsset':aid,'baselineSourceReferences':[ref_public(r) for r in brefs],
            'candidateSourceReferences':[ref_public(r) for r in arefs],
            'sourceAddedDeclarations':[ref_public(r) for r in asset_added_refs],
            'sourceRemovedDeclarations':[ref_public(r) for r in asset_removed_refs],
            'responsibleSourceFilesChanged':changed_files,
            'baselineRuntimeTotal':baseline_total,'candidateRuntimeTotal':candidate_total,
            'variants':variants
        })

    strict_runtime_added=[]
    for u in runtime_added:
        if u.startswith('LOCAL/') or u not in stochastic_urls:
            strict_runtime_added.append(u)
    if strict_runtime_added: issues.append(f'unattributed candidate runtime-added resources {strict_runtime_added}')

    deterministic_frequency_increases=[]
    for u in all_urls:
        if u in stochastic_urls: continue
        bv=freq[u]['before']; av=freq[u]['after']
        if av and min(av)>max(bv or [0]): deterministic_frequency_increases.append({'url':u,'before':bv,'after':av})
    if deterministic_frequency_increases: issues.append(f'repeatable deterministic request-frequency increases {deterministic_frequency_increases}')
    bdet_t=deterministic_transfer(bruns,stochastic_urls); adet_t=deterministic_transfer(aruns,stochastic_urls)
    bdet_r=deterministic_request_count(bruns,stochastic_urls); adet_r=deterministic_request_count(aruns,stochastic_urls)
    bdet_tp=deterministic_thirdparty_count(bruns,stochastic_urls); adet_tp=deterministic_thirdparty_count(aruns,stochastic_urls)
    det_transfer_ok=(median(adet_t)<=median(bdet_t)*1.10 if median(bdet_t) else median(adet_t)==0)
    if not det_transfer_ok: issues.append(f'unexplained deterministic transfer growth {median(bdet_t)}->{median(adet_t)}')
    if median(adet_r)>median(bdet_r): issues.append(f'deterministic median request growth {median(bdet_r)}->{median(adet_r)}')
    if median(adet_tp)>median(bdet_tp): issues.append(f'deterministic median third-party growth {median(bdet_tp)}->{median(adet_tp)}')
    if 'cls' in raw: issues.append(f'CLS regression {bmed["cls"]}->{amed["cls"]}')

    rec=record_for(key)
    status='PASS'; classification='STRICT PASS'
    if issues:
        status='FAIL'; classification='REAL PERFORMANCE REGRESSION'; unresolved.append({'case':f'{route}|{w}x{h}','issues':issues})
    elif raw:
        classification='MEASUREMENT VARIANCE — NO CANDIDATE REGRESSION'
        adjudicated.append({'case':f'{route}|{w}x{h}','rawFailures':raw,'record':rec.get('id') if rec else None,'stochasticUrls':sorted(stochastic_urls)})

    case_reports.append({
        'case':f'{route}|{w}x{h}','route':route,'width':w,'height':h,
        'beforeMedian':bmed,'afterMedian':amed,'rawMedianFailures':raw,'status':status,'classification':classification,'issues':issues,
        'runtimeGraph':{'baselineUrlUnion':bunion,'candidateUrlUnion':aunion,'runtimeAddedUrls':runtime_added,'runtimeRemovedUrls':runtime_removed,'urlFrequency':freq},
        'sourceGraph':{'baseline':bsg,'candidate':asg,'sourceAddedDeclarations':[ref_public(r) for r in source_added_refs],'sourceRemovedDeclarations':[ref_public(r) for r in source_removed_refs],'sourceAddedHosts':source_added_hosts,'sourceAddedResourceClasses':source_added_classes,'sourceAddedLogicalAssets':source_added_logical},
        'stochasticUrls':sorted(stochastic_urls),'logicalAssets':logical_details,
        'deterministicRequestCounts':{'before':bdet_r,'after':adet_r,'beforeMedian':median(bdet_r),'afterMedian':median(adet_r)},
        'deterministicThirdPartyCounts':{'before':bdet_tp,'after':adet_tp,'beforeMedian':median(bdet_tp),'afterMedian':median(adet_tp)},
        'deterministicTransferTotals':{'before':bdet_t,'after':adet_t,'beforeMedian':median(bdet_t),'afterMedian':median(adet_t),'within10Percent':det_transfer_ok},
        'measurementRecord':rec
    })

report={
    'model':{
        'name':'Phase 19 source-vs-runtime two-layer performance acceptance',
        'sourceGraphAuthority':True,
        'runtimeGraphDistinctFromSourceGraph':True,
        'deterministicLayer':'strict candidate-source additions, local graph, dependency class/host, deterministic frequency, deterministic transfer and CLS',
        'stochasticLayer':'runtime-only or intermittently observed variants of unchanged pre-existing third-party logical image assets',
        'exactUrlAndLogicalAsset':True,
        'sourceRemovedOptimizationDistinct':True,
        'oneSidedRegressionRule':True
    },
    'records':RECORDS.get('records',[]),'cases':case_reports,
    'adjudicatedMeasurementVariance':adjudicated,'unresolvedFailures':unresolved,'unresolvedCount':len(unresolved)
}
out=PACK/'reports/performance-adjudication.json'; out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'model':report['model'],'adjudicatedMeasurementVariance':adjudicated,'unresolvedFailures':unresolved,'unresolvedCount':len(unresolved),'caseTable':[{'case':c['case'],'raw':c['rawMedianFailures'],'status':c['status'],'classification':c['classification']} for c in case_reports]},indent=2))
if unresolved: sys.exit(1)
