import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const errors=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const walk=(dir='.')=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>{const rel=path.join(dir,e.name);if(e.name==='.git'||e.name==='node_modules')return[];return e.isDirectory()?walk(rel):[rel.replaceAll('\\','/')]});
const files=walk();
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const cssFiles=files.filter(f=>f.endsWith('.css'));
const jsFiles=files.filter(f=>f.endsWith('.js')&&!f.startsWith('.github/'));
const attr=(tag,name)=>{const m=tag.match(new RegExp(`${name}=["']([^"']+)["']`,'i'));return m?.[1]||''};
const noindex=html=>/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const webpDimensions=file=>{
  const b=fs.readFileSync(path.join(root,file));
  if(b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')return null;
  const kind=b.toString('ascii',12,16);
  if(kind==='VP8 '){
    if(b[23]!==0x9d||b[24]!==0x01||b[25]!==0x2a)return null;
    return{width:b.readUInt16LE(26)&0x3fff,height:b.readUInt16LE(28)&0x3fff};
  }
  if(kind==='VP8L'){
    if(b[20]!==0x2f)return null;
    const bits=b.readUInt32LE(21);return{width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};
  }
  if(kind==='VP8X')return{width:1+b.readUIntLE(24,3),height:1+b.readUIntLE(27,3)};
  return null;
};
const forbiddenPublicPhrases=['real private codebase','current evidence base','current corporate evidence base','verified public wording','automated quotation engine behind this page','public positioning remains intentionally limited','development status is kept separate','maturity determines visibility','does not invent a generic specification','evidence-backed public operating profile'];
const primaryNavRoutes=[['corporate.html','Corporate'],['energy.html','Energy &amp; Trade'],['technology.html','Technology'],['ventures.html','Portfolio'],['contact.html','Contact'],['sales.html','Industrial Sales']];
const footerRequired=['global-footer-shell','Footer navigation','energy.html','technology.html','ventures.html','evidence-axis.html','corporate.html','contact.html','products.html','sales.html','privacy.html','legal.html','Privacy &amp; Cookies','Legal Notice','UNIQE OTOMOTİV KİMYA SANAYİ LİMİTED ŞİRKETİ'];

for(const artifact of ['FIX_DEPLOY_NOTE.txt','FIX_DEPLOY_NOTE_2.txt','_ignore'])if(files.includes(artifact))errors.push(`${artifact}: temporary artifact must not ship`);

for(const file of htmlFiles){
  const html=read(file);
  const lower=html.toLowerCase();
  if(html.includes('Unique Otomotiv Kimya Sanayi Limited Şirketi'))errors.push(`${file}: obsolete operating-company spelling is forbidden`);
  for(const phrase of forbiddenPublicPhrases)if(lower.includes(phrase))errors.push(`${file}: internal/development wording -> ${phrase}`);
  if(!/<html[^>]+lang=["'][a-z-]+["']/i.test(html))errors.push(`${file}: missing html lang`);
  if(!/<main\b/i.test(html))errors.push(`${file}: missing main landmark`);
  if(!/<title>[^<]{2,}<\/title>/i.test(html))errors.push(`${file}: missing title`);
  const indexable=file!=='404.html'&&!noindex(html);
  if(indexable){
    if(!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}["']/i.test(html))errors.push(`${file}: missing/short meta description`);
    const can=html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
    if(!can)errors.push(`${file}: missing canonical`);else if(!can.startsWith('https://www.uniqueholding.com.tr/'))errors.push(`${file}: canonical outside target domain`);
  }

  const navBlock=html.match(/<nav\b[^>]*id=["']primary-nav["'][^>]*>([\s\S]*?)<\/nav>/i)?.[0]||'';
  if(!navBlock)errors.push(`${file}: static global primary navigation missing`);
  else{
    const navLinks=navBlock.match(/<a\b/gi)||[];
    if(navLinks.length!==6)errors.push(`${file}: primary navigation must contain exactly six links, found ${navLinks.length}`);
    for(const [href,label] of primaryNavRoutes){
      if(!new RegExp(`href=["']${href.replaceAll('.','\\.')}["']`,'i').test(navBlock))errors.push(`${file}: static primary navigation missing route ${href}`);
      if(!navBlock.includes(`>${label}</a>`))errors.push(`${file}: static primary navigation missing label ${label}`);
    }
    if(/href=["']#worlds["']/i.test(navBlock)||/>\s*Activities\s*</i.test(navBlock))errors.push(`${file}: redundant Activities top-level navigation returned`);
    if(/href=["']evidence-axis\.html["']/i.test(navBlock))errors.push(`${file}: Evidence Axis must not return as a top-level primary-nav item`);
  }
  if(!/<header\b[^>]*data-header/i.test(html))errors.push(`${file}: static global header missing`);
  if(!/<footer\b[^>]*class=["'][^"']*site-footer/i.test(html))errors.push(`${file}: static global footer missing`);
  for(const token of footerRequired)if(!html.includes(token))errors.push(`${file}: static global footer missing ${token}`);
  if(!html.includes('assets/site.js'))errors.push(`${file}: shared behavior script missing`);
  const jsMarker=html.indexOf("document.documentElement.classList.add('js')");
  const firstStyle=html.search(/<link[^>]+rel=["']stylesheet["']/i);
  if(jsMarker<0)errors.push(`${file}: early JS capability marker missing`);
  else if(firstStyle>=0&&jsMarker>firstStyle)errors.push(`${file}: JS capability marker must precede stylesheets to avoid mobile shell swap`);

  for(const tag of html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi)||[]){
    const href=attr(tag,'href');
    if(!href||href.startsWith('#')||/^(mailto:|tel:|https?:|javascript:)/i.test(href))continue;
    const clean=decodeURIComponent(href.split('#')[0].split('?')[0]);
    if(!clean)continue;
    const target=path.normalize(path.join(path.dirname(file),clean)).replaceAll('\\','/');
    if(!fs.existsSync(path.join(root,target)))errors.push(`${file}: broken local link -> ${href}`);
    if(/target=["']_blank["']/i.test(tag)&&!/rel=["'][^"']*noopener/i.test(tag))errors.push(`${file}: target=_blank without noopener -> ${href}`);
  }
  for(const tag of html.match(/<img\b[^>]*>/gi)||[]){
    if(!/\balt=["'][^"']*["']/i.test(tag))errors.push(`${file}: img without alt`);
    const src=attr(tag,'src');
    if(src&&!/^(https?:|data:)/i.test(src)){
      const target=path.normalize(path.join(path.dirname(file),src)).replaceAll('\\','/');
      if(!fs.existsSync(path.join(root,target)))errors.push(`${file}: broken local image -> ${src}`);
    }
  }
  for(const block of html.matchAll(/<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)){
    const code=block[1].trim();if(code){try{new Function(code)}catch(e){errors.push(`${file}: inline JS syntax error: ${e.message}`)}}
  }
}

if(!noindex(read('404.html')))errors.push('404.html: must be noindex');
if(!noindex(read('product.html')))errors.push('product.html: dynamic inquiry shell must be noindex');

for(const file of jsFiles){try{new Function(read(file))}catch(e){errors.push(`${file}: JS syntax error: ${e.message}`)}}
for(const file of cssFiles){const css=read(file).replace(/\/\*[\s\S]*?\*\//g,'');let depth=0;for(const ch of css){if(ch==='{')depth++;if(ch==='}')depth--;if(depth<0)break}if(depth!==0)errors.push(`${file}: unbalanced CSS braces`)}

const sitemap=read('sitemap.xml');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
for(const url of urls){
  if(!url.startsWith('https://www.uniqueholding.com.tr/'))errors.push(`sitemap: wrong domain ${url}`);
  const u=new URL(url);let rel=u.pathname.replace(/^\//,'');if(!rel)rel='index.html';
  if(!fs.existsSync(path.join(root,rel)))errors.push(`sitemap: missing file ${rel}`);else if(rel.endsWith('.html')&&noindex(read(rel)))errors.push(`sitemap: noindex URL included ${rel}`);
}
for(const required of ['urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html'])if(!urls.some(u=>u.endsWith('/'+required)))errors.push(`sitemap: missing ${required}`);

const index=read('index.html');
for(const token of ['og:title','og:description','og:image','twitter:card'])if(!index.includes(token))errors.push(`index.html: missing ${token}`);
if(!index.includes('application/ld+json'))errors.push('index.html: missing structured data');
if(!read('robots.txt').includes('https://www.uniqueholding.com.tr/sitemap.xml'))errors.push('robots.txt: sitemap declaration missing');
if(!files.includes('assets/favicon.svg'))errors.push('favicon missing');
if(!files.includes('assets/performance.css'))errors.push('performance override missing');

const siteCss=read('assets/site.css');
for(const token of ["@layer tokens,base,components,page,polish,performance;","@import url('polish.css') layer(polish);","@import url('performance.css') layer(performance);",'--text-micro:10px','--space-8:32px','--layout-max:1540px','--color-focus:#ff7a2e'])if(!siteCss.includes(token))errors.push(`assets/site.css: Phase 02 architecture regression -> ${token}`);
if(!read('assets/internal.css').startsWith('@layer components{'))errors.push('assets/internal.css: components layer missing');
for(const file of ['assets/energy-visuals.css','assets/technology-visuals.css'])if(!read(file).startsWith('@layer page{'))errors.push(`${file}: page layer missing`);
for(const token of ['.site-header .primary-nav .nav-cta','.global-footer-shell','body.nav-open','@media(max-width:1180px)','@media(prefers-reduced-motion:reduce)','html:not(.js) .site-header .primary-nav'])if(!siteCss.includes(token))errors.push(`assets/site.css: Phase 03 shell styling regression -> ${token}`);
// Gate A correction guards — compact nav must remain a genuine viewport overlay.
for(const token of ['body.nav-open .site-header{backdrop-filter:none;-webkit-backdrop-filter:none}','position:fixed;inset:0;min-height:100vh;min-height:100dvh'])if(!siteCss.includes(token))errors.push(`assets/site.css: Gate A compact-nav regression -> ${token}`);

const siteJs=read('assets/site.js');
if(siteJs.includes('Unique Otomotiv Kimya Sanayi Limited Şirketi'))errors.push('assets/site.js: obsolete operating-company spelling is forbidden in runtime structured data');
if(siteJs.includes("'@type':'Organization'")&&!siteJs.includes("'name':'UNIQE OTOMOTİV KİMYA SANAYİ LİMİTED ŞİRKETİ'"))errors.push('assets/site.js: runtime Organization name must use official operating-company spelling');
if(/addHeadLink\(\s*['"]stylesheet/i.test(siteJs))errors.push('assets/site.js: runtime stylesheet injection is forbidden');
for(const forbidden of [/\bnav\.innerHTML\s*=/,/\bfooter\.innerHTML\s*=/,/document\.createElement\(\s*['"]header['"]\s*\)/,/document\.createElement\(\s*['"]footer['"]\s*\)/])if(forbidden.test(siteJs))errors.push(`assets/site.js: runtime shared-shell construction is forbidden -> ${forbidden}`);
for(const token of ["requestAnimationFrame(()=>nav.querySelector('a[href]')?.focus())","if(event.key==='Escape')","if(event.key!=='Tab')return","event.shiftKey&&current===first","!event.shiftKey&&current===last","menu.focus()","document.body.classList.add('nav-open')","setInert(main,true)","setInert(footer,true)"])if(!siteJs.includes(token))errors.push(`assets/site.js: Phase 03 focus-management regression -> ${token}`);
for(const route of ['corporate.html','energy.html','technology.html','ventures.html','contact.html','sales.html','products.html','evidence-axis.html','privacy.html','legal.html'])if(!fs.existsSync(path.join(root,route)))errors.push(`Phase 03: shared-shell route missing -> ${route}`);

const filmTag=index.match(/<video[^>]+id=["']holding-film["'][^>]*>/i)?.[0]||'';
if(!filmTag)errors.push('index.html: approved film element missing');
if(/\bautoplay\b/i.test(filmTag))errors.push('index.html: native autoplay must remain absent for reduced-motion gating');
if(!/\bplaysinline\b/i.test(filmTag))errors.push('index.html: approved film must preserve playsinline');
for(const filmToken of ['assets/media/unique-holding-film-720p.mp4','assets/media/unique-holding-caption.vtt','data-film-sound','data-film-play','data-film-progress','data-film-time','data-film-mute','data-film-volume','data-film-captions','data-film-fullscreen','data-film-replay'])if(!index.includes(filmToken))errors.push(`index.html: Phase 01 film regression -> ${filmToken}`);
for(const logicToken of ["const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches","if(reducedMotion){","const audibleStarted=await playSafely()","const mutedStarted=await playSafely()","if(!manualPaused&&!video.ended&&!reducedMotion)playSafely()"])if(!index.includes(logicToken))errors.push(`index.html: Phase 01 playback logic regression -> ${logicToken}`);
if(!index.includes('@media(max-width:980px) and (orientation:portrait){.hero-film{position:absolute;left:0;top:50%;width:100%;height:auto;aspect-ratio:16/9;transform:translateY(-50%);object-fit:contain;object-position:center center}}'))errors.push('index.html: Gate A portrait film containment regression');

const styleStart=index.indexOf('  <style>');
const styleEnd=styleStart>=0?index.indexOf('  </style>',styleStart):-1;
const heroStart=index.indexOf('    <section class="hero hero-film-hero"');
const heroEnd=heroStart>=0?index.indexOf('    <section class="home-thesis"',heroStart):-1;
const filmScriptMarker='  <script src="assets/site.js" defer></script>';
const markerPos=index.indexOf(filmScriptMarker);
const markerEnd=markerPos>=0?markerPos+filmScriptMarker.length:-1;
const filmJsStart=markerEnd>=0?index.indexOf('  <script>',markerEnd):-1;
const filmJsEnd=filmJsStart>=0?index.indexOf('  </script>',filmJsStart):-1;
const protectedSlices=[
  ['player inline CSS',styleStart>=0&&styleEnd>=0?index.slice(styleStart,styleEnd+'  </style>'.length):'', '304201e768beb75f4a8c00f50da66a44a2fc3ee116eec2da588cc3ec6c248848'],
  ['hero/player markup',heroStart>=0&&heroEnd>=0?index.slice(heroStart,heroEnd):'', 'd9c6628f5451049921b2a0bfd1f5f174c8c482101b156473204dd2a1c8012e9f'],
  ['player behavior script',filmJsStart>=0&&filmJsEnd>=0?index.slice(filmJsStart,filmJsEnd+'  </script>'.length):'', '1e1697cce9df7d454022d27a9925095a3a0b5a4f27c8a88dc02e4916b6d9afe1']
];
for(const [label,value,expected] of protectedSlices){if(!value)errors.push(`index.html: protected Phase 01 ${label} missing`);else if(sha256(value)!==expected)errors.push(`index.html: protected Phase 01 ${label} changed`)}

const headEnd=index.indexOf('</head>');
const mainStart=index.indexOf('<main id="main">');
const mainEnd=mainStart>=0?index.indexOf('</main>',mainStart):-1;
const headHtml=headEnd>=0?index.slice(0,headEnd):'';
const mainHtml=mainStart>=0&&mainEnd>=0?index.slice(mainStart,mainEnd):'';
const phase04StyleStart=headHtml.indexOf('    <style>\n      @layer page{');
const phase04StyleEnd=phase04StyleStart>=0?headHtml.indexOf('    </style>',phase04StyleStart):-1;
const phase04Style=phase04StyleStart>=0&&phase04StyleEnd>=0?headHtml.slice(phase04StyleStart,phase04StyleEnd+'    </style>'.length):'';
if(!phase04Style)errors.push('index.html: Phase 04 @layer page styles must exist in head');
else if(sha256(phase04Style)!=='87861dec2e13c7b96e0875b25283002efa9d1b6e8dcf6c22e611194c1e73f5c1')errors.push('index.html: accepted Phase 04 CSS changed');
if(/@layer\s+page\s*\{/.test(mainHtml)||/<style\b[^>]*>[\s\S]*?\.home-thesis/i.test(mainHtml))errors.push('index.html: Phase 04 styles must not appear inside main');

const headerStart=index.indexOf('  <header class="site-header"');
const headerEnd=headerStart>=0?index.indexOf('  </header>',headerStart):-1;
const homepageHeader=headerStart>=0&&headerEnd>=0?index.slice(headerStart,headerEnd+'  </header>'.length):'';
const footerStart=index.indexOf('  <footer class="site-footer"');
const footerEnd=footerStart>=0?index.indexOf('</footer>',footerStart):-1;
const homepageFooter=footerStart>=0&&footerEnd>=0?index.slice(footerStart,footerEnd+'</footer>'.length):'';
if(sha256(homepageHeader)!=='42d6bee4ef6d7c4abfd4216dbbb17fc11a6aa4ad43b6aa89c7c0a46d8c82aed9')errors.push('index.html: protected Phase 03 static header changed');
if(sha256(homepageFooter)!=='5a19b25f3e134903731910b7f57ec4f9d066039e7fbbfed77ccb162c52ccd486')errors.push('index.html: protected Phase 03 static footer changed');

const phase04Required=['home-thesis','home-operating-world--trade','home-operating-world--tech','home-mindset','home-proof','home-commercial','home-routes','home-close','Two operating worlds. One execution mindset.','Intelligence</em> to understand.','Technology to build.','Commerce to execute.','Physical markets. Commercial execution.','Research that informs. Products that move into build.','Understand → Build → Execute','Since<br>2020','Start with the requirement.','For partners, teams and new opportunities.','From intelligence to <em>execution.</em>','assets/phase04/film-still-logistics.webp','assets/phase04/film-still-intelligence.webp','Intercom vs Zendesk','9</b> checked sources','Checked 19 August 2026'];
for(const token of phase04Required)if(!index.includes(token))errors.push(`index.html: Phase 04 homepage regression -> ${token}`);
for(const removed of ['<section class="worlds"','<section class="relationships"','<section class="industrial gateway"','<section class="technology-preview"','<section class="corporate-gateway"'])if(index.includes(removed))errors.push(`index.html: legacy homepage section returned -> ${removed}`);
const postHero=heroEnd>=0?index.slice(heroEnd,index.indexOf('  </main>',heroEnd)):'';
if(/images\.unsplash\.com/i.test(postHero))errors.push('index.html: Phase 04 below-film narrative must not add remote Unsplash imagery');
for(const asset of ['assets/phase04/film-still-logistics.webp','assets/phase04/film-still-intelligence.webp']){
  if(!files.includes(asset))errors.push(`Phase 04 asset missing -> ${asset}`);
  else if(fs.statSync(path.join(root,asset)).size>120000)errors.push(`Phase 04 asset exceeds 120 KB -> ${asset}`);
}
const phase04ImageExpectations=[
  ['assets/phase04/film-still-logistics.webp',800,450],
  ['assets/phase04/film-still-intelligence.webp',800,450]
];
for(const [asset,expectedWidth,expectedHeight] of phase04ImageExpectations){
  if(!files.includes(asset))continue;
  const dims=webpDimensions(asset);
  if(!dims)errors.push(`Phase 04 asset dimensions unreadable -> ${asset}`);
  else if(dims.width!==expectedWidth||dims.height!==expectedHeight)errors.push(`Phase 04 intrinsic dimensions changed -> ${asset}: ${dims.width}x${dims.height}`);
  const escaped=asset.replaceAll('.','\\.');
  const tag=index.match(new RegExp(`<img\\b[^>]*src=["']${escaped}["'][^>]*>`,'i'))?.[0]||'';
  if(!tag)errors.push(`index.html: Phase 04 image tag missing -> ${asset}`);
  else if(Number(attr(tag,'width'))!==expectedWidth||Number(attr(tag,'height'))!==expectedHeight)errors.push(`index.html: Phase 04 image attributes must match intrinsic ${expectedWidth}x${expectedHeight} -> ${asset}`);
}


const corporate=read('corporate.html');
const corporateMain=corporate.match(/<main\b[\s\S]*?<\/main>/i)?.[0]||'';
const corporateH1s=corporateMain.match(/<h1\b/gi)||[];
if(corporateH1s.length!==1)errors.push(`corporate.html: expected exactly one H1, found ${corporateH1s.length}`);
for(const token of [
  'Unique Holding is an Istanbul-based corporate identity spanning industrial trade, technology, intelligence and venture development.',
  'The industrial activity published on this site is conducted through UNIQE OTOMOTİV KİMYA SANAYİ LİMİTED ŞİRKETİ.',
  '01 / Corporate Identity','02 / Business Structure','03 / History','04 / Industrial Operating Company','05 / Operating Base',
  'This describes business areas and portfolio activity; it is not a legal ownership chart.',
  'Turkish corporate operations established.','UNIQE OTOMOTİV KİMYA SANAYİ LİMİTED ŞİRKETİ',
  '29 Ekim Cad. Yenibosna Merkez Mah.','İstanbul Vizyon Park Plazaları A1 Blok','Bahçelievler / İstanbul, Türkiye',
  '+90 212 727 22 22','+90 539 380 91 97','farahmand@uniqueholding.com.tr','sales@uniqueholding.com.tr',
  'A specialist venture within the Unique Holding portfolio, focused on competitive intelligence for B2B SaaS decisions.'
])if(!corporate.includes(token))errors.push(`corporate.html: Phase 05 required corporate statement missing -> ${token}`);
for(const forbidden of [/Group Structure/i,/\bcorporate group\b/i,/\bparent company\b/i,/\bsubsidiar(?:y|ies)\b/i,/\bwholly owned\b/i,/\baffiliate\b/i,/\bsister company\b/i,/\blegal holding company\b/i,/\bcontrolling entity\b/i,/\bconsolidated group\b/i,/\bcorporate umbrella\b/i])if(forbidden.test(corporateMain))errors.push(`corporate.html: unsupported legal-relationship wording -> ${forbidden}`);
if(/S&P|Platts/i.test(corporateMain))errors.push('corporate.html: S&P/Platts must not remain in the Phase 05 principal corporate narrative');
if(/Unique Otomotiv Kimya Sanayi Limited Şirketi/.test(corporateMain))errors.push('corporate.html: outdated operating-company spelling remains in Phase 05 main content');
if(/MERS[Iİ]S|Ticaret Sicil|Trade Registry|Tax Number|Vergi (?:No|Numara)|\bVKN\b|\b240294\b/i.test(corporateMain))errors.push('corporate.html: registration identifier published without source-lock approval');
for(const phrase of ['documented milestones','supported by the records','public timeline focuses','current evidence base','verified','evidence available'])if(corporateMain.toLowerCase().includes(phrase.toLowerCase()))errors.push(`corporate.html: internal/audit-memo wording returned -> ${phrase}`);
const corporateHeader=corporate.match(/<header class=["']site-header["'][\s\S]*?<\/header>/i)?.[0]||'';
const corporateFooter=corporate.match(/<footer class=["']site-footer["'][\s\S]*?<\/footer>/i)?.[0]||'';
if(sha256(corporateHeader)!=='c502644dc6c6446ed266fd7b5cc7f0a9ec6cb2ecdf4e6ff5dc485d2353f5a919')errors.push('corporate.html: protected Phase 03 static header changed');
if(sha256(corporateFooter)!=='fb78cdce26ad95e93209faaec99e957f7fd2f882d3e5a6a83ecd781db170045a')errors.push('corporate.html: protected Phase 03 static footer changed');
if(!/<style>[\s\S]*?@layer\s+page\s*\{[\s\S]*?<\/style>/i.test(corporate.slice(0,corporate.indexOf('</head>'))))errors.push('corporate.html: Phase 05 page CSS must load deterministically in head');
if(/<style\b/i.test(corporateMain))errors.push('corporate.html: page styles must not appear inside main');

const phase06Proof=corporate.match(/<section class=["']corp-proof["'][\s\S]*?<\/section>/i)?.[0]||'';
for(const token of [
  '06 / Operating Proof','Corporate identity, commercial routes and public work.',
  'The trust profile rests on the operating company, the Istanbul base, direct industrial contact routes and specialist work that is visible in public.',
  'Official company identity','UNIQE OTOMOTİV KİMYA SANAYİ LİMİTED ŞİRKETİ',
  'The operating-company name appears in the İstanbul Chamber of Commerce Chemicals member-firms listing.',
  'https://www.ito.org.tr/en/sectoral-committees/member-firms/chemicals?page=543',
  'Industrial sales route','Direct commercial contact','Product, grade, quantity, destination and timing can be routed through the published industrial-sales channel.',
  'Public specialist output','Evidence Axis publishes an Intercom vs Zendesk intelligence sample that shows the specialist work in practice.',
  'https://evidenceaxis.com/sample-report/','Turkish corporate operations since 2020','Istanbul operating base','Public corporate and industrial contact routes'
])if(!phase06Proof.includes(token))errors.push(`corporate.html: Phase 06 trust/proof statement missing -> ${token}`);
if(/<img\b/i.test(phase06Proof))errors.push('corporate.html: Phase 06 must not introduce a leadership/stock image without approved provenance');
for(const forbidden of [/\bChairman\b/i,/\bCEO\b/i,/\bPresident\b/i,/\bFounder\b/i,/\bBoard Member\b/i,/\bManaging Partner\b/i,/\bManaging Director\b/i])if(forbidden.test(phase06Proof))errors.push(`corporate.html: unsupported Phase 06 leadership title -> ${forbidden}`);
for(const forbidden of [/trusted by/i,/certified by/i,/award[- ]winning/i,/advisory board/i,/management team/i,/team of \d+/i,/\d+ employees/i])if(forbidden.test(phase06Proof))errors.push(`corporate.html: unsupported Phase 06 trust/team language -> ${forbidden}`);
if(/\b240294\b|MERS[Iİ]S|\bVKN\b|Tax Number|Vergi (?:No|Numara)/i.test(phase06Proof))errors.push('corporate.html: Phase 06 must not publish withheld registration identifiers');
if(!/target=["']_blank["'][^>]*rel=["'][^"']*noopener/i.test(phase06Proof))errors.push('corporate.html: Phase 06 external trust links must use noopener');
if(!/href=["']https:\/\/evidenceaxis\.com\/sample-report\/["'][^>]*target=["']_blank["'][^>]*rel=["'][^"']*noopener/i.test(phase06Proof))errors.push('corporate.html: Gate A Public sample must link directly to Evidence Axis sample report');



const energy=read('energy.html');
const energyMain=energy.match(/<main\b[\s\S]*?<\/main>/i)?.[0]||'';
const energyH1s=energyMain.match(/<h1\b/gi)||[];
if(energyH1s.length!==1)errors.push(`energy.html: expected exactly one H1, found ${energyH1s.length}`);
for(const token of [
  'Petrochemical and industrial-chemical trading remains a current operating activity',
  '01 / Industrial Business','A current industrial business built around physical-product requirements.',
  'UNIQE OTOMOTİV KİMYA SANAYİ LİMİTED ŞİRKETİ','industrial trading, commercial sourcing and supply coordination',
  'Import · Domestic supply · Export · Re-export','02 / What We Trade','Petrochemical Products','Industrial Chemicals','Energy &amp; Hydrocarbon Products',
  '03 / Commercial Flow','Commercial sourcing','Offer review','Supply coordination',
  '04 / Core Industrial Products','Urea 46','Caustic Soda Solid','Sodium Sulphate Anhydrous',
  '05 / Operating Context','Since 2020','Istanbul, Türkiye','06 / Industrial Sales','Bring the requirement.',
  'Product','Grade / specification','Quantity','Destination','Timing'
])if(!energyMain.includes(token))errors.push(`energy.html: Phase 07 required content missing -> ${token}`);
for(const route of ['products.html#petrochemical','products.html#chemical','products.html#energy-products','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','products.html','sales.html'])if(!energyMain.includes(`href="${route}"`))errors.push(`energy.html: Phase 07 route missing -> ${route}`);
const products=read('products.html');
for(const id of ['petrochemical','chemical','energy-products'])if(!new RegExp(`<section\\b[^>]*id=[\"']${id}[\"'][^>]*data-catalog-category=`,'i').test(products))errors.push(`products.html: Gate A static family anchor missing -> #${id}`);
for(const token of ['data-catalog-category="Petrochemical Products"','data-catalog-category="Chemical Products"','data-catalog-category="Energy & Hydrocarbon Products"','data-catalog-rows','scroll-margin-top:96px'])if(!products.includes(token))errors.push(`products.html: Gate A static family architecture regression -> ${token}`);
if(/alignHashTarget|requestAnimationFrame\s*\(|setTimeout\s*\(|window\.scrollTo\s*\(/.test(products))errors.push('products.html: timing-only family-hash workaround must not return');
for(const id of ['overview','product-families','trading','core-products','customers','operations'])if(!new RegExp(`id=["']${id}["']`,'i').test(energyMain))errors.push(`energy.html: required/compatibility anchor missing -> #${id}`);
if(/S&P|Platts/i.test(energyMain))errors.push('energy.html: Platts/S&P market-context prestige proof must not appear in Phase 07');
for(const country of [/\bGermany\b/i,/\bAustria\b/i,/\bSerbia\b/i])if(country.test(energyMain))errors.push(`energy.html: unsupported named-market claim -> ${country}`);
for(const claim of [/\bour (?:plant|factory|vessel|ship|warehouse|terminal|fleet|truck|trucks|storage|production)\b/i,/\bowned (?:plant|factory|vessel|ship|warehouse|terminal|fleet|trucks?|storage tanks?)\b/i,/\bmanufacturer\b/i,/\bproducer\b/i,/\bauthorized distributor\b/i,/\bexclusive supplier\b/i])if(claim.test(energyMain))errors.push(`energy.html: unsupported ownership/status wording -> ${claim}`);
for(const claim of [/\brevenue\b/i,/\bturnover\b/i,/\bannual volume\b/i,/\btonnage\b/i,/\bshipment counts?\b/i,/\btrusted partner\b/i,/\bglobal leader\b/i,/\bworld-class\b/i,/\bbest-in-class\b/i,/\bcertified by\b/i,/\baward-winning\b/i])if(claim.test(energyMain))errors.push(`energy.html: unsupported metric/prestige wording -> ${claim}`);
if(/\b240294\b|MERS[Iİ]S|\bVKN\b|Tax Number|Vergi (?:No|Numara)|Askı/i.test(energyMain))errors.push('energy.html: withheld registration/status information must not appear in Phase 07');
if(/Unique Otomotiv Kimya Sanayi Limited Şirketi/.test(energyMain))errors.push('energy.html: old operating-company spelling returned');
if(!/<style>[\s\S]*?@layer\s+page\s*\{[\s\S]*?<\/style>/i.test(energy.slice(0,energy.indexOf('</head>'))))errors.push('energy.html: Phase 07 page CSS must load deterministically in head');
if(/<style\b/i.test(energyMain))errors.push('energy.html: Phase 07 styles must not appear inside main');
const energyVisualCss=read('assets/energy-visuals.css');
for(const forbidden of ['images.unsplash.com','.energy-visual-card','energy-product-card--','energy-process-card--'])if(energyVisualCss.includes(forbidden))errors.push(`assets/energy-visuals.css: obsolete/remote Energy visual system returned -> ${forbidden}`);
if(/https?:\/\//i.test(energyVisualCss))errors.push('assets/energy-visuals.css: external media request is forbidden in Phase 08 visual system');
for(const token of ['energy-visual-moment--film','energy-visual-moment--operations','energy-flow-list::before'])if(!energyVisualCss.includes(token))errors.push(`assets/energy-visuals.css: Phase 08 visual treatment missing -> ${token}`);
const phase08Images=[
  ['assets/phase08/film-still-physical-trade.webp',960,540,true],
  ['assets/phase08/operations-context.webp',640,800,true]
];
for(const [asset,w,h,lazy] of phase08Images){
  if(!files.includes(asset)){errors.push(`Phase 08 asset missing -> ${asset}`);continue}
  const dims=webpDimensions(asset);
  if(!dims)errors.push(`Phase 08 asset dimensions unreadable -> ${asset}`);
  else if(dims.width!==w||dims.height!==h)errors.push(`Phase 08 intrinsic dimensions changed -> ${asset}: ${dims.width}x${dims.height}`);
  if(fs.statSync(path.join(root,asset)).size>180000)errors.push(`Phase 08 asset exceeds 180 KB -> ${asset}`);
  const escaped=asset.replaceAll('.','\\.');
  const tag=energy.match(new RegExp(`<img\\b[^>]*src=["']${escaped}["'][^>]*>`,'i'))?.[0]||'';
  if(!tag)errors.push(`energy.html: Phase 08 image tag missing -> ${asset}`);
  else{
    if(Number(attr(tag,'width'))!==w||Number(attr(tag,'height'))!==h)errors.push(`energy.html: Phase 08 image attributes must match intrinsic ${w}x${h} -> ${asset}`);
    if(lazy&&attr(tag,'loading')!=='lazy')errors.push(`energy.html: below-fold Phase 08 image must be lazy -> ${asset}`);
    if(attr(tag,'decoding')!=='async')errors.push(`energy.html: Phase 08 image must decode async -> ${asset}`);
  }
}
if(/our (?:plant|factory|vessel|ship|warehouse|terminal|fleet|loading operation|production line)/i.test(energyMain))errors.push('energy.html: Phase 08 visual integration implies unsupported asset ownership');
if(/<figcaption\b/i.test(energyMain))errors.push('energy.html: Phase 08 should not add ownership-ambiguous visual captions');
const phase06Corporate=corporate.match(/<section class=["']corp-proof["'][\s\S]*?<\/section>/i)?.[0]||'';
if(!phase06Corporate.includes('06 / Operating Proof')||!phase06Corporate.includes('Official company identity')||!phase06Corporate.includes('Public specialist output'))errors.push('corporate.html: protected Phase 06 Operating Proof section missing');

if(errors.length){console.error('\nTECHNICAL QA FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log(`TECHNICAL QA PASS — ${htmlFiles.length} HTML, ${jsFiles.length} JS, ${cssFiles.length} CSS files checked; ${urls.length} sitemap URLs verified; static global shell verified on every HTML route; Phase 04 homepage regression checks passed.`);
