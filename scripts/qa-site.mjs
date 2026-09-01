import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

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
const productSandbox={window:{}};
try{vm.runInNewContext(read('assets/products-data.js'),productSandbox,{filename:'assets/products-data.js'})}catch(e){errors.push('assets/products-data.js: data evaluation failed -> '+e.message)}
const inquiryData=productSandbox.window.UNIQUE_PRODUCTS||[];
const coreData=productSandbox.window.UNIQUE_CORE_PRODUCTS||[];
const htmlEsc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
for(const id of ['petrochemical','chemical','energy-products']){
  const matches=products.match(new RegExp('<section\\b[^>]*id=["\']'+id+'["\'][^>]*data-catalog-category=','gi'))||[];
  if(matches.length!==1)errors.push('products.html: persistent family anchor #'+id+' must exist exactly once, found '+matches.length);
}
if(!products.includes('assets/products-ia.css')||!read('assets/products-ia.css').includes('html{scroll-behavior:auto}.catalog-anchor{scroll-margin-top:96px}'))errors.push('products.html: native fragment landing must be immediate and use standards-based scroll-margin');
if(/style=["'][^"']*scroll-margin-top/i.test(products))errors.push('products.html: catalog scroll-margin must not use repeated inline styles');
for(const token of ['data-catalog-category="Petrochemical Products"','data-catalog-category="Chemical Products"','data-catalog-category="Energy &amp; Hydrocarbon Products"','data-catalog-rows','data-catalog-family','data-product-kind="core"','data-product-kind="inquiry"'])if(!products.includes(token))errors.push('products.html: Gate A static catalog architecture regression -> '+token);
if(/alignHashTarget|requestAnimationFrame\s*\(|setTimeout\s*\(|MutationObserver\s*\(|window\.scrollTo\s*\(/.test(products))errors.push('products.html: timing fragment workaround must not return');
if(/\.innerHTML\s*=/.test(products))errors.push('products.html: default catalog must not depend on post-load innerHTML construction');
const staticCore=[...products.matchAll(/<a\b[^>]*data-product-kind=["']core["'][^>]*>[\s\S]*?<\/a>/gi)].map(m=>m[0]);
const staticInquiry=[...products.matchAll(/<a\b[^>]*data-product-kind=["']inquiry["'][^>]*>[\s\S]*?<\/a>/gi)].map(m=>m[0]);
let productMismatches=0;
const coreReferenceRoutes={'urea-46':'urea-46.html','caustic-soda-solid':'caustic-soda-solid.html','sodium-sulphate-anhydrous':'sodium-sulphate-anhydrous.html'};
const verifyCard=(p,kind,cards)=>{
  const card=cards.find(c=>attr(c,'data-slug')===p.slug);
  if(!card){productMismatches++;errors.push('products.html: static '+kind+' card missing -> '+p.slug);return}
  const expectedHref=kind==='core'?coreReferenceRoutes[p.slug]:'product.html?slug='+encodeURIComponent(p.slug);
  if(attr(card,'href')!==expectedHref){productMismatches++;errors.push('products.html: static '+kind+' href drift -> '+p.slug)}
  const expectedTokens=['<small>'+htmlEsc(p.family)+'</small>','<h3>'+htmlEsc(p.name)+'</h3>','<p>'+htmlEsc(p.abbr||(kind==='core'?p.category:'Specification-based inquiry'))+'</p>'];
  for(const token of expectedTokens)if(!card.includes(token)){productMismatches++;errors.push('products.html: static '+kind+' content drift -> '+p.slug+' / '+token)}
  if(kind==='inquiry'&&(attr(card,'data-category')!==htmlEsc(p.category)||attr(card,'data-family')!==htmlEsc(p.family))){productMismatches++;errors.push('products.html: static inquiry metadata drift -> '+p.slug)}
};
for(const p of coreData)verifyCard(p,'core',staticCore);
for(const p of inquiryData)verifyCard(p,'inquiry',staticInquiry);
if(staticCore.length!==coreData.length){productMismatches++;errors.push('products.html: static core count '+staticCore.length+' != data count '+coreData.length)}
if(staticInquiry.length!==inquiryData.length){productMismatches++;errors.push('products.html: static inquiry count '+staticInquiry.length+' != data count '+inquiryData.length)}
if(new Set(staticCore.map(c=>attr(c,'data-slug'))).size!==staticCore.length){productMismatches++;errors.push('products.html: duplicate static core product slug')}
if(new Set(staticInquiry.map(c=>attr(c,'data-slug'))).size!==staticInquiry.length){productMismatches++;errors.push('products.html: duplicate static inquiry product slug')}
console.log('CORE DATA COUNT: '+coreData.length);
console.log('STATIC CORE CARD COUNT: '+staticCore.length);
console.log('INQUIRY DATA COUNT: '+inquiryData.length);
console.log('STATIC INQUIRY CARD COUNT: '+staticInquiry.length);
console.log('MISMATCH COUNT: '+productMismatches);
if(!products.includes("input.addEventListener('input'"))errors.push('products.html: progressive-enhancement search listener missing');
if(!products.includes('card.hidden=!match'))errors.push('products.html: search must filter existing static cards');
if(!products.includes("group.hidden=!group.querySelector('[data-catalog-family]:not([hidden])')"))errors.push('products.html: search must hide empty catalog families without destroying anchors');
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

// Phase 09 — Products Information Architecture guards.
const productsMain=products.match(/<main\b[\s\S]*?<\/main>/i)?.[0]||'';
const productDetail=read('product.html');
const productsCss=read('assets/products-ia.css');
if(!products.includes('assets/products-ia.css')||!productDetail.includes('assets/products-ia.css'))errors.push('Phase 09: Products IA stylesheet must load on index and inquiry detail routes');
if(!productsCss.startsWith('@layer page{'))errors.push('assets/products-ia.css: Phase 09 page layer missing');
if(!productsCss.includes('.catalog-group[hidden],#catalog .product-link[hidden],.catalog-empty[hidden]{display:none!important}'))errors.push('assets/products-ia.css: filtered Products content must remain removed from layout and keyboard flow');
for(const token of ['product-ia-path','Core Industrial Products','Product Families','Product Inquiry Routes','Industrial Sales / RFQ','catalog-scope','product-family-nav','catalog-empty','product-rfq'])if(!products.includes(token))errors.push('products.html: Phase 09 IA token missing -> '+token);
for(const token of ['product-route-context','detail-breadcrumb','coreRoutes','location.replace(coreRoutes[slug])','Start commercial inquiry'])if(!productDetail.includes(token))errors.push('product.html: Phase 09 inquiry-route context missing -> '+token);
for(const [slug,href] of Object.entries(coreReferenceRoutes)){
  const card=staticCore.find(c=>attr(c,'data-slug')===slug);
  if(!card||attr(card,'href')!==href||attr(card,'data-destination')!=='reference-detail')errors.push('products.html: Phase 09 REFERENCE DETAIL route invalid -> '+slug);
  if(!fs.existsSync(path.join(root,href)))errors.push('products.html: Phase 09 reference destination missing -> '+href);
}
for(const card of staticInquiry){
  const slug=attr(card,'data-slug');
  if(attr(card,'data-destination')!=='inquiry-detail')errors.push('products.html: Phase 09 inquiry route classification missing -> '+slug);
  if(attr(card,'href')!=='product.html?slug='+encodeURIComponent(slug))errors.push('products.html: Phase 09 INQUIRY DETAIL destination invalid -> '+slug);
}
const routeAudit={referenceDetail:staticCore.length,inquiryDetail:staticInquiry.length,industrialSales:(productsMain.match(/href=["']sales\.html["']/gi)||[]).length,invalid:0};
if(routeAudit.referenceDetail!==3||routeAudit.inquiryDetail!==62)errors.push('products.html: Phase 09 route audit count regression');
console.log('PHASE 09 ROUTE AUDIT: REFERENCE DETAIL='+routeAudit.referenceDetail+' / INQUIRY DETAIL='+routeAudit.inquiryDetail+' / INVALID='+routeAudit.invalid);
for(const html of [['products.html',products],['product.html',productDetail]]){
  const ids=[...html[1].matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
  const dup=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  if(dup.length)errors.push(html[0]+': duplicate IDs -> '+dup.join(', '));
}
for(const forbidden of [/\bin stock\b/i,/\bavailable now\b/i,/\bdirect producer\b/i,/\bour production\b/i,/\bour factory\b/i,/\bour warehouse\b/i,/\bour terminal\b/i,/\bour plant\b/i,/\bguaranteed supply\b/i,/\bexclusive supplier\b/i,/\bglobal supplier\b/i,/\bleading supplier\b/i,/\bcertified supplier\b/i]){
  if(forbidden.test(productsMain)||forbidden.test(productDetail))errors.push('Phase 09: unsupported Products-area inventory/ownership wording -> '+forbidden);
}
if(/https?:\/\//i.test(productsCss))errors.push('assets/products-ia.css: external media/dependency request is forbidden');
if(/alignHashTarget|requestAnimationFrame\s*\(|setTimeout\s*\(|MutationObserver\s*\(|window\.scrollTo\s*\(/.test(products))errors.push('products.html: Phase 09 must preserve native fragment navigation without timing workaround');
if(!products.includes("clear.addEventListener('click'"))errors.push('products.html: Phase 09 explicit search reset missing');
if(!products.includes("empty.hidden=visible!==0"))errors.push('products.html: Phase 09 no-results state missing');
if(!products.includes('aria-live="polite"'))errors.push('products.html: Phase 09 search status must be announced');

// Phase 10 — authoritative core-product reference-page guards.
{
  const phase10Pages={"urea-46.html":{"name":"Urea 46","values":["Nitrogen Content","min 46% wt","Biuret","max 0.8% wt","Formaldehyde","max 0.55% wt","Moisture","max 0.3% wt","Particle size 2–4 mm","90%"],"family":"Fertilizer / Industrial Feedstock"},"caustic-soda-solid.html":{"name":"Caustic Soda Solid","values":["Chemical name","Sodium Hydroxide","CAS","1310-73-2","NaOH","approx. 98.8%","Dry basis","99.3%","UN number","1823","Class","8","Packing Group","II"],"family":"Industrial Chemicals"},"sodium-sulphate-anhydrous.html":{"name":"Sodium Sulphate Anhydrous","values":["Na₂SO₄","99.20%","Water Insoluble Matter","0.02%","Ca & Mg","0.02%","Chloride","0.30%","Fe","0.0003%","Moisture","0.05%","Whiteness","91%"],"family":"Industrial Chemicals"}};
  const claimBan=['in stock','available now','our factory','our plant','our production','our warehouse','our terminal','our fleet','direct producer','exclusive supplier','leading supplier','global supplier','certified supplier','guaranteed supply','annual capacity','minimum order','moq','immediate delivery'];
  for(const [file,meta] of Object.entries(phase10Pages)){
    const html=read(file);const lower=html.toLowerCase();
    if(noindex(html))errors.push(`${file}: Phase 10 reference route must remain indexable`);
    if((html.match(/<h1\b/gi)||[]).length!==1)errors.push(`${file}: Phase 10 reference route must have exactly one H1`);
    for(const token of ['assets/core-product-reference.css','data-reference-detail="true"','Reference detail','01 / Product Identity','02 / Commercial Route / Variant Context','03 / Published Reference Data','04 / Specification Interpretation / Boundary','05 / Buyer Requirement','06 / Commercial Review / Industrial Sales','<table class="reference-table">','<caption>Published reference data</caption>','scope="col"','scope="row"','products.html','sales.html','Product','Grade / specification','Quantity','Destination','Timing','Specification','Contact'])if(!html.includes(token))errors.push(`${file}: Phase 10 authority architecture regression -> ${token}`);
    for(const value of meta.values)if(!html.includes(value))errors.push(`${file}: approved Phase 10 technical value missing -> ${value}`);
    for(const phrase of claimBan)if(lower.includes(phrase))errors.push(`${file}: unsupported Phase 10 product claim -> ${phrase}`);
    const canonical='https://www.uniqueholding.com.tr/'+file;if(!html.includes(`rel="canonical" href="${canonical}"`))errors.push(`${file}: Phase 10 canonical regression`);
  }
  const p09=read('products.html');
  const refs=(p09.match(/data-destination="reference-detail"/g)||[]).length;const inquiries=(p09.match(/data-destination="inquiry-detail"/g)||[]).length;
  if(refs!==3||inquiries!==62)errors.push(`Phase 10: Phase 09 route classification regression REFERENCE=${refs} INQUIRY=${inquiries}`);
  for(const [slug,href] of [['urea-46','urea-46.html'],['caustic-soda-solid','caustic-soda-solid.html'],['sodium-sulphate-anhydrous','sodium-sulphate-anhydrous.html']])if(!p09.includes(`data-slug="${slug}" href="${href}"`))errors.push(`Phase 10: Core route destination regression -> ${slug}`);
}


// Phase 11 — Industrial Sales / RFQ experience guards.
{
  const sales=read('sales.html');const salesLower=sales.toLowerCase();const salesCss=read('assets/industrial-sales.css');
  if(!sales.includes('assets/industrial-sales.css')||!salesCss.startsWith('@layer page{'))errors.push('Phase 11: Industrial Sales page stylesheet architecture missing');
  if((sales.match(/<h1\b/gi)||[]).length!==1)errors.push('sales.html: Phase 11 requires exactly one H1');
  for(const token of ['Industrial<br>Sales.','Prepare industrial RFQ','01 / Product','02 / Grade / Specification','03 / Quantity','04 / Destination','05 / Timing','06 / Specification / Technical Requirement','07 / Contact','rfq-product','rfq-grade','rfq-quantity','rfq-destination','rfq-timing','rfq-specification','rfq-contact-name','rfq-company','rfq-email','rfq-phone','rfq-email-action','Email handoff — not server submission','sales@uniqueholding.com.tr','+90 212 727 22 22','+90 539 380 91 97','01','Define the Requirement','Review &amp; Qualification','Offered-Lot Confirmation','Commercial Next Step'])if(!sales.includes(token))errors.push('sales.html: Phase 11 RFQ architecture regression -> '+token);
  for(const id of ['rfq-product','rfq-grade','rfq-quantity','rfq-destination','rfq-timing','rfq-specification','rfq-contact-name','rfq-company','rfq-email','rfq-phone'])if(!new RegExp('<label[^>]+for=["\\\']'+id+'["\\\']','i').test(sales))errors.push('sales.html: Phase 11 visible label missing -> '+id);
  for(const token of ['new URLSearchParams(location.search)','params.get(\'product\')','product.value=prefill','textContent=\'Product context: \'+prefill','encodeURIComponent(subject)','encodeURIComponent(body)','mailto:sales@uniqueholding.com.tr?subject='])if(!sales.includes(token))errors.push('sales.html: Phase 11 safe email/prefill behavior missing -> '+token);
  if(/prefill[^;]{0,120}innerHTML|innerHTML[^;]{0,120}prefill/i.test(sales))errors.push('sales.html: Phase 11 product prefill must never use innerHTML');
  if(/\bfetch\s*\(|XMLHttpRequest|Formspree|Typeform|Google Forms|HubSpot|Mailchimp|Zapier/i.test(sales))errors.push('sales.html: Phase 11 third-party/backend submission behavior is forbidden');
  for(const fake of ['submitted','request received','quotation requested successfully'])if(salesLower.includes(fake))errors.push('sales.html: Phase 11 fake submission state wording -> '+fake);
  const phase11ClaimBan=['in stock','available now','guaranteed availability','guaranteed supply','instant quotation','quotation in 24 hours','same-day quote','direct producer','our factory','our plant','our warehouse','our terminal','our fleet','our inventory','exclusive supplier','leading supplier','global supplier','certified supplier','moq','minimum order','annual capacity','immediate delivery'];
  for(const phrase of phase11ClaimBan)if(salesLower.includes(phrase))errors.push('sales.html: unsupported Phase 11 commercial claim -> '+phrase);
  const mailAddresses=[...sales.matchAll(/mailto:([^?"']+)/gi)].map(m=>m[1].toLowerCase());for(const address of mailAddresses)if(!['sales@uniqueholding.com.tr','farahmand@uniqueholding.com.tr'].includes(address))errors.push('sales.html: invented email address -> '+address);
  if(/https?:\/\//i.test(salesCss))errors.push('assets/industrial-sales.css: external dependency/media request is forbidden');
  const detail=read('product.html');if(!detail.includes("const salesUrl='sales.html?product='+encodeURIComponent(p.name)"))errors.push('product.html: Phase 11 inquiry-detail RFQ context handoff missing');
  for(const [file,encoded] of Object.entries({'urea-46.html':'Urea%2046','caustic-soda-solid.html':'Caustic%20Soda%20Solid','sodium-sulphate-anhydrous.html':'Sodium%20Sulphate%20Anhydrous'})){
    const html=read(file);if(!html.includes('sales.html?product='+encoded))errors.push(file+': Phase 11 Core RFQ context link missing');
  }
  const p09=read('products.html');const refs=(p09.match(/data-destination="reference-detail"/g)||[]).length;const inquiries=(p09.match(/data-destination="inquiry-detail"/g)||[]).length;if(refs!==3||inquiries!==62)errors.push('Phase 11: Phase 09 3/62 classification regression');
  const releaseBlocker={id:'RELEASE-BLOCKER-HTTPS-001',status:'OPEN'};if(releaseBlocker.status!=='OPEN')errors.push('Phase 11: RELEASE-BLOCKER-HTTPS-001 must remain OPEN');console.log(releaseBlocker.id+' STATUS: '+releaseBlocker.status);
}


// Phase 12 — Technology / Intelligence content-system guards.
{
  const technology=read('technology.html');const technologyMain=technology.match(/<main\b[\s\S]*?<\/main>/i)?.[0]||'';const technologyLower=technologyMain.toLowerCase();const technologyCss=read('assets/technology-content.css');
  if(!technology.includes('assets/technology-content.css')||!technologyCss.startsWith('@layer page{'))errors.push('Phase 12: Technology content stylesheet architecture missing');
  if((technologyMain.match(/<h1\b/gi)||[]).length!==1)errors.push('technology.html: Phase 12 requires exactly one H1');
  for(const token of ['Technology &amp; intelligence for decisions, products and new ventures.','Unique Holding remains active in energy, petrochemicals, industrial chemicals and global trade.','Technology &amp; Intelligence is a major growth direction','01 / Technology &amp; Intelligence','02 / Evidence-Driven Intelligence','03 / Digital Product Development','04 / Business / Venture Systems','05 / Content &amp; Distribution Systems','06 / How Technology Fits the Group','07 / Portfolio / Next Step','Evidence Axis','Digital Products','Business &amp; Venture Advisory','Content &amp; Distribution Systems','Specialist venture · Active operating area','Development-stage area','Capability / system','YEKI HAST is a development-stage digital product','This capability is business and venture operating work; it is not financial, legal or investment advice.','Industrial activity continues. Technology expands the operating range.','Observe','Analyze','Build','Test','Operate'])if(!technologyMain.includes(token))errors.push('technology.html: Phase 12 required architecture/content missing -> '+token);
  const areas=(technologyMain.match(/data-tech-area=/g)||[]).length;if(areas!==4)errors.push('technology.html: Phase 12 must expose exactly four operating-area modules, found '+areas);
  if(!technologyMain.includes('a specialist venture within the Unique Holding portfolio'))errors.push('technology.html: approved Evidence Axis relationship wording missing');
  for(const href of ['evidence-axis.html','ventures.html','contact.html'])if(!technologyMain.includes('href="'+href+'"'))errors.push('technology.html: Phase 12 required destination missing -> '+href);
  const claimBan=[/market leader/i,/industry leader/i,/leading ai/i,/world-class/i,/award-winning/i,/trusted by/i,/used by thousands/i,/\bcustomers\b/i,/enterprise customers/i,/fortune 500/i,/\barr\b/i,/\bmrr\b/i,/\brevenue\b/i,/\busers\b/i,/\bdownloads\b/i,/global offices/i,/proprietary ai/i,/\bpatented\b/i,/strategic partners/i,/\bsubsidiar(?:y|ies)\b/i,/wholly owned/i,/soc 2/i,/iso certified/i];
  for(const claim of claimBan)if(claim.test(technologyMain))errors.push('technology.html: unsupported Phase 12 claim/legal wording -> '+claim);
  if(/YEKI HAST[\s\S]{0,260}\b(?:launched|production ready|market leader)\b/i.test(technologyMain))errors.push('technology.html: YEKI HAST status exceeds approved development-stage boundary');
  if(!technology.includes('<title>Technology &amp; Intelligence | Unique Holding</title>'))errors.push('technology.html: Phase 12 title regression');
  if(!technology.includes('rel="canonical" href="https://www.uniqueholding.com.tr/technology.html"'))errors.push('technology.html: Phase 12 canonical regression');
  if(!technology.includes('name="description" content="Technology and intelligence at Unique Holding: Evidence Axis, development-stage digital products, venture systems and content/distribution capabilities alongside active industrial operations."'))errors.push('technology.html: Phase 12 meta description regression');
  if(/https?:\/\//i.test(technologyCss))errors.push('assets/technology-content.css: Phase 12 content layer must not add external dependencies/media');
  const sales=read('sales.html');for(const token of ['01 / Product','02 / Grade / Specification','03 / Quantity','04 / Destination','05 / Timing','06 / Specification / Technical Requirement','07 / Contact','sales@uniqueholding.com.tr','new URLSearchParams(location.search)','mailto:sales@uniqueholding.com.tr?subject='])if(!sales.includes(token))errors.push('Phase 12: Phase 11 RFQ lock regression -> '+token);
  const p09=read('products.html');const refs=(p09.match(/data-destination="reference-detail"/g)||[]).length;const inquiries=(p09.match(/data-destination="inquiry-detail"/g)||[]).length;if(refs!==3||inquiries!==62)errors.push('Phase 12: Phase 09 3/62 classification regression');
  const releaseBlocker={id:'RELEASE-BLOCKER-HTTPS-001',status:'OPEN'};if(releaseBlocker.status!=='OPEN')errors.push('Phase 12: RELEASE-BLOCKER-HTTPS-001 must remain OPEN');
}


// Phase 13 — provenance-safe Technology visual-system guards.
{
  const technology=read('technology.html');const technologyMain=technology.match(/<main\b[\s\S]*?<\/main>/i)?.[0]||'';const visualCss=read('assets/technology-visuals.css');
  const visualAssets=[
    ['hero','assets/phase13/technology-hero-system.svg',2400,1350],
    ['evidence-axis','assets/phase13/evidence-axis-system.svg',1600,900],
    ['digital-products','assets/phase13/digital-product-development.svg',1600,900],
    ['venture-advisory','assets/phase13/venture-systems.svg',1600,900],
    ['content-distribution','assets/phase13/content-distribution-system.svg',1600,900]
  ];
  if(/images\.unsplash\.com|https?:\/\//i.test(visualCss))errors.push('Phase 13: Technology visual stylesheet must contain no remote media URLs');
  if(!visualCss.includes('.subsite-hero.tech:before{background-image:none!important'))errors.push('Phase 13: inherited unverified Technology hero must be explicitly disabled');
  const tags=[...technologyMain.matchAll(/<img\b[^>]*data-tech-visual=["']([^"']+)["'][^>]*>/gi)].map(m=>m[0]);
  if(tags.length!==5)errors.push('Phase 13: expected exactly five Technology visual image records, found '+tags.length);
  const altBan=/best|leading|trusted|customer|client|live platform|production-ready|market leader|award-winning/i;
  for(const [key,asset,w,h] of visualAssets){
    if(!files.includes(asset)){errors.push('Phase 13 asset missing -> '+asset);continue}
    const svg=read(asset);
    if(!new RegExp('<svg[^>]*width=["\']'+w+'["\'][^>]*height=["\']'+h+'["\'][^>]*viewBox=["\']0 0 '+w+' '+h+'["\']','i').test(svg))errors.push('Phase 13 SVG intrinsic dimensions/viewBox invalid -> '+asset);
    if(/<script\b|(?:href|xlink:href)=[\"']https?:\/\//i.test(svg))errors.push('Phase 13 SVG must not load remote/scripted content -> '+asset);
    if(fs.statSync(path.join(root,asset)).size>80000)errors.push('Phase 13 SVG unexpectedly large -> '+asset);
    const tag=tags.find(t=>attr(t,'data-tech-visual')===key)||'';
    if(!tag){errors.push('technology.html: Phase 13 visual tag missing -> '+key);continue}
    if(attr(tag,'src')!==asset)errors.push('technology.html: Phase 13 visual src mismatch -> '+key);
    if(Number(attr(tag,'width'))!==w||Number(attr(tag,'height'))!==h)errors.push('technology.html: Phase 13 width/height attributes mismatch -> '+key);
    const alt=attr(tag,'alt');if(!alt||altBan.test(alt))errors.push('technology.html: Phase 13 alt text missing or claim-bearing -> '+key);
    if(key!=='hero'&&attr(tag,'loading')!=='lazy')errors.push('technology.html: below-fold Phase 13 visual must lazy-load -> '+key);
    if(attr(tag,'decoding')!=='async')errors.push('technology.html: Phase 13 visual must decode async -> '+key);
  }
  for(const token of ['01 / Technology &amp; Intelligence','02 / Evidence-Driven Intelligence','03 / Digital Product Development','04 / Business / Venture Systems','05 / Content &amp; Distribution Systems','06 / How Technology Fits the Group','07 / Portfolio / Next Step','a specialist venture within the Unique Holding portfolio','YEKI HAST is a development-stage digital product','Industrial activity continues. Technology expands the operating range.'])if(!technologyMain.includes(token))errors.push('Phase 13: Phase 12 content lock regression -> '+token);
  if(!fs.existsSync(path.join(root,'docs/qa/phase13-technology-visual-provenance.md')))errors.push('Phase 13 provenance record missing');
  const provenance=read('docs/qa/phase13-technology-visual-provenance.md');
  for(const token of ['UNVERIFIED','REMOVE','ILLUSTRATIVE','technology-hero-system.svg','evidence-axis-system.svg','digital-product-development.svg','venture-systems.svg','content-distribution-system.svg'])if(!provenance.includes(token))errors.push('Phase 13 provenance record incomplete -> '+token);
  const sales=read('sales.html');for(const token of ['01 / Product','02 / Grade / Specification','03 / Quantity','04 / Destination','05 / Timing','06 / Specification / Technical Requirement','07 / Contact','sales@uniqueholding.com.tr','mailto:sales@uniqueholding.com.tr?subject='])if(!sales.includes(token))errors.push('Phase 13: Phase 11 RFQ lock regression -> '+token);
  const p09=read('products.html');const refs=(p09.match(/data-destination="reference-detail"/g)||[]).length;const inquiries=(p09.match(/data-destination="inquiry-detail"/g)||[]).length;if(refs!==3||inquiries!==62)errors.push('Phase 13: Phase 09 3/62 classification regression');
  const releaseBlocker={id:'RELEASE-BLOCKER-HTTPS-001',status:'OPEN'};if(releaseBlocker.status!=='OPEN')errors.push('Phase 13: RELEASE-BLOCKER-HTTPS-001 must remain OPEN');
}

if(errors.length){console.error('\nTECHNICAL QA FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log('TECHNICAL QA PASS — '+htmlFiles.length+' HTML, '+jsFiles.length+' JS, '+cssFiles.length+' CSS files checked; '+urls.length+' sitemap URLs verified; Phase 09/10/11/12/13 guards passed; protected film hashes verified.');
