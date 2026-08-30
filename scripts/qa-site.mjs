import fs from 'node:fs';
import path from 'node:path';

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
const forbiddenPublicPhrases=['real private codebase','current evidence base','current corporate evidence base','verified public wording','automated quotation engine behind this page','public positioning remains intentionally limited','development status is kept separate','maturity determines visibility','does not invent a generic specification','evidence-backed public operating profile'];

for(const artifact of ['FIX_DEPLOY_NOTE.txt','FIX_DEPLOY_NOTE_2.txt'])if(files.includes(artifact))errors.push(`${artifact}: temporary deployment artifact must not ship`);

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
  for(const tag of html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi)||[]){
    const href=attr(tag,'href');
    if(!href||href.startsWith('#')||/^(mailto:|tel:|https?:|javascript:)/i.test(href))continue;
    const clean=decodeURIComponent(href.split('#')[0].split('?')[0]);
    if(!clean)continue;
    const target=path.normalize(path.join(path.dirname(file),clean)).replaceAll('\\','/');
    if(!fs.existsSync(path.join(root,target)))errors.push(`${file}: broken local link -> ${href}`);
    if(/target=["']_blank["']/i.test(tag)&&!/rel=["'][^"']*noopener/i.test(tag))errors.push(`${file}: target=_blank without noopener -> ${href}`);
  }
  for(const tag of html.match(/<img\b[^>]*>/gi)||[])if(!/\balt=["'][^"']*["']/i.test(tag))errors.push(`${file}: img without alt`);
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
const siteJs=read('assets/site.js');
if(/addHeadLink\(\s*['"]stylesheet/i.test(siteJs))errors.push('assets/site.js: runtime stylesheet injection is forbidden');
for(const token of ["{key:'corporate',label:'Corporate',href:'corporate.html'}","{key:'energy',label:'Energy & Trade',href:'energy.html'}","{key:'technology',label:'Technology',href:'technology.html'}","{key:'portfolio',label:'Portfolio',href:'ventures.html'}","{key:'contact',label:'Contact',href:'contact.html'}","Industrial Sales","global-footer-shell","Footer navigation","evidence-axis.html","privacy.html","legal.html"])if(!siteJs.includes(token))errors.push(`assets/site.js: Phase 03 shared-shell regression -> ${token}`);
for(const token of ["requestAnimationFrame(()=>nav.querySelector('a[href]')?.focus())","if(event.key==='Escape')","if(event.key!=='Tab')return","event.shiftKey&&current===first","!event.shiftKey&&current===last","menu.focus()","document.body.classList.add('nav-open')","setInert(main,true)","setInert(footer,true)"])if(!siteJs.includes(token))errors.push(`assets/site.js: Phase 03 focus-management regression -> ${token}`);
for(const route of ['corporate.html','energy.html','technology.html','ventures.html','contact.html','sales.html','products.html','evidence-axis.html','privacy.html','legal.html'])if(!fs.existsSync(path.join(root,route)))errors.push(`Phase 03: shared-shell route missing -> ${route}`);
for(const file of htmlFiles){const html=read(file);if(!html.includes('assets/site.js'))errors.push(`${file}: shared shell script missing`)}
for(const token of ["document.createElement('header')","document.createElement('footer')","header.dataset.header=''","footer.className='site-footer'"])if(!siteJs.includes(token))errors.push(`assets/site.js: Phase 03 shell fallback regression -> ${token}`);
for(const token of ['.site-header .primary-nav .nav-cta','.global-footer-shell','body.nav-open','@media(max-width:1180px)','@media(prefers-reduced-motion:reduce)'])if(!siteCss.includes(token))errors.push(`assets/site.css: Phase 03 shell styling regression -> ${token}`);

const filmTag=index.match(/<video[^>]+id=["']holding-film["'][^>]*>/i)?.[0]||'';
if(!filmTag)errors.push('index.html: approved film element missing');
if(/\bautoplay\b/i.test(filmTag))errors.push('index.html: native autoplay must remain absent for reduced-motion gating');
if(!/\bplaysinline\b/i.test(filmTag))errors.push('index.html: approved film must preserve playsinline');
for(const filmToken of ['assets/media/unique-holding-film-720p.mp4','assets/media/unique-holding-caption.vtt','data-film-sound','data-film-play','data-film-progress','data-film-time','data-film-mute','data-film-volume','data-film-captions','data-film-fullscreen','data-film-replay'])if(!index.includes(filmToken))errors.push(`index.html: Phase 01 film regression -> ${filmToken}`);
for(const logicToken of ["const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches","if(reducedMotion){","const audibleStarted=await playSafely()","const mutedStarted=await playSafely()","if(!manualPaused&&!video.ended&&!reducedMotion)playSafely()"])if(!index.includes(logicToken))errors.push(`index.html: Phase 01 playback logic regression -> ${logicToken}`);

if(errors.length){console.error('\nTECHNICAL QA FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log(`TECHNICAL QA PASS — ${htmlFiles.length} HTML, ${jsFiles.length} JS, ${cssFiles.length} CSS files checked; ${urls.length} sitemap URLs verified.`);