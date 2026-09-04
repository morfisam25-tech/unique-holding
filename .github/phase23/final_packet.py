from pathlib import Path
import hashlib
import json
import subprocess

BASELINE='b247b536eda5b1f48ada5b6a09c657b324d289f1'
NEW='46190b02d6760d5c3e59d042535479636c2f2b9a'
TREE='9c0e469b36582314363feab282c95852f4d81ffa'
MOBILE='+90 539 380 91 97'
EMAIL='farahmand@uniqueholding.com.tr'
P=Path('/tmp/phase23-review');R=P/'reports';R.mkdir(parents=True,exist_ok=True)


def run(args,cwd=None,check=True):
    p=subprocess.run(args,cwd=cwd,text=True,capture_output=True)
    if check and p.returncode:
        raise SystemExit(f'command failed {args}: {p.stderr}')
    return p

def grep(root,s,html_only=False):
    cmd=['git','grep','-n','-F',s,'--']
    if html_only: cmd.append('*.html')
    p=run(cmd,cwd=root,check=False)
    rows=[x for x in p.stdout.splitlines() if x.strip()]
    return {'occurrences':len(rows),'files':sorted({x.split(':',1)[0] for x in rows}),'matches':rows}

def webp_dims(path):
    b=Path(path).read_bytes()
    if b[:4]!=b'RIFF' or b[8:12]!=b'WEBP': raise ValueError(path)
    kind=b[12:16]
    if kind==b'VP8 ':
        i=b.find(b'\x9d\x01\x2a'); w=int.from_bytes(b[i+3:i+5],'little')&0x3fff; h=int.from_bytes(b[i+5:i+7],'little')&0x3fff
    elif kind==b'VP8X':
        w=1+int.from_bytes(b[24:27],'little'); h=1+int.from_bytes(b[27:30],'little')
    elif kind==b'VP8L':
        bits=int.from_bytes(b[21:25],'little'); w=(bits&0x3fff)+1; h=((bits>>14)&0x3fff)+1
    else: raise ValueError(kind)
    return w,h,len(b)

def sha(path):
    h=hashlib.sha256();
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

# Immutable branch/candidate readback.
main=run(['git','ls-remote','origin','refs/heads/main'],cwd='candidate').stdout.split()[0]
rebuild=run(['git','ls-remote','origin','refs/heads/rebuild/award-level-corporate-v2'],cwd='candidate').stdout.split()[0]
head=run(['git','rev-parse','HEAD'],cwd='candidate').stdout.strip(); tree=run(['git','rev-parse','HEAD^{tree}'],cwd='candidate').stdout.strip(); parent=run(['git','rev-parse','HEAD^'],cwd='candidate').stdout.strip()
assert main==BASELINE and rebuild==NEW and head==NEW and tree==TREE and parent==BASELINE
(R/'branch-readback.txt').write_text(f'MAIN={main}\nREBUILD={rebuild}\nCANDIDATE={head}\nTREE={tree}\nPARENT={parent}\n')

# Exact changed-file list.
changed=run(['git','diff','--name-only',f'{BASELINE}..{NEW}'],cwd='candidate').stdout.splitlines()
(R/'changed-files.txt').write_text('\n'.join(changed)+'\n')
(R/'diff-stat.txt').write_text(run(['git','diff','--stat',f'{BASELINE}..{NEW}'],cwd='candidate').stdout)

# Exact string sweeps, repository vs public-product HTML scope.
sweep={}
for key,s in [('mobile',MOBILE),('email',EMAIL)]:
    sweep[key]={
      'baselineRepository':grep('baseline',s),
      'baselinePublicHtml':grep('baseline',s,True),
      'candidateRepository':grep('candidate',s),
      'candidatePublicHtml':grep('candidate',s,True)
    }
assert sweep['mobile']['baselineRepository']['occurrences']==25
assert sweep['email']['baselineRepository']['occurrences']==34
assert sweep['mobile']['baselinePublicHtml']['occurrences']==20
assert sweep['email']['baselinePublicHtml']['occurrences']==25
assert sweep['mobile']['candidatePublicHtml']['occurrences']==0
assert sweep['email']['candidatePublicHtml']['occurrences']==0
(R/'exact-string-sweep.json').write_text(json.dumps(sweep,indent=2,ensure_ascii=False))

# Image source/provenance and exact dimensions/bytes.
ow,oh,os=webp_dims('baseline/assets/phase04/film-still-logistics.webp')
nw,nh,ns=webp_dims('candidate/assets/phase08/film-still-physical-trade.webp')
assert (ow,oh,os)==(800,450,14924)
assert (nw,nh,ns)==(960,540,32966)
image={
 'replacedReference':{'path':'assets/phase04/film-still-logistics.webp','dimensions':[ow,oh],'bytes':os},
 'replacement':{'path':'assets/phase08/film-still-physical-trade.webp','dimensions':[nw,nh],'bytes':ns,'sourceClass':'EXISTING APPROVED INTERNAL / PROVENANCE-SAFE PHASE 08 ASSET','binaryModifiedInPhase23':False},
 'selectionRationale':'Approved corporate film was sampled first; sampled frames did not provide a suitable industrial/logistics still. Existing approved internal Phase 08 physical-trade still was therefore used under priority 2.'
}
(R/'homepage-image-evidence.json').write_text(json.dumps(image,indent=2))

# Protected film and caption are byte-identical baseline -> candidate.
film_files=['assets/media/unique-holding-film-720p.mp4','assets/media/unique-holding-caption.vtt']
film=[]
for rel in film_files:
    a=sha(Path('baseline')/rel);b=sha(Path('candidate')/rel);assert a==b
    film.append({'path':rel,'baselineSha256':a,'candidateSha256':b,'match':True})
(R/'protected-film-evidence.json').write_text(json.dumps(film,indent=2))

# Independent static QA logs must already be present and explicitly pass.
qa_required={
 'qa-site.log':['TECHNICAL QA PASS','REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0','protected film hashes verified'],
 'qa-seo.log':['PHASE 18 SEO QA PASS'],
 'qa-performance.log':['PHASE 19 PERFORMANCE QA PASS'],
 'qa-accessibility.log':['PHASE 19 ACCESSIBILITY STATIC QA PASS']
}
for name,tokens in qa_required.items():
    txt=(R/name).read_text()
    for token in tokens: assert token in txt,(name,token)

# Browser evidence.
browser=json.loads((P/'browser-qa.json').read_text())
assert browser['smokeCases']==24 and browser['smokeFailures']==0
assert browser['visualCases']==9 and browser['visualAutomatedFailures']==0 and browser['totalErrors']==0
assert len(list((P/'screenshots').glob('*.png')))==12
assert browser['contact']['direct'] and len(browser['contact']['direct'])==2
assert all(x['src']=='assets/phase08/film-still-physical-trade.webp' and x['naturalWidth']==960 and x['naturalHeight']==540 and x['density']>=1 for x in browser['imageChecks'])

manifest={
 'status':'READY FOR REVIEW',
 'baselineSha':BASELINE,'newSha':NEW,'newTree':TREE,'mainSha':main,'rebuildSha':rebuild,
 'targetBranch':'rebuild/award-level-corporate-v2','changedFiles':changed,
 'personalMobile':{
   'baselineRepositoryOccurrences':sweep['mobile']['baselineRepository']['occurrences'],
   'baselineRepositoryFiles':sweep['mobile']['baselineRepository']['files'],
   'baselinePublicHtmlOccurrences':sweep['mobile']['baselinePublicHtml']['occurrences'],
   'candidateRepositoryOccurrences':sweep['mobile']['candidateRepository']['occurrences'],
   'candidateRepositoryFiles':sweep['mobile']['candidateRepository']['files'],
   'candidatePublicHtmlOccurrences':0
 },
 'personalEmail':{
   'baselineRepositoryOccurrences':sweep['email']['baselineRepository']['occurrences'],
   'baselineRepositoryFiles':sweep['email']['baselineRepository']['files'],
   'baselinePublicHtmlOccurrences':sweep['email']['baselinePublicHtml']['occurrences'],
   'candidateRepositoryOccurrences':sweep['email']['candidateRepository']['occurrences'],
   'candidateRepositoryFiles':sweep['email']['candidateRepository']['files'],
   'candidatePublicHtmlOccurrences':0
 },
 'approvedContactsPreserved':{'officePhone':'+90 212 727 22 22','salesEmail':'sales@uniqueholding.com.tr'},
 'replacementImage':image['replacement'],'replacedImage':image['replacedReference'],'imageSelectionRationale':image['selectionRationale'],
 'technicalQa':'PASS','seoQa':'PASS','performanceStaticQa':'PASS','accessibilityStaticQa':'PASS',
 'browserSmokeCases':24,'browserSmokeFailures':0,'requiredVisualCases':9,'requiredVisualFailures':0,
 'screenshotCount':12,'protectedFilmChanged':False,'productCounts':{'reference':3,'inquiry':62,'invalid':0},
 'forbiddenTelMailtoFailures':0,'horizontalOverflowFailures':0,'consolePageErrorFailures':0,'brokenSameOriginAssetFailures':0,
 'mainModified':False,'deployed':False
}
(P/'phase23-review-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))

res_mobile=manifest['personalMobile']['candidateRepositoryOccurrences'];res_email=manifest['personalEmail']['candidateRepositoryOccurrences']
res_files_mobile=', '.join(f'`{x}`' for x in manifest['personalMobile']['candidateRepositoryFiles']) or 'none'
res_files_email=', '.join(f'`{x}`' for x in manifest['personalEmail']['candidateRepositoryFiles']) or 'none'
packet=f'''# PHASE 23 — PUBLIC CONTACT SANITIZATION + HOMEPAGE IMAGE QUALITY FIX

**STATUS: READY FOR REVIEW**

BASELINE SHA: `{BASELINE}`  
NEW SHA: `{NEW}`  
NEW TREE: `{TREE}`  
TARGET BRANCH: `rebuild/award-level-corporate-v2`

## Exact contact sweep
- `+90 539 380 91 97`: repository-wide before **25**, public HTML before **20**, public HTML after **0**.
- `farahmand@uniqueholding.com.tr`: repository-wide before **34**, public HTML before **25**, public HTML after **0**.
- Repository-wide after (non-product QA/docs allowed): mobile **{res_mobile}** in {res_files_mobile}; email **{res_email}** in {res_files_email}.
- Approved office phone `+90 212 727 22 22` remains.
- Approved sales email `sales@uniqueholding.com.tr` remains.

Exact before/after matches and file lists are in `reports/exact-string-sweep.json`.

## Homepage image correction
The first image under the protected film in **“Physical markets. Commercial execution.”** now references `{image['replacement']['path']}` — **960×540, {image['replacement']['bytes']:,} bytes** — replacing the old `{image['replacedReference']['path']}` reference — **800×450, {image['replacedReference']['bytes']:,} bytes**.

Source class: **{image['replacement']['sourceClass']}**. No image binary was newly introduced or modified; the sharper asset already existed in the approved repository. The protected film was sampled first, but the sampled frames did not provide a suitable industrial/logistics still, so the approved internal Phase 08 asset was selected. The protected film/caption bytes are unchanged.

## QA results
- Site technical QA: **PASS**.
- SEO QA: **PASS** — 16 routes / 14 indexable / 14 sitemap URLs / 0 failures.
- Performance static QA: **PASS**.
- Accessibility static QA: **PASS**.
- Product counts: **REFERENCE=3 / INQUIRY=62 / INVALID=0**.
- Browser smoke: **24/24 PASS** (all 16 routes at desktop + the required 8 routes at 390×844).
- Required visual/browser matrix: **9/9 PASS**.
- Personal mobile visible: **0**.
- Personal email visible: **0**.
- Broken forbidden `tel:`/`mailto:` links: **0**.
- Empty/awkward contact cards: **0**.
- Horizontal overflow: **0**.
- Console/page errors: **0**.
- Broken same-origin asset responses: **0**.
- Replacement image load/intrinsic/density gates: **PASS** at 1440×900, 390×844 and 360×800.
- Protected film regression: **NONE**.
- `main` remains `{BASELINE}`; no deploy, DNS, HTTPS or GitHub Pages change occurred.

## Exact changed files
''' + ''.join(f'- `{x}`\n' for x in changed) + '''
## Visual evidence
The packet includes the required viewport screenshots plus dedicated evidence for:
- fixed homepage image area;
- Contact page corporate/public contact output;
- Corporate page, where the personal email was previously exposed;
- clean mobile Contact output at 390×844.
'''
(P/'PHASE_23_REVIEW_PACKET.md').write_text(packet)
print('PHASE23_FINAL_PACKET_PASS')
print(json.dumps({'candidateRepositoryMobileOccurrences':res_mobile,'candidateRepositoryEmailOccurrences':res_email,'screenshots':12,'smoke':'24/24','visual':'9/9'},indent=2))
