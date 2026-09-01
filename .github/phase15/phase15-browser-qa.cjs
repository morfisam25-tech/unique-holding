const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=process.env.OUT_DIR||'phase15-review';
for(const d of ['reports','screenshots/ventures','screenshots/focus','screenshots/regression'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
const base='http://127.0.0.1:8000/';
const viewports=[[1920,1080],[1440,900],[768,1024],[390,844],[360,800]];
const report={venturesCases:[],mobileCases:[],phase14Cases:[],phase13Cases:[],focusCaptures:[],failures:[],summary:{}};
const fail=(scope,msg,data={})=>report.failures.push({scope,msg,...data});
const ok=(cond,scope,msg,data={})=>{if(!cond)fail(scope,msg,data)};
async function pageFor(browser,w,h){
  const page=await browser.newPage();await page.setViewport({width:w,height:h,deviceScaleFactor:1});
  const events={console:[],page:[],failed:[],requests:[]};
  page.on('console',m=>{if(m.type()==='error')events.console.push(m.text())});
  page.on('pageerror',e=>events.page.push(String(e)));
  page.on('requestfailed',r=>events.failed.push({url:r.url(),error:r.failure()?.errorText||''}));
  page.on('request',r=>events.requests.push(r.url()));
  return {page,events};
}
async function goto(page,url){const res=await page.goto(base+url,{waitUntil:'networkidle0',timeout:30000});return res?.status()||0}
async function common(page,scope,w){
  const d=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];return {sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,dup,h1:document.querySelectorAll('main h1').length,header:!!document.querySelector('.site-header'),footer:!!document.querySelector('.site-footer'),main:!!document.querySelector('main')}});
  ok(d.main&&d.header&&d.footer,scope,'missing structural shell',d);ok(d.h1===1,scope,'expected exactly one H1',d);ok(d.sw<=w+1,scope,'horizontal overflow',d);ok(d.dup.length===0,scope,'duplicate ids',d);return d;
}
async function captureFocus(page,selector,name,w,h){
  const el=await page.$(selector);if(!el){fail('focus-'+name,'missing focus selector',{selector});return}
  await page.evaluate(sel=>{const e=document.querySelector(sel);e?.scrollIntoView({block:'start'});window.scrollBy(0,-84);const h=document.querySelector('.site-header');if(h)h.dataset.qaOldVisibility=h.style.visibility,h.style.visibility='hidden';const s=document.querySelector('.skip-link');if(s)s.dataset.qaOldVisibility=s.style.visibility,s.style.visibility='hidden'},selector);
  await new Promise(r=>setTimeout(r,80));
  const box=await el.boundingBox();if(!box){fail('focus-'+name,'focus element has no bounding box');return}
  const clip={x:Math.max(0,box.x),y:Math.max(0,box.y),width:Math.min(w-Math.max(0,box.x),box.width),height:Math.min(h-Math.max(0,box.y),box.height)};
  if(clip.width>2&&clip.height>2){const file=path.join(OUT,'screenshots/focus',`${name}-${w}x${h}.png`);await page.screenshot({path:file,clip});report.focusCaptures.push(file)}
  await page.evaluate(()=>{for(const sel of ['.site-header','.skip-link']){const e=document.querySelector(sel);if(e)e.style.visibility=e.dataset.qaOldVisibility||''}});
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const [w,h] of viewports){
      const scope=`ventures-${w}x${h}`;const {page,events}=await pageFor(browser,w,h);const status=await goto(page,'ventures.html');
      ok(status===200,scope,'ventures route status',{status});await common(page,scope,w);
      const d=await page.evaluate(()=>{
        const text=document.querySelector('main')?.innerText||'';const q=s=>document.querySelector(s);const rect=s=>{const e=q(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
        const cards=[...document.querySelectorAll('[data-venture-state]')].map(e=>({state:e.dataset.ventureState,text:e.innerText,rect:(()=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,right:r.right}})()}));
        const stages=[...document.querySelectorAll('[data-stage-state]')].map(e=>({state:e.dataset.stageState,label:e.querySelector('small')?.innerText||'',title:e.querySelector('h3')?.innerText||''}));
        const heroBefore=getComputedStyle(q('.ventures-hero'),'::before').backgroundImage;const primary=q('.ventures-hero-actions .primary');const secondary=q('.ventures-hero-actions a[href="technology.html"]');
        return {text,cards,stages,hero:rect('.ventures-hero'),primary:rect('.ventures-hero-actions .primary'),secondary:rect('.ventures-hero-actions a[href="technology.html"]'),statusGrid:rect('#portfolio-status'),yeki:rect('#yeki-hast-status'),path:rect('#development-discipline'),context:rect('#portfolio-context'),heroBefore,imgs:document.querySelectorAll('main img').length,featureTech:document.querySelectorAll('main .feature-image.tech').length,external:[...document.querySelectorAll('main a[href^="http"]')].map(a=>a.href),fake:[...document.querySelectorAll('main a')].map(a=>a.textContent.trim()).filter(t=>/Open YEKI|Try YEKI|Join YEKI|Download App|Get Started|Waitlist/i.test(t)),hrefs:[...document.querySelectorAll('main a')].map(a=>a.getAttribute('href'))};
      });
      for(const token of ['STATUS-LED PORTFOLIO','SPECIALIST OPERATING VENTURE','DEVELOPMENT-STAGE DIGITAL PRODUCT','ACTIVE BUILD','Build and Test are the current development zone','FUTURE GATE'])ok(d.text.includes(token),scope,'required maturity text missing',{token});
      ok(d.cards.length===2&&d.cards.some(x=>x.state==='operating')&&d.cards.some(x=>x.state==='development'),scope,'portfolio state model invalid',{cards:d.cards});
      ok(d.stages.filter(x=>x.state==='current').length===2&&d.stages.filter(x=>x.state==='future').length===2,scope,'current/future stage semantics invalid',{stages:d.stages});
      ok(d.stages.filter(x=>x.state==='future').every(x=>x.label==='FUTURE GATE'),scope,'future stages lack explicit text semantics',{stages:d.stages});
      ok(d.imgs===0&&d.featureTech===0,scope,'unverified/fake visual rendered',{imgs:d.imgs,featureTech:d.featureTech});ok(!/url\(/i.test(d.heroBefore),scope,'remote/inherited hero image still rendered',{heroBefore:d.heroBefore});
      ok(d.external.length===0&&d.fake.length===0,scope,'fake/external YEKI CTA detected',{external:d.external,fake:d.fake});for(const href of ['#portfolio-status','technology.html','evidence-axis.html','corporate.html','contact.html'])ok(d.hrefs.includes(href),scope,'required route missing',{href});
      for(const c of d.cards)ok(c.rect.x>=-1&&c.rect.right<=w+1,scope,'status card clips horizontally',{card:c});
      const unsplash=events.requests.filter(x=>x.includes('images.unsplash.com'));ok(unsplash.length===0,scope,'Unsplash request from Ventures',{unsplash});ok(events.console.length===0&&events.page.length===0&&events.failed.length===0,scope,'browser errors',{events});
      const focus=await page.$('.ventures-hero-actions .primary');await focus.focus();const focusStyle=await page.evaluate(()=>{const e=document.querySelector('.ventures-hero-actions .primary'),s=getComputedStyle(e);return {style:s.outlineStyle,width:s.outlineWidth}});ok(focusStyle.style!=='none'&&parseFloat(focusStyle.width)>0,scope,'focus outline not visible',{focusStyle});
      if(w<=390){ok(d.primary&&d.secondary&&d.primary.bottom<=h+1&&d.secondary.bottom<=h+1,scope,'mobile first viewport hides meaningful action',{primary:d.primary,secondary:d.secondary,h});report.mobileCases.push({w,h,primaryBottom:d.primary?.bottom,secondaryBottom:d.secondary?.bottom,cards:d.cards.map(x=>x.state),stages:d.stages})}
      await page.screenshot({path:path.join(OUT,'screenshots/ventures',`ventures-${w}x${h}.png`),fullPage:true});
      for(const [sel,name] of [['.ventures-hero','hero'],['#portfolio-status','portfolio-status'],['#yeki-hast-status','yeki-hast'],['#development-discipline','development-path'],['#portfolio-context','portfolio-context']])await captureFocus(page,sel,name,w,h);
      report.venturesCases.push({w,h,status,heroActionBottom:d.secondary?.bottom,unsplashRequests:unsplash.length,events:{console:events.console.length,page:events.page.length,failed:events.failed.length}});await page.close();
    }
    for(const [w,h] of [[1440,900],[390,844]]){
      const scope=`phase14-axis-${w}x${h}`;const {page,events}=await pageFor(browser,w,h);const status=await goto(page,'evidence-axis.html');await common(page,scope,w);const d=await page.evaluate(()=>({text:document.querySelector('main')?.innerText||'',hrefs:[...document.querySelectorAll('main a')].map(a=>a.getAttribute('href')),sw:document.documentElement.scrollWidth}));for(const t of ['SPECIALIST VENTURE','View Public Sample','Open EvidenceAxis.com','a specialist venture within the Unique Holding portfolio','Demonstration sample — not a client engagement.'])ok(d.text.includes(t),scope,'Phase 14 token missing',{t});ok(d.hrefs.includes('https://evidenceaxis.com/sample-report/')&&d.hrefs.includes('https://evidenceaxis.com'),scope,'Phase 14 external routes missing');ok(events.console.length===0&&events.page.length===0&&events.failed.length===0,scope,'Phase 14 browser errors',{events});await page.screenshot({path:path.join(OUT,'screenshots/regression',`evidence-axis-${w}x${h}.png`),fullPage:true});report.phase14Cases.push({w,h,status});await page.close();
    }
    {
      const w=390,h=844,scope='phase13-technology-390x844';const {page,events}=await pageFor(browser,w,h);const status=await goto(page,'technology.html');await common(page,scope,w);const d=await page.evaluate(()=>({text:document.querySelector('main')?.innerText||'',visuals:[...document.querySelectorAll('[data-tech-visual]')].map(i=>({src:i.getAttribute('src'),complete:i.complete,nw:i.naturalWidth,nh:i.naturalHeight}))}));ok(d.visuals.length===5,scope,'Phase 13 visual count regression',{visuals:d.visuals});for(const v of d.visuals)ok(v.src.startsWith('assets/phase13/')&&v.complete&&v.nw>0&&v.nh>0,scope,'Phase 13 visual load/source regression',{v});ok(events.requests.filter(x=>x.includes('images.unsplash.com')).length===0,scope,'Phase 13 Unsplash request regression');ok(d.text.includes('YEKI HAST is a development-stage digital product'),scope,'Phase 12 YEKI status regression');await page.screenshot({path:path.join(OUT,'screenshots/regression','technology-390x844.png'),fullPage:true});report.phase13Cases.push({w,h,status,visuals:d.visuals.length});await page.close();
    }
  }finally{await browser.close()}
  report.summary={venturesCases:report.venturesCases.length,mobileCases:report.mobileCases.length,phase14Cases:report.phase14Cases.length,phase13Cases:report.phase13Cases.length,focusCaptures:report.focusCaptures.length,failures:report.failures.length};
  fs.writeFileSync(path.join(OUT,'reports/phase15-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));if(report.failures.length){console.error(JSON.stringify(report.failures,null,2));process.exit(1)}
})();
