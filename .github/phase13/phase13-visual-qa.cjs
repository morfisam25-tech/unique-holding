const fs=require('fs');
const path=require('path');
const puppeteer=require('puppeteer-core');
const BASE='http://127.0.0.1:8000/';
const OUT=process.env.OUT_DIR||'phase13-review';
const REPORTS=path.join(OUT,'reports');
const SHOTS=path.join(OUT,'screenshots');
for(const d of [OUT,REPORTS,SHOTS,path.join(SHOTS,'technology'),path.join(SHOTS,'focus')])fs.mkdirSync(d,{recursive:true});
const CHROME=process.env.CHROME;
const viewports=[['1920x1080',1920,1080],['1440x900',1440,900],['768x1024',768,1024],['390x844',390,844],['360x800',360,800]];
const expected={
 hero:{src:'assets/phase13/technology-hero-system.svg',w:2400,h:1350},
 'evidence-axis':{src:'assets/phase13/evidence-axis-system.svg',w:1600,h:900},
 'digital-products':{src:'assets/phase13/digital-product-development.svg',w:1600,h:900},
 'venture-advisory':{src:'assets/phase13/venture-systems.svg',w:1600,h:900},
 'content-distribution':{src:'assets/phase13/content-distribution-system.svg',w:1600,h:900}
};
const focusSelectors={hero:'.tech-phase12-hero',operating:'#operating-areas .tech-operating-grid',evidence:'#evidence-driven-intelligence',digital:'#digital-products',advisory:'#venture-systems',content:'#content-distribution'};
const report={productSha:'20e5c65595d6e02cc7b517714b34ce1d969950ad',baseline:'1ecb43028b3b50b3a44e0b86f0cdef7b671f164f',viewports:[],mobile:[],imageRecords:[],focusCaptures:[],failures:[]};
const fail=(scope,msg,detail={})=>report.failures.push({scope,msg,...detail});
const ok=(cond,scope,msg,detail={})=>{if(!cond)fail(scope,msg,detail)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function pageFor(browser,w,h){const page=await browser.newPage();await page.setViewport({width:w,height:h,deviceScaleFactor:1});page.setDefaultNavigationTimeout(18000);page.setDefaultTimeout(8000);const events={consoleErrors:[],pageErrors:[],requestFailures:[],badResponses:[]};page.on('console',m=>{if(m.type()==='error')events.consoleErrors.push(m.text())});page.on('pageerror',e=>events.pageErrors.push(String(e)));page.on('requestfailed',r=>events.requestFailures.push({url:r.url(),error:r.failure()?.errorText||'failed'}));page.on('response',r=>{if(r.status()>=400)events.badResponses.push({url:r.url(),status:r.status()})});return{page,events}}
async function goto(page,route){const r=await page.goto(BASE+route,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.readyState==='complete',{timeout:8000}).catch(()=>{});await page.waitForFunction(()=>[...document.querySelectorAll('[data-tech-visual]')].every(i=>i.complete&&i.naturalWidth>0),{timeout:8000});await sleep(180);return r?.status()||0}
const clean=list=>list.filter(x=>!String(x.url||'').startsWith('data:'));
(async()=>{
 const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [label,w,h] of viewports){
   const {page,events}=await pageFor(browser,w,h);const status=await goto(page,'technology.html');
   const data=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const imgs=[...document.querySelectorAll('img[data-tech-visual]')].map(img=>({key:img.dataset.techVisual,src:img.getAttribute('src'),currentSrc:img.currentSrc,alt:img.getAttribute('alt')||'',complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,rendered:rect(img),objectFit:getComputedStyle(img).objectFit,objectPosition:getComputedStyle(img).objectPosition,parent:rect(img.parentElement)}));
    const cards=[...document.querySelectorAll('.tech-overview-card')].map(c=>({area:c.dataset.techArea,bg:getComputedStyle(c).backgroundImage,rect:rect(c),img:c.querySelector('[data-tech-visual]')?.dataset.techVisual||''}));
    const hero=document.querySelector('.tech-phase12-hero');
    return{imgs,cards,heroRect:rect(hero),heroBefore:getComputedStyle(hero,'::before').backgroundImage,scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,resources:performance.getEntriesByType('resource').map(e=>e.name),duplicateIds:(()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return[...new Set(a.filter((id,i)=>a.indexOf(id)!==i))]})()};
   });
   const scope='visual-'+label;ok([200,304].includes(status),scope,'Technology HTTP status',{status});ok(data.imgs.length===5,scope,'expected five Technology visuals',{count:data.imgs.length});ok(data.heroBefore==='none',scope,'inherited hero background not disabled',{heroBefore:data.heroBefore});ok(data.cards.length===4,scope,'expected four operating cards',{count:data.cards.length});for(const c of data.cards)ok(c.bg==='none',scope,'operating card retains background image',{card:c});ok(data.scrollWidth<=data.innerWidth+1,scope,'horizontal overflow',{scrollWidth:data.scrollWidth,innerWidth:data.innerWidth});ok(data.duplicateIds.length===0,scope,'duplicate IDs',{ids:data.duplicateIds});
   const remoteTech=data.resources.filter(u=>/images\.unsplash\.com|assets\/phase13\//i.test(u)===false&&/unsplash/i.test(u));ok(remoteTech.length===0,scope,'Technology still requests Unsplash',{remoteTech});
   for(const img of data.imgs){
    const ex=expected[img.key];ok(!!ex,scope,'unexpected visual key',{img});if(!ex)continue;
    ok(img.src===ex.src,scope,'visual src mismatch',{img,expected:ex.src});ok(img.complete&&img.naturalWidth>0&&img.naturalHeight>0,scope,'visual not completely loaded',{img});ok(img.naturalWidth===ex.w&&img.naturalHeight===ex.h,scope,'natural dimensions mismatch',{img,expected:ex});ok(img.rendered.width>0&&img.rendered.height>0,scope,'zero rendered dimensions',{img});
    const scale=Math.max(img.rendered.width/img.naturalWidth,img.rendered.height/img.naturalHeight);ok(scale<=1.05,scope,'unintended extreme upscaling',{key:img.key,scale,rendered:img.rendered,natural:[img.naturalWidth,img.naturalHeight]});ok(img.alt.length>=12,scope,'alt text too weak/empty',{key:img.key,alt:img.alt});ok(!/best|leading|trusted|customer|client|market leader|production-ready|live platform|award-winning/i.test(img.alt),scope,'alt text contains marketing claim',{key:img.key,alt:img.alt});ok(img.objectFit==='cover',scope,'unexpected object-fit',{key:img.key,objectFit:img.objectFit});
    if(img.key!=='hero'){ok(Math.abs(img.rendered.width-img.parent.width)<=2&&Math.abs(img.rendered.height-img.parent.height)<=2,scope,'card image does not fill media container',{img});}
    report.imageRecords.push({viewport:label,...img,scale});
   }
   ok(events.consoleErrors.length===0,scope,'console errors',{errors:events.consoleErrors});ok(events.pageErrors.length===0,scope,'page errors',{errors:events.pageErrors});ok(clean(events.requestFailures).length===0,scope,'request failures',{errors:events.requestFailures});ok(events.badResponses.length===0,scope,'HTTP asset errors',{errors:events.badResponses});
   await page.screenshot({path:path.join(SHOTS,'technology',`technology-${label}.png`),fullPage:true});
   for(const [name,sel] of Object.entries(focusSelectors)){const el=await page.$(sel);if(!el){fail(scope,'focus target missing',{name,sel});continue}await el.screenshot({path:path.join(SHOTS,'focus',`${name}-${label}.png`)});report.focusCaptures.push({viewport:label,name,selector:sel});}
   if(w<=390){
    const mobile={viewport:label,images:data.imgs.map(i=>({key:i.key,rendered:i.rendered,parent:i.parent,objectPosition:i.objectPosition,natural:[i.naturalWidth,i.naturalHeight]}))};
    for(const img of data.imgs){ok(img.rendered.width>=Math.min(300,w-32),`mobile-${label}`,'visual becomes too narrow to remain meaningful',{img});ok(img.rendered.height>=160,`mobile-${label}`,'visual becomes too shallow to remain meaningful',{img});ok(img.rendered.left>=-2&&img.rendered.right<=w+2,`mobile-${label}`,'visual clipped horizontally',{img});}
    report.mobile.push(mobile);
   }
   report.viewports.push({label,status,heroRect:data.heroRect,resourceCount:data.resources.length,images:data.imgs,cards:data.cards,errors:events});await page.close();
  }
 }finally{await browser.close()}
 report.summary={visualViewportCases:report.viewports.length,mobileVisualCases:report.mobile.length,imageRecords:report.imageRecords.length,focusCaptures:report.focusCaptures.length,failures:report.failures.length};
 fs.writeFileSync(path.join(REPORTS,'visual-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));if(report.failures.length){console.error(JSON.stringify(report.failures,null,2));process.exit(2)}
})().catch(e=>{console.error(e);process.exit(1)});