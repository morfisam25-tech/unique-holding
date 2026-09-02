from pathlib import Path
ROOT=Path.cwd()
BASE='8d2811298c668865f5438f86337c9d8f9d959c80'
site=ROOT/'assets/site.css'
s=site.read_text(encoding='utf-8')
# Phase 02 architecture is locked by qa-site. Audit the import chain, but do not
# remove or disguise it in Phase 19. The measurable product optimization in this
# phase is the duplicate homepage image fetch plus evidence-backed a11y fixes.
imports=["@import url('site-legacy.css') layer(base);","@import url('polish.css') layer(polish);","@import url('performance.css') layer(performance);"]
for needle in imports:
    if needle not in s: raise SystemExit(f'Phase 02 CSS architecture lock missing: {needle}')
fixes=r'''

/* Phase 19 — targeted WCAG contrast corrections from 32-context axe baseline. */
@layer performance{
.global-footer-company-name>span,.global-footer-bottom{color:#858d8f}
.home-operating-world--trade .home-kicker,.home-proof .home-kicker,.home-routes .home-kicker{color:#4f5759}
.home-proof__row>span{color:#555d5f}
.home-route-list>a>span:first-child{color:#5b6365}
.corp-identity .corp-kicker,.corp-history-grid .corp-kicker,.corp-proof__head .corp-kicker{color:#51595b}
.corp-proof__row>span{color:#555d5f}
#overview .subsite-label,#trading .subsite-label,.energy-context-grid>.subsite-label,.energy-context-grid>div>.subsite-label{color:#984218}
.energy-position dt,.energy-context__facts>div>span{color:#555d5f}
#operations .subsite-label{color:#101213}
.paper>.section-cap>.num,.subsite-section.paper>.section-cap>.num{color:#984218}
.route-card>.k{color:#984218}
.sales-boundary>strong{color:#81370f}
#evidence-driven-intelligence>.section-cap>.num,#content-distribution>.section-cap>.num,#what-it-does>.section-cap>.num,#public-proof>.section-cap>.num,#portfolio-status>.section-cap>.num,#development-discipline>.section-cap>.num,#choose-route>.section-cap>.num,#istanbul-office>.section-cap>.num,#current-flows>.section-cap>.num,#cookies-storage>.section-cap>.num,#external-destinations>.section-cap>.num,#corporate-identity>.section-cap>.num,#offered-lot>.section-cap>.num,#portfolio-boundary>.section-cap>.num{color:#984218}
.axis-proof-boundary{color:#555b5d}
.venture-path-step[data-stage-state="explanatory"]>small,.venture-path-step[data-stage-state="future"]>small,.venture-path-note{color:#55585a}
.venture-path-step[data-stage-state="future"]>span{color:#743819}
.contact-route-meta>span{color:#555b5d}
.contact-office-address>span,.contact-office-direct>span{color:#984218}
.contact-office-direct a>small{color:#5f6263}
.legal-contact-panel .legal-label{color:#ff9a63}
#external-links .legal-split a[href="privacy.html"]{color:#3f4749}

/* Phase 19 fix-only continuation — exact nodes from targeted diagnostic run 33644495235. */
.tech-next-grid .route-card>.k,
.ventures-context .route-card>.k{color:#ee6a24}
.axis-proof-card .axis-proof-boundary{color:#555b5d!important}
.legal-company-panel .legal-label{color:#984218}
.legal-policy-body #correspondence .legal-split>div{min-width:0}
.legal-policy-body #correspondence .legal-split p{overflow-wrap:anywhere}
}
/* The homepage sample paragraph is declared !important in the page layer.
   Important layer precedence is reversed, so the earliest named layer is used
   narrowly for this one measured node rather than broadening the palette. */
@layer tokens{
.home-operating-world--tech .ea-public-sample>p{color:#4f5962!important}
}
'''
if 'Phase 19 — targeted WCAG contrast corrections' in s: raise SystemExit('Phase 19 contrast block already present unexpectedly')
s += fixes
site.write_text(s,encoding='utf-8')

idx=ROOT/'index.html'
h=idx.read_text(encoding='utf-8')
pre='  <link rel="preload" as="image" href="https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&ixlib=rb-4.1.0&q=72&w=1800" fetchpriority="high">\n'
dns='  <link rel="dns-prefetch" href="//images.unsplash.com">\n'
if pre not in h: raise SystemExit('homepage legacy preload not found')
if dns not in h: raise SystemExit('homepage redundant dns-prefetch not found')
h=h.replace(pre,'',1).replace(dns,'',1)
old='<aside class="ea-public-sample" aria-label="Evidence Axis public sample preview">'
new='<div class="ea-public-sample" role="group" aria-label="Evidence Axis public sample preview">'
if h.count(old)!=1 or h.count('</aside>')!=1: raise SystemExit('Evidence Axis preview aside boundary drift')
h=h.replace(old,new,1).replace('</aside>','</div>',1)
idx.write_text(h,encoding='utf-8')

(ROOT/'scripts/qa-performance.mjs').write_text(r'''import fs from 'node:fs';
const fail=m=>{console.error('PHASE 19 PERFORMANCE QA FAIL — '+m);process.exitCode=1};
const site=fs.readFileSync('assets/site.css','utf8'),index=fs.readFileSync('index.html','utf8');
for(const locked of ["@import url('site-legacy.css') layer(base);","@import url('polish.css') layer(polish);","@import url('performance.css') layer(performance);"])if(!site.includes(locked))fail('Phase 02 CSS architecture lock changed: '+locked);
if(/rel="preload"[^>]+images\.unsplash\.com/.test(index))fail('obsolete homepage Unsplash preload remains');
if(/dns-prefetch[^>]+images\.unsplash\.com/.test(index))fail('redundant homepage dns-prefetch remains');
if(!/rel="preconnect" href="https:\/\/images\.unsplash\.com"/.test(index))fail('useful homepage Unsplash preconnect missing');
if(!index.includes('poster="https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&fm=jpg&ixid=rb-4.1.0&q=60&w=2000"') && !index.includes('poster="https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=60&w=2000"'))fail('protected film poster changed');
console.log('PHASE 19 PERFORMANCE QA PASS');
''',encoding='utf-8')
(ROOT/'scripts/qa-accessibility.mjs').write_text(r'''import fs from 'node:fs';
const routes=['index.html','corporate.html','energy.html','products.html','product.html','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','sales.html','technology.html','evidence-axis.html','ventures.html','contact.html','privacy.html','legal.html','404.html'];
const fail=m=>{console.error('PHASE 19 ACCESSIBILITY QA FAIL — '+m);process.exitCode=1};
for(const route of routes){const h=fs.readFileSync(route,'utf8');if((h.match(/<main\b/gi)||[]).length!==1)fail(route+': expected one main');if((h.match(/<h1\b/gi)||[]).length!==1)fail(route+': expected one H1');if(!/<a class="skip-link" href="#main">/.test(h))fail(route+': skip link missing');for(const m of h.matchAll(/<img\b[^>]*>/gi)){if(!/\balt="[^"]*"/.test(m[0]))fail(route+': img missing alt');if(!/\bwidth="\d+"/.test(m[0])||!/\bheight="\d+"/.test(m[0]))fail(route+': img missing intrinsic dimensions')}}
const index=fs.readFileSync('index.html','utf8');if(/<aside class="ea-public-sample"/.test(index))fail('nested complementary landmark remains in Evidence Axis sample');if(!/<div class="ea-public-sample" role="group"/.test(index))fail('Evidence Axis sample group semantic fix missing');
const css=fs.readFileSync('assets/site.css','utf8');if(!css.includes('Phase 19 — targeted WCAG contrast corrections'))fail('contrast correction block missing');
console.log('PHASE 19 ACCESSIBILITY STATIC QA PASS');
''',encoding='utf-8')
print('Phase 19 candidate built: Phase 02 CSS architecture preserved; duplicate hero-poster preload removed; semantic landmark, measured contrast defects and privacy text-spacing overflow corrected.')
