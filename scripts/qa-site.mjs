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
const footerRequired=['global-footer-shell','Footer navigation','energy.html','technology.html','ventures.html','evidence-axis.html','corporate.html','contact.html','products.html','sales.html','privacy.html','legal.html','Privacy &amp; Cookies','Legal Notice','Unique Otomotiv Kimya Sanayi Limited Şirketi'];

for(const artifact of ['FIX_DEPLOY_NOTE.txt','FIX_DEPLOY_NOTE_2.txt','_ignore'])if(files.includes(artifact))errors.push(`${artifact}: temporary artifact must not ship`);

for(const file of htmlFiles){
  const html=read(file);
  const lower=html.toLowerCase();
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

const siteJs=read('assets/site.js');
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
  ['player inline CSS',styleStart>=0&&styleEnd>=0?index.slice(styleStart,styleEnd+'  </style>'.length):'', 'c7eeb7d7c334b92d50460a0e0bd4a2bd0f34ca3cb75550ecb485344620f4ba92'],
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
if(sha256(homepageFooter)!=='d0178f35973403716959980aa038c91d833b0966406fed1483d21d374fab03cb')errors.push('index.html: protected Phase 03 static footer changed');

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

if(errors.length){console.error('\nTECHNICAL QA FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log(`TECHNICAL QA PASS — ${htmlFiles.length} HTML, ${jsFiles.length} JS, ${cssFiles.length} CSS files checked; ${urls.length} sitemap URLs verified; static global shell verified on every HTML route; Phase 04 homepage regression checks passed.`);
