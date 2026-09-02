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

def source_files_for_token(token, rev=None):
    cmd=['git','grep','-l','-F',token]
    if rev: cmd.append(rev)
    cmd += ['--','*.html','*.css','*.js','*.mjs']
    cp=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    if cp.returncode not in (0,1): return []
    return sorted(x for x in cp.stdout.splitlines() if x)

def source_authority(asset_id):
    token=asset_id.split(':')[-1]
    b=source_files_for_token(token,BASE); a=source_files_for_token(token,None); changed=[]
    for f in sorted(set(b+a)):
        if f not in b or f not in a: changed.append(f); continue
        if subprocess.run(['git','diff','--quiet',BASE,'--',f]).returncode!=0: changed.append(f)
    return {'token':token,'baselineFiles':b,'candidateFiles':a,'changedFiles':changed,'sourceChanged':bool(changed)}

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
def deterministic_transfer(runs, stochastic_urls): return [sum(r['encoded'] for r in rr if r['url'] not in stochastic_urls) for rr in runs]
def deterministic_request_count(runs, stochastic_urls): return [sum(1 for r in rr if r['url'] not in stochastic_urls) for rr in runs]
def deterministic_thirdparty_count(runs, stochastic_urls): return [sum(1 for r in rr if r['thirdParty'] and r['url'] not in stochastic_urls) for rr in runs]
def repeated_increase(bvec,avec): return bool(avec) and min(avec)>max(bvec or [0])

def record_for(case_key):
    route,w,h=case_key
    for r in RECORDS.get('records',[]):
        if r.get('route')==route and r.get('width')==w and r.get('height')==h: return r
    return None

B=rows_by_case(BEFORE); A=rows_by_case(AFTER)
case_reports=[]; unresolved=[]; adjudicated=[]
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
    stochastic_urls=set(); logical_details=[]; logical_fail=[]
    for aid,g in sorted(logical.items()):
        baseline_total=sum(g['before'].values()); candidate_total=sum(g['after'].values()); authority=source_authority(aid)
        baseline_urls=set(g['before']); candidate_urls=set(g['after'])
        if candidate_total and not baseline_total: logical_fail.append(f'candidate-added logical external image asset {aid}')
        intended=None
        if g['before']:
            intended=sorted(g['before'], key=lambda u:(-g['before'][u], int(qparam(u,'w') or 10**9), u))[0]
        intended_before=g['before'].get(intended,0) if intended else 0; intended_after=g['after'].get(intended,0) if intended else 0
        if intended and intended_before==len(bruns) and intended_after<len(aruns): logical_fail.append(f'intended responsive image not consistently loaded: {intended} {intended_before}->{intended_after}')
        variants=sorted((baseline_urls|candidate_urls)-({intended} if intended else set())); variant_details=[]
        for u in variants:
            bv=occurrence_vector(bruns,u); av=occurrence_vector(aruns,u); source_unchanged=not authority['sourceChanged']
            can_stochastic=(baseline_total>0 and source_unchanged and (not intended or intended_after>0))
            if can_stochastic:
                stochastic_urls.add(u)
                if sum(av)>sum(bv) and sum(av)>=len(aruns): logical_fail.append(f'repeatable stochastic-variant increase {u}: {sum(bv)}->{sum(av)}')
            elif sum(av)>sum(bv): logical_fail.append(f'external image variant increase with changed/unknown source {u}: {sum(bv)}->{sum(av)}')
            variant_details.append({'url':u,'before':bv,'after':av,'beforeTotal':sum(bv),'afterTotal':sum(av),'stochasticEligible':can_stochastic,'width':qparam(u,'w')})
        logical_details.append({'logicalAsset':aid,'authority':authority,'intendedUrl':intended,'intendedBeforeTotal':intended_before,'intendedAfterTotal':intended_after,'variants':variant_details})
    strict_added=[]
    for u in added:
        if u.startswith('LOCAL/'): strict_added.append(u); continue
        cls=next((r['class'] for rr in aruns for r in rr if r['url']==u),'Other'); aid=logical_asset(u,cls)
        if not aid or u not in stochastic_urls: strict_added.append(u)
    deterministic_frequency_increases=[]
    for u in all_urls:
        if u in stochastic_urls: continue
        bv=occurrence_vector(bruns,u); av=occurrence_vector(aruns,u)
        if repeated_increase(bv,av): deterministic_frequency_increases.append({'url':u,'before':bv,'after':av})
    bdet_t=deterministic_transfer(bruns,stochastic_urls); adet_t=deterministic_transfer(aruns,stochastic_urls)
    bdet_r=deterministic_request_count(bruns,stochastic_urls); adet_r=deterministic_request_count(aruns,stochastic_urls)
    bdet_tp=deterministic_thirdparty_count(bruns,stochastic_urls); adet_tp=deterministic_thirdparty_count(aruns,stochastic_urls)
    det_transfer_ok=(median(adet_t)<=median(bdet_t)*1.10 if median(bdet_t) else median(adet_t)==0)
    rec=record_for(key); record_support=False
    if rec:
        if rec.get('classification')=='STRUCTURAL SAME-RUN REQUEST GRAPH': record_support=bool(rec.get('verifiedStructuralEquivalence'))
        elif rec.get('classification')=='PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST':
            record_support=(rec.get('candidateAddedUrls')==0 and rec.get('candidateOnlyHosts')==0 and rec.get('candidateOnlyResourceClasses')==0 and rec.get('candidateObservedOccurrences',999)<=rec.get('baselineObservedOccurrences',-1))
    issues=[]
    if 'cls' in raw: issues.append(f'CLS regression {bmed["cls"]}->{amed["cls"]}')
    if strict_added: issues.append(f'candidate-added resources {strict_added}')
    if candidate_only_hosts: issues.append(f'candidate-only hosts {candidate_only_hosts}')
    if candidate_only_classes: issues.append(f'candidate-only resource classes {candidate_only_classes}')
    if deterministic_frequency_increases: issues.append(f'repeatable deterministic request-frequency increases {deterministic_frequency_increases}')
    if logical_fail: issues.extend(logical_fail)
    if not det_transfer_ok: issues.append(f'unexplained deterministic transfer growth {median(bdet_t)}->{median(adet_t)}')
    if median(adet_r)>median(bdet_r) and not record_support: issues.append(f'deterministic median request growth {median(bdet_r)}->{median(adet_r)}')
    if median(adet_tp)>median(bdet_tp) and not record_support: issues.append(f'deterministic median third-party growth {median(bdet_tp)}->{median(adet_tp)}')
    status='PASS'; classification='STRICT PASS'
    if issues:
        status='FAIL'; classification='REAL PERFORMANCE REGRESSION'; unresolved.append({'case':f'{route}|{w}x{h}','issues':issues})
    elif raw:
        classification='MEASUREMENT VARIANCE — NO CANDIDATE REGRESSION'; adjudicated.append({'case':f'{route}|{w}x{h}','rawFailures':raw,'record':rec.get('id') if rec else None})
    case_reports.append({'case':f'{route}|{w}x{h}','route':route,'width':w,'height':h,'beforeMedian':bmed,'afterMedian':amed,'rawMedianFailures':raw,'status':status,'classification':classification,'issues':issues,'baselineUrlUnion':bunion,'candidateUrlUnion':aunion,'addedUrls':added,'removedUrls':removed,'candidateOnlyHosts':candidate_only_hosts,'candidateOnlyResourceClasses':candidate_only_classes,'stochasticUrls':sorted(stochastic_urls),'logicalAssets':logical_details,'urlFrequency':freq,'deterministicRequestCounts':{'before':bdet_r,'after':adet_r,'beforeMedian':median(bdet_r),'afterMedian':median(adet_r)},'deterministicThirdPartyCounts':{'before':bdet_tp,'after':adet_tp,'beforeMedian':median(bdet_tp),'afterMedian':median(adet_tp)},'deterministicTransferTotals':{'before':bdet_t,'after':adet_t,'beforeMedian':median(bdet_t),'afterMedian':median(adet_t),'within10Percent':det_transfer_ok},'measurementRecord':rec})

report={'model':{'name':'Phase 19 two-layer deterministic/stochastic performance acceptance','deterministicLayer':'strict product graph, source-diff, host/class, repeatable frequency, transfer and CLS gates','stochasticLayer':'pre-existing third-party image variants grouped by exact URL and logical asset; exact occurrence equality not required when source unchanged and no repeatable candidate increase','sourceDiffAuthority':True,'exactUrlAndLogicalAsset':True,'oneSidedRegressionRule':True},'records':RECORDS.get('records',[]),'cases':case_reports,'adjudicatedMeasurementVariance':adjudicated,'unresolvedFailures':unresolved,'unresolvedCount':len(unresolved)}
out=PACK/'reports/performance-adjudication.json'; out.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'model':report['model'],'adjudicatedMeasurementVariance':adjudicated,'unresolvedFailures':unresolved,'unresolvedCount':len(unresolved),'caseTable':[{'case':c['case'],'raw':c['rawMedianFailures'],'status':c['status'],'classification':c['classification']} for c in case_reports]},indent=2))
if unresolved: sys.exit(1)
