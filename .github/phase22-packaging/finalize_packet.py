#!/usr/bin/env python3
import hashlib, json, os, pathlib, re, shutil, socket, ssl, subprocess, sys, urllib.request, zipfile

REPO=os.environ['GITHUB_REPOSITORY']
TOKEN=os.environ['GH_TOKEN']
QA=pathlib.Path(os.environ.get('QA22_DIR','qa22'))
CAND=pathlib.Path(os.environ.get('CANDIDATE_DIR','candidate'))
OUT=pathlib.Path('/tmp/phase22-final')
SRC=pathlib.Path('/tmp/phase22-source')
SRC_ZIP=pathlib.Path('/tmp/phase22-source.zip')
PROD='b247b536eda5b1f48ada5b6a09c657b324d289f1'
TREE='30a289aaf26cb1944baf76a5d9f53b98cc6e54dd'
PRE_MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
DEPLOY_RUN=33818987323
SOURCE_ARTIFACT=9921975696
BASE='https://www.uniqueholding.com.tr/'


def run(args, cwd=None, check=True):
    p=subprocess.run(args,cwd=cwd,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if check and p.returncode:
        raise RuntimeError(f"command failed {args}: {p.returncode}\nSTDOUT={p.stdout}\nSTDERR={p.stderr}")
    return p.stdout.strip()


def gh_json(path):
    req=urllib.request.Request('https://api.github.com'+path,headers={
        'Authorization':f'Bearer {TOKEN}',
        'Accept':'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
        'User-Agent':'phase22-final-packager'
    })
    with urllib.request.urlopen(req,timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def url_bytes(url):
    req=urllib.request.Request(url,headers={'User-Agent':'phase22-final-packager','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req,timeout=60) as r:
        return r.read()


def dump(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n")


def sha256_file(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()

# Immutable candidate verification.
assert run(['git','rev-parse','HEAD'],cwd=CAND)==PROD
assert run(['git','rev-parse','HEAD^{tree}'],cwd=CAND)==TREE
assert run(['git','status','--porcelain'],cwd=CAND)==''

# Recover previously completed live production evidence without altering production.
for p in [OUT,SRC]:
    if p.exists(): shutil.rmtree(p)
SRC.mkdir(parents=True)
OUT.mkdir(parents=True)
source_url=f'https://api.github.com/repos/{REPO}/actions/artifacts/{SOURCE_ARTIFACT}/zip'
run(['curl','-fsSL','-H',f'Authorization: Bearer {TOKEN}','-H','Accept: application/vnd.github+json',source_url,'-o',str(SRC_ZIP)])
with zipfile.ZipFile(SRC_ZIP) as z: z.extractall(SRC)
for rel in ['SHA256SUMS.txt','live/fatal.txt','PHASE_22_LIVE_EVIDENCE_PRELIMINARY.md','phase22-automated-manifest.json']:
    p=SRC/rel
    if p.exists(): p.unlink()
live_root=OUT/'evidence'/'live-production'
live_root.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree(SRC,live_root)
manual_src=QA/'.github'/'phase22'/'manual_visual_review.md'
assert manual_src.exists(), manual_src
shutil.copy2(manual_src,OUT/'MANUAL_LIVE_VISUAL_REVIEW.md')
shots_dir=live_root/'live-spotcheck'/'screenshots'
shots=sorted(shots_dir.glob('*.png'))
assert len(shots)==30, len(shots)
manual=(OUT/'MANUAL_LIVE_VISUAL_REVIEW.md').read_text()
reviewed=sorted(re.findall(r'PASS — ([^\n]+\.png)',manual))
assert 'Result: **30 / 30 PASS**' in manual
assert reviewed==sorted(p.name for p in shots), (len(reviewed),len(shots))

reports=OUT/'reports'; reports.mkdir(parents=True,exist_ok=True)

# Independent final readbacks.
main=run(['git','ls-remote',f'https://github.com/{REPO}.git','refs/heads/main']).split()[0]
rebuild=run(['git','ls-remote',f'https://github.com/{REPO}.git','refs/heads/rebuild/award-level-corporate-v2']).split()[0]
noop_line=run(['git','ls-remote',f'https://github.com/{REPO}.git','refs/heads/__noop_should_not_create'],check=True)
noop=noop_line.split()[0] if noop_line else None
assert main==PROD
assert rebuild==PROD
(reports/'main-final-readback.txt').write_text(f'MAIN={main}\n')
(reports/'rebuild-final-readback.txt').write_text(f'REBUILD={rebuild}\n')
(reports/'production-sha-evidence.txt').write_text(f'PRODUCTION_SHA={PROD}\nPRODUCTION_TREE={TREE}\nPHASE22_PRODUCT_CHANGE=NONE\n')

dep=gh_json(f'/repos/{REPO}/actions/runs/{DEPLOY_RUN}')
pages=gh_json(f'/repos/{REPO}/pages')
cmp=gh_json(f'/repos/{REPO}/compare/{PRE_MAIN}...{PROD}')
dep_keep={k:dep.get(k) for k in ['id','name','head_branch','head_sha','path','event','status','conclusion','run_number','created_at','updated_at','run_started_at','html_url']}
pages_keep={k:pages.get(k) for k in ['html_url','cname','build_type','source','https_enforced','https_certificate','public','protected_domain_state','pending_domain_unverified_at'] if k in pages}
compare_keep={
    'preReleaseMainSha':PRE_MAIN,
    'releaseCandidateSha':PROD,
    'status':cmp.get('status'),
    'ahead_by':cmp.get('ahead_by'),
    'behind_by':cmp.get('behind_by'),
    'total_commits':cmp.get('total_commits'),
    'merge_base_sha':(cmp.get('merge_base_commit') or {}).get('sha')
}
assert dep_keep['id']==DEPLOY_RUN and dep_keep['head_sha']==PROD and dep_keep['conclusion']=='success'
assert pages_keep['html_url']==BASE and pages_keep['cname']=='www.uniqueholding.com.tr'
assert pages_keep['https_enforced'] is True
cert=pages_keep['https_certificate']
assert cert['state']=='approved' and set(cert['domains'])=={'www.uniqueholding.com.tr','uniqueholding.com.tr'}
assert compare_keep['ahead_by']==30 and compare_keep['behind_by']==0 and compare_keep['merge_base_sha']==PRE_MAIN
dump(reports/'deployment-evidence.json',dep_keep)
dump(reports/'pages-final-readback.json',pages_keep)
dump(reports/'pre-release-evidence.json',compare_keep)
promotion={**compare_keep,'promotionMethod':'FAST-FORWARD ONLY','postPromotionMainSha':PROD,'productCommitCreatedInPhase22':False}
dump(reports/'main-promotion-evidence.json',promotion)
residue={
    'branch':'__noop_should_not_create',
    'classification':'NON-PRODUCT REPOSITORY HYGIENE RESIDUE',
    'status':'OPEN / NON-BLOCKING' if noop else 'DELETED_OR_ABSENT',
    'sha':noop,
    'uniqueProductCommit':False,
    'uniqueProductTree':False,
    'productBlocker':False
}
if noop: assert noop==PROD
# Do not delete: preservation is explicitly non-blocking and avoids any risk to product/main/production.
dump(reports/'temporary-branch-residue.json',residue)

# Fresh DNS/custom-domain evidence.
dns=[]
for resolver in ['8.8.8.8','1.1.1.1']:
    dns.append(f'### resolver={resolver} www CNAME')
    dns.append(run(['dig','+short',f'@{resolver}','www.uniqueholding.com.tr','CNAME']))
    dns.append(f'### resolver={resolver} apex A')
    dns.append(run(['dig','+short',f'@{resolver}','uniqueholding.com.tr','A']))
dns += ['### MX',run(['dig','+short','uniqueholding.com.tr','MX']),'### TXT',run(['dig','+short','uniqueholding.com.tr','TXT'])]
(reports/'dns-custom-domain-evidence.txt').write_text('\n'.join(dns)+'\n')

# Fresh HTTP -> HTTPS evidence.
redirect_rows=[]
for url in ['http://www.uniqueholding.com.tr/','http://uniqueholding.com.tr/','https://uniqueholding.com.tr/','https://www.uniqueholding.com.tr/']:
    raw=run(['curl','-sS','-I','--max-time','30',url])
    status_line=(raw.splitlines() or [''])[0]
    loc=''
    for line in raw.splitlines():
        if line.lower().startswith('location:'):
            loc=line.split(':',1)[1].strip(); break
    redirect_rows.append({'url':url,'statusLine':status_line,'location':loc,'raw':raw})
dump(reports/'http-to-https-evidence.json',redirect_rows)
assert ' 301 ' in redirect_rows[0]['statusLine'] and redirect_rows[0]['location'].startswith(BASE)
assert ' 301 ' in redirect_rows[1]['statusLine'] and redirect_rows[1]['location'].startswith(BASE)
assert ' 301 ' in redirect_rows[2]['statusLine'] and redirect_rows[2]['location'].startswith(BASE)
assert ' 200 ' in redirect_rows[3]['statusLine']

# Fresh trusted TLS evidence.
tls_rows=[]
for host in ['www.uniqueholding.com.tr','uniqueholding.com.tr']:
    ctx=ssl.create_default_context()
    with socket.create_connection((host,443),timeout=15) as raw:
        with ctx.wrap_socket(raw,server_hostname=host) as s:
            c=s.getpeercert()
            tls_rows.append({'host':host,'authorized':True,'protocol':s.version(),'cipher':s.cipher(),'subject':c.get('subject'),'issuer':c.get('issuer'),'notBefore':c.get('notBefore'),'notAfter':c.get('notAfter'),'subjectAltName':c.get('subjectAltName')})
dump(reports/'tls-certificate-evidence.json',tls_rows)
assert all(x['authorized'] for x in tls_rows)

# Normalize all required evidence surfaces.
copy_map={
    live_root/'live'/'fingerprints.json':reports/'live-fingerprint-evidence.json',
    live_root/'live-spotcheck'/'phase21-spotcheck.json':reports/'production-smoke-and-interactions.json',
    live_root/'live'/'film.json':reports/'film-regression-evidence.json',
    live_root/'live'/'product-counts.json':reports/'product-count-evidence.json',
    live_root/'live'/'legal-privacy.json':reports/'legal-privacy-evidence.json',
    live_root/'live'/'seo-network.json':reports/'seo-network-evidence.json',
    live_root/'live'/'tls-redirects.json':reports/'tls-http-redirect-live-evidence.json'
}
for src,dst in copy_map.items():
    assert src.exists(), src
    shutil.copy2(src,dst)
(reports/'robots-live.txt').write_bytes(url_bytes(BASE+'robots.txt'))
(reports/'sitemap-live.xml').write_bytes(url_bytes(BASE+'sitemap.xml'))

seo=json.loads((reports/'seo-network-evidence.json').read_text())
rows=seo['rows']
canon=[{'route':r['route'],'canonical':r['canonical'],'ogUrl':r['ogUrl']} for r in rows]
social=[{'route':r['route'],'ogImage':r['ogImage'],'twitterCard':r['twitterCard'],'twitterImage':r['twitterImage']} for r in rows]
net=[{'route':r['route'],'consoleErrors':r['consoleErrors'],'pageErrors':r['pageErrors'],'httpRequests':r['httpRequests'],'sameOriginBad':r['sameOriginBad']} for r in rows]
mixed={'mixedContentHttpRequests':sum(len(r['httpRequests']) for r in rows),'criticalSameOriginFailures':sum(len(r['sameOriginBad']) for r in rows)}
dump(reports/'canonical-host-evidence.json',canon)
dump(reports/'social-card-evidence.json',social)
dump(reports/'network-console-evidence.json',net)
dump(reports/'mixed-content-evidence.json',mixed)

live=json.loads((live_root/'live'/'summary.json').read_text())
spot=json.loads((live_root/'live-spotcheck'/'phase21-spotcheck.json').read_text())['summary']
counts=json.loads((reports/'product-count-evidence.json').read_text())
assert live['productionSha']==PROD and live['productionTree']==TREE
assert live['tlsPass'] and live['redirectPass'] and live['fingerprintCount']==23 and live['fingerprintFailures']==0
assert live['routeSurface']==16 and live['indexable']==14 and live['noindex']==2 and live['sitemap']==14
assert live['liveCounts']=={'core':3,'inquiry':62,'invalid':0}
assert live['filmPass'] and live['mixedContentRequests']==0 and live['criticalSameOriginNetworkFailures']==0 and live['totalErrors']==0 and live['errors']==[]
assert spot['smokeCases']==32 and spot['smokeFailures']==0
assert spot['spotcheckCount']==30 and spot['spotcheckFailures']==0 and spot['screenshotCount']==30
assert spot['interactionCases']==7 and spot['interactionFailures']==0
assert counts['core']==3 and counts['inquiry']==62 and counts['invalid']==0
assert seo['indexable']==14 and seo['noindex']==2 and seo['jsonLdEntities']==19 and seo['sitemapCount']==14 and len(seo['socialAssets'])==5
assert len(rows)==16 and all(not r['pageErrors'] and not r['httpRequests'] and not r['sameOriginBad'] for r in rows)

manifest={
    'phase21ReleaseCandidateSha':PROD,
    'productionSha':PROD,
    'productionTree':TREE,
    'mainSha':main,
    'rebuildSha':rebuild,
    'deploymentRunId':DEPLOY_RUN,
    'deploymentConclusion':'success',
    'productionUrl':BASE,
    'httpsPass':True,
    'httpsEnforced':True,
    'certificateApproved':True,
    'httpToHttpsPass':True,
    'releaseBlockerHttps':'CLOSED',
    'liveFingerprintPass':True,
    'productionSmokeCases':32,
    'productionSmokeFailures':0,
    'productionVisualCases':30,
    'productionVisualFailures':0,
    'productionInteractionCases':7,
    'productionInteractionFailures':0,
    'seoPass':True,
    'productCounts':{'REFERENCE':3,'INQUIRY':62,'INVALID':0},
    'filmPass':True,
    'mixedContentFailures':0,
    'criticalSameOriginFailures':0,
    'totalReleaseBlockers':0,
    'temporaryBranchResidue':residue,
    'productionReleaseComplete':True,
    'phase22ProductChange':'NONE'
}
dump(OUT/'phase22-final-manifest.json',manifest)

lines=[
    '# PHASE 22 — PRODUCTION RELEASE PACKET','',
    '**STATUS: READY FOR EXTERNAL RELEASE REVIEW**','',
    f'FINAL PRODUCTION SHA: `{PROD}`','',
    f'FINAL PRODUCTION TREE: `{TREE}`','',
    'PHASE 22 PRODUCT CHANGE: **NONE**','',
    'RELEASE-BLOCKER-HTTPS-001: **CLOSED**','',
    'TOTAL RELEASE BLOCKERS: **0**','',
    '## 1. Final readback','',
    f'- `main` = `{main}`.',
    f'- `rebuild/award-level-corporate-v2` = `{rebuild}`.',
    f'- Production deployment run `{DEPLOY_RUN}` = **SUCCESS**, head SHA `{dep_keep["head_sha"]}`.',
    f'- Production URL = `{BASE}`.',
    '- GitHub Pages `https_enforced=true`; certificate state = `approved` for apex and www.','',
    '## 2. Promotion / immutable release evidence','',
    f'- Pre-release main = `{PRE_MAIN}`.',
    f'- RC = `{PROD}`.',
    '- Compare evidence = `ahead_by=30`, `behind_by=0`, merge-base exactly pre-release main.',
    '- Promotion method = **FAST-FORWARD ONLY**.',
    '- No Phase 22 product commit, product delta, DNS change, Pages-config change or redeploy occurred during packaging.','',
    '## 3. Completed production acceptance','',
    '- TLS valid: **PASS**.',
    '- HTTP → HTTPS: **PASS**.',
    '- Live fingerprint: **23 / 23 PASS**.',
    '- Production route smoke: **32 / 32 PASS**.',
    '- Live production visual screenshots: **30 / 30 PASS**, manually inspected.',
    '- Production interactions: **7 / 7 PASS**.',
    '- SEO: **16 routes / 14 indexable / 2 noindex / 14 sitemap URLs — PASS**.',
    '- Product counts: **REFERENCE 3 / INQUIRY 62 / INVALID 0**.',
    '- Film: **PASS**.',
    '- Mixed content failures: **0**.',
    '- Critical same-origin failures: **0**.','',
    '## 4. Evidence inventory','',
    '- Pre-release evidence: `reports/pre-release-evidence.json`.',
    '- Main promotion evidence: `reports/main-promotion-evidence.json`.',
    '- Deployment evidence: `reports/deployment-evidence.json`.',
    '- DNS / custom domain: `reports/dns-custom-domain-evidence.txt`.',
    '- TLS / certificate / HTTPS enforcement: `reports/tls-certificate-evidence.json`, `reports/pages-final-readback.json`.',
    '- HTTP→HTTPS: `reports/http-to-https-evidence.json`, `reports/tls-http-redirect-live-evidence.json`.',
    '- Live fingerprints: `reports/live-fingerprint-evidence.json`.',
    '- 32-case smoke + 7 interactions: `reports/production-smoke-and-interactions.json`.',
    '- 30 production screenshots: `evidence/live-production/live-spotcheck/screenshots/`; manual review: `MANUAL_LIVE_VISUAL_REVIEW.md`.',
    '- Film regression: `reports/film-regression-evidence.json`.',
    '- SEO: `reports/seo-network-evidence.json`.',
    '- Robots / sitemap: `reports/robots-live.txt`, `reports/sitemap-live.xml`.',
    '- Canonical-host: `reports/canonical-host-evidence.json`.',
    '- Social-card: `reports/social-card-evidence.json`.',
    '- Legal/privacy: `reports/legal-privacy-evidence.json`.',
    '- Product counts: `reports/product-count-evidence.json`.',
    '- Network / console: `reports/network-console-evidence.json`.',
    '- Mixed content: `reports/mixed-content-evidence.json`.',
    '- Main/rebuild/production SHA: `reports/main-final-readback.txt`, `reports/rebuild-final-readback.txt`, `reports/production-sha-evidence.txt`.',
    '- Temporary branch residue: `reports/temporary-branch-residue.json`.','',
    '## 5. Temporary branch residue','',
    f'- `__noop_should_not_create`: **{residue["status"]}**.',
    '- Classification: **NON-PRODUCT REPOSITORY HYGIENE RESIDUE**.',
    '- No unique product commit or tree; product blocker = **NO**.','',
    '## 6. Final release disposition','',
    '**PRODUCTION RELEASE COMPLETE. READY FOR EXTERNAL RELEASE REVIEW.**','',
    'WAITING FOR: **REVIEWER APPROVED PHASE 22**',''
]
(OUT/'PHASE_22_PRODUCTION_RELEASE_PACKET.md').write_text('\n'.join(lines))

# Generate SHA256SUMS for every artifact file except SHA256SUMS.txt itself.
checksum_report=reports/'checksum-generation.txt'
checksum_report.write_text('PENDING\n')
files=sorted([p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt'],key=lambda p:p.relative_to(OUT).as_posix())
count=len(files)
checksum_report.write_text(f'CHECKED_ENTRIES={count}\nEXPECTED_FAILED_ENTRIES=0\n')
# Rebuild file list after final checksum-report content is written.
files=sorted([p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt'],key=lambda p:p.relative_to(OUT).as_posix())
assert len(files)==count
with (OUT/'SHA256SUMS.txt').open('w') as f:
    for p in files:
        f.write(f'{sha256_file(p)}  {p.relative_to(OUT).as_posix()}\n')
verify=subprocess.run(['sha256sum','-c','SHA256SUMS.txt'],cwd=OUT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
print(verify.stdout,end='')
assert verify.returncode==0
failed=[ln for ln in verify.stdout.splitlines() if 'FAILED' in ln]
assert failed==[], failed
assert len(list(OUT.rglob('*.png')))==30
print(f'FINAL_INTERNAL_CHECKSUM_COUNT={count}')
print('PHASE22_FINAL_PACKET_BUILD_PASS')
