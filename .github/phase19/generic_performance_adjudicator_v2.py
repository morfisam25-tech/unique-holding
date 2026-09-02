from pathlib import Path
import json, os, re, statistics, subprocess, sys
from urllib.parse import urlparse, parse_qsl

PACK=Path(os.environ.get('PHASE19_PACKET','/tmp/phase19-review'))
BASE=os.environ.get('PHASE19_BASE','8d2811298c668865f5438f86337c9d8f9d959c80')
RECORDS_PATH=Path(os.environ.get('PHASE19_RECORDS','.github/phase19/performance_measurement_records.json'))
BEFORE=json.loads((PACK/'before/phase19-baseline.json').read_text())
AFTER=json.loads((PACK/'after/phase19-baseline.json').read_text())
RECORDS=json.loads(RECORDS_PATH.read_text()) if RECORDS_PATH.exists() else {'records':[]}
LOCAL_RE=re.compile(r'^https?://127\.0\.0\.1:\d+/')
UNSPLASH_RE=re.compile(r'(photo-[0-9]+-[A-Za-z0-9]+)')
SOURCE_GLOBS=['*.html','*.css','*.js','*.mjs']

def median(xs): return statistics.median(xs) if xs else 0

def normalize_url(u):
    if LOCAL_RE.match(u): return 'LOCAL/'+LOCAL_RE.sub('',u,1)
    return u

def third_party(u): return not u.startswith('LOCAL/')

def resource_class(r):
    mime=(r.get('mime') or '').lower(); u=r.get('url','').lower()
    if mime.startswith('image/') or re.search(r'\.(?:png|jpe?g|webp|avif|gif|svg)(?:\?|$)',u): return 'Image'
    if mime.startswith('video/') or re.search(r'\.(?:mp4|webm)(?:\?|$)',u): return 'Video'
    if 'javascript' in mime or re.search(r'\.m?js(?:\?|$)',u): return 'Script'
    if 'text/css' in mime or re.search(r'\.css(?:\?|$)',u): return 'Stylesheet'
    if 'text/html' in mime or u.endswith('.html'): return 'Document'
    if 'font' in mime or re.search(r'\.(?:woff2?|ttf|otf)(?:\?|$)',u): return 'Font'
    return 'Other'

def logical_asset(u, cls):
    if not third_party(u): return None
    p=urlparse(u)
    if cls=='Image' and p.netloc=='images.unsplash.com':
        m=UNSPLASH_RE.search(p.path)
        if m: return f'unsplash:{p.netloc}:{m.group(1)}'
    if cls=='Image': return f'image:{p.netloc}:{p.path}'
    return f'{cls.lower()}:{p.netloc}:{p.path}'

def qparam(u,k):
    try: return dict(parse_qsl(urlparse(u).query)).get(k)
    except Exception: return None

def grep_source(token, rev=None):
    cmd=['git','grep','-l','-F',token]
    if rev: cmd.append(rev)
    cmd += ['--',*SOURCE_GLOBS]
    cp=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    if cp.returncode not in (0,1): return []
    return sorted(x for x in cp.stdout.splitlines() if x)

def exact_source_authority(url):
    b=grep_source(url,BASE); a=grep_source(url,None)
    return {
        'baselineFiles':b,'candidateFiles':a,
        'baselinePresent':bool(b),'candidatePresent':bool(a),
        'sourceRemoved':bool(b) and not bool(a),
        'sourceAdded':bool(a) and not bool(b),
        'sourcePersistent':bool(a) and bool(b)
    }

def logical_source_authority(aid):
    token=aid.split(':')[-1]
    b=grep_source(token,BASE); a=grep_source(token,None)
    changed=[]
    for f in sorted(set(b+a)):
        if f not in b or f not in a: changed.append(f); continue
        if subprocess.run(['git','diff','--quiet',BASE,'--',f]).returncode!=0: changed.append(f)
    return {'token':token,'baselineFiles':b,'candidateFiles':a,'changedFiles':changed,'logicalSourceChanged':bool(changed)}

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
            rr.append({'url':u,'class':cls,'thirdParty':third_party(u),'encoded':int(r0.get('encoded') or 0),'logicalAsset':logical_asset(u,cls),'mime':r0.get('mime'),'status':r0.get('status')})
        runs.append(rr)
    return runs

def occurrence_vector(runs,u): return [sum(1 for r in rr if r['url']==u) for rr in runs]
def det_transfer(runs, stochastic_urls): return [sum(r['encoded'] for r in rr if r['url'] not in stochastic_urls) for rr in runs]
def det_requests(runs, stochastic_urls): return [sum(1 for r in rr if r['url'] not in stochastic_urls) for rr in runs]
def det_thirdparty(runs, stochastic_urls): return [sum(1 for r in rr if r['thirdParty'] and r['url'] not in stochastic_urls) for rr in runs]
def repeated_increase(bv,av): return bool(av) and min(av)>max(bv or [0])

def record_for(key):
    route,w,h=key
    for r in RECORDS.get('records',[]):
        if r.get('route')==route and r.get('width')==w and r.get('height')==h: return r
    return None

B=rows_by_case(BEFORE); A=rows_by_case(AFTER)
case_reports=[]; unresolved=[]; adjudicated=[]; source_removed_optimizations=[]
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
    added=sorted(set(aunion)-set(bunion)); removed=sorted(set(bunion)-set(aunion))
    bhosts=sorted(set(urlparse(u).netloc for u in bunion if third_party(u))); ahosts=sorted(set(urlparse(u).netloc for u in aunion if third_party(u)))
    bclasses=sorted(set(r['class'] for rr in bruns for r in rr)); aclasses=sorted(set(r['class'] for rr in aruns for r in rr))
    candidate_only_hosts=sorted(set(ahosts)-set(bhosts)); candidate_only_classes=sorted(set(aclasses)-set(bclasses))
    all_urls=sorted(set(bunion+aunion)); freq={}
    for u in all_urls:
        bv=occurrence_vector(bruns,u); av=occurrence_vector(aruns,u)
        freq[u]={'before':bv,'after':av,'beforeTotal':sum(bv),'afterTotal':sum(av)}

    logical={}
    for side,runs in [('before',bruns),('after',aruns)]:
        for rr in runs:
            for r in rr:
                if r['logicalAsset'] and r['class']=='Image':
                    g=logical.setdefault(r['logicalAsset'],{'before':{},'after':{}})
                    g[side][r['url']]=g[side].get(r['url'],0)+1

    stochastic_urls=set(); logical_details=[]; logical_fail=[]; case_source_removed=[]
    for aid,g in sorted(logical.items()):
        baseline_total=sum(g['before'].values()); candidate_total=sum(g['after'].values())
        if candidate_total and not baseline_total:
            logical_fail.append(f'candidate-added logical external image asset {aid}')
        variants=sorted(set(g['before'])|set(g['after']))
        variant_meta=[]
        for u in variants:
            bv=occurrence_vector(bruns,u); av=occurrence_vector(aruns,u); auth=exact_source_authority(u)
            variant_meta.append({'url':u,'before':bv,'after':av,'beforeTotal':sum(bv),'afterTotal':sum(av),'width':qparam(u,'w'),'sourceAuthority':auth})
            if auth['sourceAdded']:
                logical_fail.append(f'candidate source introduced external image variant {u}')

        persistent=[v for v in variant_meta if v['sourceAuthority']['sourcePersistent']]
        persistent_loaded=[v for v in persistent if v['afterTotal']>0]
        source_removed=[v for v in variant_meta if v['sourceAuthority']['sourceRemoved']]

        # A source-removed baseline variant is an optimization only when another
        # source-persistent variant of the same logical asset remains and is
        # actually loaded by the candidate. This is generic source-diff authority,
        # not a route-specific exception.
        if source_removed:
            if not persistent_loaded:
                logical_fail.append(f'logical image lost after source removal with no persistent loaded variant: {aid}')
            else:
                for v in source_removed:
                    if v['afterTotal']!=0:
                        logical_fail.append(f'source-removed variant still requested by candidate {v["url"]}')
                    else:
                        rec={'case':f'{route}|{w}x{h}','logicalAsset':aid,'exactUrl':v['url'],'baselineOccurrences':v['beforeTotal'],'candidateOccurrences':v['afterTotal'],'classification':'AUTHORIZED SOURCE-REMOVED OPTIMIZATION','persistentLoadedVariants':[x['url'] for x in persistent_loaded]}
                        case_source_removed.append(rec); source_removed_optimizations.append(rec)

        # Intended behavior is selected only from source-persistent variants.
        # A deliberately source-removed preload can never become the intended
        # candidate image simply because it was frequent at baseline.
        intended=None
        if persistent:
            intended=sorted(persistent,key=lambda v:(-v['beforeTotal'],-v['afterTotal'],int(v['width'] or 10**9),v['url']))[0]
            if intended['beforeTotal']==len(bruns) and intended['afterTotal']<len(aruns):
                logical_fail.append(f'intended source-persistent image not consistently loaded: {intended["url"]} {intended["beforeTotal"]}->{intended["afterTotal"]}')

        # Persistent third-party variants that vary across runs are stochastic
        # only when their exact source remains present on both sides. A repeatable
        # candidate increase remains a failure.
        for v in persistent:
            variability=(len(set(v['before']))>1 or len(set(v['after']))>1)
            rec=record_for(key)
            known_record_variant=bool(rec and rec.get('exactVariant')==v['url'] and rec.get('classification')=='PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST')
            stochastic_eligible=(variability or known_record_variant) and v['beforeTotal']>0
            if stochastic_eligible:
                stochastic_urls.add(v['url'])
                if repeated_increase(v['before'],v['after']):
                    logical_fail.append(f'repeatable stochastic-variant increase {v["url"]}: {v["before"]}->{v["after"]}')
            v['stochasticEligible']=stochastic_eligible

        logical_details.append({'logicalAsset':aid,'logicalSourceAuthority':logical_source_authority(aid),'intendedPersistentVariant':intended,'sourceRemovedVariants':source_removed,'persistentLoadedVariants':[x['url'] for x in persistent_loaded],'variants':variant_meta})

    strict_added=[]
    for u in added:
        if u.startswith('LOCAL/'):
            strict_added.append(u); continue
        cls=next((r['class'] for rr in aruns for r in rr if r['url']==u),'Other')
        if cls!='Image' or u not in stochastic_urls:
            strict_added.append(u)

    deterministic_frequency_increases=[]
    for u in all_urls:
        if u in stochastic_urls: continue
        bv=occurrence_vector(bruns,u); av=occurrence_vector(aruns,u)
        if repeated_increase(bv,av): deterministic_frequency_increases.append({'url':u,'before':bv,'after':av})

    bdet_t=det_transfer(bruns,stochastic_urls); adet_t=det_transfer(aruns,stochastic_urls)
    bdet_r=det_requests(bruns,stochastic_urls); adet_r=det_requests(aruns,stochastic_urls)
    bdet_tp=det_thirdparty(bruns,stochastic_urls); adet_tp=det_thirdparty(aruns,stochastic_urls)
    bdt=median(bdet_t); adt=median(adet_t)
    det_transfer_ok=(adt<=bdt*1.10 if bdt else adt==0)

    rec=record_for(key)
    record_support=False
    if rec:
        if rec.get('classification')=='STRUCTURAL SAME-RUN REQUEST GRAPH':
            record_support=bool(rec.get('verifiedStructuralEquivalence'))
        elif rec.get('classification')=='PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST':
            record_support=(rec.get('candidateAddedUrls')==0 and rec.get('candidateOnlyHosts')==0 and rec.get('candidateOnlyResourceClasses')==0 and rec.get('candidateObservedOccurrences',999)<=rec.get('baselineObservedOccurrences',-1))

    issues=[]
    if 'cls' in raw: issues.append(f'CLS regression {bmed["cls"]}->{amed["cls"]}')
    if strict_added: issues.append(f'candidate-added resources {strict_added}')
    if candidate_only_hosts: issues.append(f'candidate-only hosts {candidate_only_hosts}')
    if candidate_only_classes: issues.append(f'candidate-only resource classes {candidate_only_classes}')
    if deterministic_frequency_increases: issues.append(f'repeatable deterministic request-frequency increases {deterministic_frequency_increases}')
    if logical_fail: issues.extend(logical_fail)
    if not det_transfer_ok: issues.append(f'unexplained deterministic transfer growth {bdt}->{adt}')
    if median(adet_r)>median(bdet_r) and not record_support: issues.append(f'deterministic median request growth {median(bdet_r)}->{median(adet_r)}')
    if median(adet_tp)>median(bdet_tp) and not record_support: issues.append(f'deterministic median third-party growth {median(bdet_tp)}->{median(adet_tp)}')

    status='PASS'; classification='STRICT PASS'
    if issues:
        status='FAIL'; classification='REAL PERFORMANCE REGRESSION'; unresolved.append({'case':f'{route}|{w}x{h}','issues':issues})
    elif raw:
        classification='MEASUREMENT VARIANCE — NO CANDIDATE REGRESSION'; adjudicated.append({'case':f'{route}|{w}x{h}','rawFailures':raw,'record':rec.get('id') if rec else None,'stochasticUrls':sorted(stochastic_urls)})
    elif case_source_removed:
        classification='PASS — SOURCE-REMOVED OPTIMIZATION VERIFIED'

    case_reports.append({'case':f'{route}|{w}x{h}','route':route,'width':w,'height':h,'beforeMedian':bmed,'afterMedian':amed,'rawMedianFailures':raw,'status':status,'classification':classification,'issues':issues,'baselineUrlUnion':bunion,'candidateUrlUnion':aunion,'addedUrls':added,'removedUrls':removed,'candidateOnlyHosts':candidate_only_hosts,'candidateOnlyResourceClasses':candidate_only_classes,'stochasticUrls':sorted(stochastic_urls),'sourceRemovedOptimizations':case_source_removed,'logicalAssets':logical_details,'urlFrequency':freq,'deterministicRequestCounts':{'before':bdet_r,'after':adet_r,'beforeMedian':median(bdet_r),'afterMedian':median(adet_r)},'deterministicThirdPartyCounts':{'before':bdet_tp,'after':adet_tp,'beforeMedian':median(bdet_tp),'afterMedian':median(adet_tp)},'deterministicTransferTotals':{'before':bdet_t,'after':adet_t,'beforeMedian':bdt,'afterMedian':adt,'within10Percent':det_transfer_ok},'measurementRecord':rec})

report={'model':{'name':'Phase 19 two-layer deterministic/stochastic performance acceptance v2','deterministicLayer':'strict product graph, exact source additions/removals, host/class, repeatable frequency, transfer and CLS gates','stochasticLayer':'pre-existing third-party image variants grouped by exact URL and logical asset; exact occurrence equality not required when exact source persists and no repeatable candidate increase','sourceDiffAuthority':'exact URL source presence + logical asset source context','sourceRemovedOptimizationRule':'baseline-only exact variant is allowed only when source removal is proven and a source-persistent variant of the same logical asset remains loaded','exactUrlAndLogicalAsset':True,'oneSidedRegressionRule':True},'records':RECORDS.get('records',[]),'cases':case_reports,'sourceRemovedOptimizations':source_removed_optimizations,'adjudicatedMeasurementVariance':adjudicated,'unresolvedFailures':unresolved,'unresolvedCount':len(unresolved)}
out=PACK/'reports/performance-adjudication.json'; out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'model':report['model'],'sourceRemovedOptimizations':source_removed_optimizations,'adjudicatedMeasurementVariance':adjudicated,'unresolvedFailures':unresolved,'unresolvedCount':len(unresolved),'caseTable':[{'case':c['case'],'raw':c['rawMedianFailures'],'status':c['status'],'classification':c['classification']} for c in case_reports]},indent=2))
if unresolved: sys.exit(1)
