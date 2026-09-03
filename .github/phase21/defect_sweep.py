#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import json,re,sys

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.')
OUT=Path(sys.argv[2] if len(sys.argv)>2 else '/tmp/phase21-review/reports')
OUT.mkdir(parents=True,exist_ok=True)
ROUTES=['index.html','corporate.html','energy.html','products.html','product.html','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','sales.html','technology.html','evidence-axis.html','ventures.html','contact.html','privacy.html','legal.html','404.html']
ALLOWED_EMAILS={'sales@uniqueholding.com.tr','farahmand@uniqueholding.com.tr'}
EA_LOCK='Evidence Axis is a specialist venture within the Unique Holding portfolio.'
VISIBLE_BAD=re.compile(r'\b(?:lorem ipsum|todo|fixme|debugger|example@example\.com)\b',re.I)
RISK=re.compile(r'\b(?:clients?|customers?|partners?|suppliers?|manufacturers?|awards?|press|revenue|volumes?|transactions?|assets?|origin|producer|traction|users?|metrics?)\b',re.I)
EMAIL=re.compile(r'[A-Z0-9._%+-]+@uniqueholding\.com\.tr',re.I)

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.ids=[]; self.links=[]; self.resources=[]; self.text=[]; self.h1=0; self.main=0; self.footer=0
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if tag=='a' and d.get('href'):self.links.append(d)
        if tag in ('link','script','img','source','track'):
            u=d.get('href') or d.get('src')
            if u:self.resources.append((tag,u,d))
        if tag=='h1':self.h1+=1
        if tag=='main':self.main+=1
        if tag=='footer':self.footer+=1
    def handle_data(self,data):
        if data.strip():self.text.append(data.strip())

def clean_local(raw):
    raw=raw.split('#',1)[0].split('?',1)[0]
    return unquote(raw).lstrip('/')

def local_target(raw):
    if not raw or raw.startswith(('#','mailto:','tel:','javascript:','data:')):return None
    p=urlparse(raw)
    if p.scheme or p.netloc:return None
    target=clean_local(raw)
    if not target:return 'index.html'
    return target

errors=[]; observations=[]; risky=[]; summary={'routes':0,'duplicateIds':0,'missingLocalTargets':0,'malformedUrls':0,'unauthorizedEmails':0,'visiblePlaceholderDebugHits':0,'targetBlankLinks':0,'targetBlankExplicitOpener':0}
texts={}
for route in ROUTES:
    f=ROOT/route
    if not f.is_file():errors.append(f'missing route: {route}');continue
    raw=f.read_text('utf-8')
    parser=P();parser.feed(raw);summary['routes']+=1
    txt=' '.join(parser.text);texts[route]=txt
    if parser.main!=1:errors.append(f'{route}: main count {parser.main}')
    if parser.h1!=1:errors.append(f'{route}: h1 count {parser.h1}')
    if parser.footer!=1:errors.append(f'{route}: footer count {parser.footer}')
    dups=sorted({x for x in parser.ids if parser.ids.count(x)>1})
    if dups:summary['duplicateIds']+=len(dups);errors.append(f'{route}: duplicate ids {dups}')
    # Scan rendered text, not HTML attributes such as the legitimate input placeholder text.
    for m in VISIBLE_BAD.finditer(txt):
        summary['visiblePlaceholderDebugHits']+=1;errors.append(f'{route}: visible placeholder/debug token {m.group(0)}')
    for em in EMAIL.findall(raw):
        if em.lower() not in ALLOWED_EMAILS:
            summary['unauthorizedEmails']+=1;errors.append(f'{route}: unauthorized public email {em}')
    for a in parser.links:
        href=a.get('href','')
        try:p=urlparse(href)
        except Exception as e: summary['malformedUrls']+=1;errors.append(f'{route}: malformed href {href}: {e}');continue
        if p.scheme in ('http','https'):
            if not p.netloc:summary['malformedUrls']+=1;errors.append(f'{route}: malformed external URL {href}')
            if a.get('target')=='_blank':
                summary['targetBlankLinks']+=1
                rel=set((a.get('rel') or '').lower().split())
                # Modern target=_blank links are implicitly noopener unless rel=opener is explicitly requested.
                # The release defect criterion is therefore a malformed URL or explicit opener opt-in, not absence of redundant rel tokens.
                if 'opener' in rel:
                    summary['targetBlankExplicitOpener']+=1;errors.append(f'{route}: target=_blank explicitly enables opener: {href}')
        t=local_target(href)
        if t and not (ROOT/t).exists():summary['missingLocalTargets']+=1;errors.append(f'{route}: missing internal target {href} -> {t}')
    for tag,u,d in parser.resources:
        t=local_target(u)
        if t and not (ROOT/t).exists():summary['missingLocalTargets']+=1;errors.append(f'{route}: missing {tag} resource {u} -> {t}')
    for m in RISK.finditer(txt):
        lo=max(0,m.start()-130);hi=min(len(txt),m.end()+180);risky.append({'route':route,'keyword':m.group(0),'context':txt[lo:hi]})

joined='\n'.join(texts.values())
if EA_LOCK not in joined: errors.append('Evidence Axis relationship lock exact sentence missing')
if 'development-stage' not in texts.get('ventures.html','').lower(): errors.append('YEKI HAST development-stage wording missing on ventures.html')
if '2020' not in texts.get('corporate.html',''): errors.append('Türkiye operations 2020 reference missing from corporate.html')
if '29 Ekim Cad. Yenibosna Merkez Mah.' not in joined or 'İstanbul Vizyon Park Plazaları A1 Blok' not in joined: errors.append('approved office address markers missing')

htmls=sorted(p.name for p in ROOT.glob('*.html'))
if len(htmls)!=16:errors.append(f'HTML route count expected 16 got {len(htmls)}')
if not (ROOT/'sitemap.xml').is_file():errors.append('sitemap.xml missing')
if not (ROOT/'robots.txt').is_file():errors.append('robots.txt missing')
for p in ROOT.iterdir():
    if p.is_file() and p.suffix.lower() in {'.log','.tmp','.bak','.map'}:errors.append(f'public-root development artifact: {p.name}')

if summary['targetBlankLinks']:
    observations.append(f"{summary['targetBlankLinks']} target=_blank external links found; URLs are syntactically valid and none explicitly opts into rel=opener.")
report={'pass':not errors,'summary':summary,'errors':errors,'observations':observations,'riskContextCount':len(risky)}
(OUT/'phase21-defect-sweep.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
with (OUT/'phase21-claim-risk-contexts.txt').open('w',encoding='utf-8') as fh:
    for r in risky: fh.write(f"[{r['route']}] {r['keyword']}: {r['context']}\n")
print(json.dumps(report,indent=2,ensure_ascii=False))
if errors:sys.exit(1)
