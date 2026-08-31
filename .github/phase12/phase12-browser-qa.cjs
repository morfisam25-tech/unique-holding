const fs=require('fs');
const path=require('path');
const puppeteer=require('puppeteer-core');

const BASE='http://127.0.0.1:8000/';
const OUT=process.env.OUT_DIR||'phase12-review';
const SHOTS=path.join(OUT,'screenshots');
for(const d of [OUT,path.join(OUT,'reports'),SHOTS,path.join(SHOTS,'technology'),path.join(SHOTS,'sales'),path.join(SHOTS,'core'),path.join(SHOTS,'products'),path.join(SHOTS,'smoke')])fs.mkdirSync(d,{recursive:true});
const CHROME=process.env.CHROME;
const viewports=[['1920x1080',1920,1080],['1440x900',1440,900],['768x1024',768,1024],['390x844',390,844],['360x800',360,800]];
const smokeViewports=[['1440x900',1440,900],['390x844',390,844]];
const publicRoutes=['index.html','corporate.html','energy.html','products.html','product.html','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','sales.html','technology.html','evidence-axis.html','ventures.html','contact.html','privacy.html','legal.html','404.html'];
const coreRoutes={
 'urea-46.html':['Nitrogen Content','min 46% wt','Biuret','max 0.8% wt','Formaldehyde','max 0.55% wt','Moisture','max 0.3% wt','Particle size 2–4 mm','90%'],
 'caustic-soda-solid.html':['Chemical name','Sodium Hydroxide','CAS','1310-73-2','NaOH','approx. 98.8%','Dry basis','99.3%','UN number','1823','Class','8','Packing Group','II'],
 'sodium-sulphate-anhydrous.html':['Na₂SO₄','99.20%','Water Insoluble Matter','0.02%','Ca & Mg','0.02%','Chloride','0.30%','Fe','0.0003%','Moisture','0.05%','Whiteness','91%']
};
const report={productSha:'8ebffede8e6219d1a3a89d8ab9e215a121188556',baseline:'af0ede75005c121f7eff2dc60ee3d69170cdef5c',technology:[],mobile:[],routing:[],phase11:[],phase10:[],phase09:[],smoke:[],failures:[]};
const ok=(cond,scope,msg,detail={})=>{if(!cond)report.failures.push({scope,msg,...detail});};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rectObj=r=>({x:r.x,y:r.y,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
async function newPage(browser,w,h){
 const page=await browser.newPage();await page.setViewport({width:w,height:h,deviceScaleFactor:1});page.setDefaultNavigationTimeout(18000);page.setDefaultTimeout(6000);
 const consoleErrors=[],pageErrors=[],requestFailures=[],badResponses=[];
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 page.on('pageerror',e=>pageErrors.push(String(e)));
 page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText||'failed'}));
 page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()})});
 return{page,consoleErrors,pageErrors,requestFailures,badResponses};
}
async function goto(page,route){const r=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:18000});await page.waitForFunction(()=>document.readyState==='complete',{timeout:8000}).catch(()=>{});await sleep(180);return r?.status()||0;}
function cleanNetwork(list){return list.filter(x=>!String(x.url||'').startsWith('data:'));}

(async()=>{
 const browser=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  // Technology page — exact five viewports.
  for(const [label,w,h] of viewports){
   const ctx=await newPage(browser,w,h);const {page,consoleErrors,pageErrors,requestFailures,badResponses}=ctx;const status=await goto(page,'technology.html');
   const data=await page.evaluate(()=>{
    const r=e=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height}};
    const main=document.querySelector('main');const h1s=[...main.querySelectorAll('h1')];const areaCards=[...main.querySelectorAll('[data-tech-area]')];const statusEls=[...main.querySelectorAll('.tech-status')];const h2s=[...main.querySelectorAll('h2')];const textLinks=[...main.querySelectorAll('a.text-link')];
    return{
      h1Count:h1s.length,h1:h1s[0]?.textContent.trim()||'',h1Rect:h1s[0]?r(h1s[0]):null,
      intro:main.querySelector('.tech-phase12-hero .intro')?.textContent.trim()||'',introRect:main.querySelector('.tech-phase12-hero .intro')?r(main.querySelector('.tech-phase12-hero .intro')):null,
      heroRect:r(main.querySelector('.tech-phase12-hero')),
      areaCount:areaCards.length,areas:areaCards.map(e=>({id:e.dataset.techArea,status:e.querySelector('.tech-status')?.textContent.trim()||'',rect:r(e)})),
      statuses:statusEls.map(e=>({text:e.textContent.trim(),rect:r(e),fontSize:parseFloat(getComputedStyle(e).fontSize),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})),
      sectionIds:[...main.querySelectorAll('section[id]')].map(e=>e.id),
      h2s:h2s.map(e=>({text:e.textContent.trim(),rect:r(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})),
      links:[...main.querySelectorAll('a[href]')].map(e=>e.getAttribute('href')),
      textLinks:textLinks.map(e=>({href:e.getAttribute('href'),rect:r(e),text:e.textContent.trim()})),
      duplicateIds:(()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return[...new Set(a.filter((id,i)=>a.indexOf(id)!==i))]})(),
      scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,
      header:!!document.querySelector('header[data-header]'),footer:!!document.querySelector('footer.site-footer'),
      headerTech:!!document.querySelector('header a[href="technology.html"]'),footerTech:!!document.querySelector('footer a[href="technology.html"]')
    };
   });
   const scope='technology-'+label;
   ok([200,304].includes(status),scope,'HTTP status',{status});
   ok(data.h1Count===1,scope,'expected exactly one H1',{h1Count:data.h1Count});
   ok(/Technology\s*&\s*intelligence for decisions, products and new ventures\./i.test(data.h1),scope,'first-view H1 positioning copy mismatch',{h1:data.h1});
   ok(/remains active in energy, petrochemicals, industrial chemicals and global trade/i.test(data.intro),scope,'industrial-active statement missing');
   ok(/major growth direction/i.test(data.intro),scope,'technology growth-direction statement missing');
   ok(data.h1Rect&&data.h1Rect.top<h&&data.h1Rect.bottom<=h+2,scope,'H1 not readable within first viewport',{rect:data.h1Rect,height:h});
   ok(data.introRect&&data.introRect.top<h,scope,'positioning intro does not begin in first viewport',{rect:data.introRect,height:h});
   ok(data.areaCount===4,scope,'four operating areas missing',{areaCount:data.areaCount});
   const expectedStatuses=['Specialist venture · Active operating area','Development-stage area','Capability / system','Capability / system'];
   ok(data.areas.map(x=>x.status).join('|')===expectedStatuses.join('|'),scope,'operating-area status discipline mismatch',{areas:data.areas});
   for(const id of ['operating-areas','evidence-driven-intelligence','digital-products','venture-systems','content-distribution','group-fit','next-step'])ok(data.sectionIds.includes(id),scope,'required section missing',{id});
   for(const href of ['evidence-axis.html','ventures.html','contact.html'])ok(data.links.includes(href),scope,'required Technology CTA route missing',{href});
   ok(data.header&&data.footer&&data.headerTech&&data.footerTech,scope,'header/footer Technology routing missing',{data});
   ok(data.duplicateIds.length===0,scope,'duplicate IDs',{ids:data.duplicateIds});
   ok(data.scrollWidth<=data.innerWidth+1,scope,'horizontal overflow',{scrollWidth:data.scrollWidth,innerWidth:data.innerWidth});
   for(const st of data.statuses){ok(st.rect.left>=-1&&st.rect.right<=data.innerWidth+1,scope,'status label clipped horizontally',{status:st});ok(st.scrollWidth<=st.clientWidth+2,scope,'status label text clipped',{status:st});}
   for(const hh of data.h2s)ok(hh.scrollWidth<=hh.clientWidth+2,scope,'section heading clips',{heading:hh.text,rect:hh.rect});
   ok(consoleErrors.length===0,scope,'console errors',{consoleErrors});ok(pageErrors.length===0,scope,'page errors',{pageErrors});ok(cleanNetwork(requestFailures).length===0,scope,'request failures',{requestFailures});ok(badResponses.length===0,scope,'HTTP subresource errors',{badResponses});
   await page.screenshot({path:path.join(SHOTS,'technology',`technology-${label}.png`),fullPage:true});
   report.technology.push({label,status,h1Rect:data.h1Rect,introRect:data.introRect,heroRect:data.heroRect,areaCount:data.areaCount,areas:data.areas,statuses:data.statuses,scrollWidth:data.scrollWidth,innerWidth:data.innerWidth,errors:{consoleErrors,pageErrors,requestFailures,badResponses}});
   if(w<=390){
    const mobile={label,areaHeights:data.areas.map(a=>a.rect.height),statusFonts:data.statuses.map(s=>s.fontSize),headingWidths:data.h2s.map(x=>({text:x.text,scrollWidth:x.scrollWidth,clientWidth:x.clientWidth})),cta:data.textLinks.map(x=>({href:x.href,height:x.rect.height,left:x.rect.left,right:x.rect.right}))};
    for(const a of data.areas)ok(a.rect.height<=420,'mobile-'+label,'operating-area card becomes oversized mobile panel',{area:a});
    for(const st of data.statuses)ok(st.fontSize>=10,'mobile-'+label,'status metadata too small',{status:st});
    for(const c of data.textLinks)ok(c.rect.left>=-1&&c.rect.right<=data.innerWidth+1,'mobile-'+label,'CTA clips horizontally',{cta:c});
    report.mobile.push(mobile);
   }
   await page.close();
  }

  // Routing QA — homepage/header/footer/Technology destinations.
  {
   const ctx=await newPage(browser,1440,900);const {page}=ctx;await goto(page,'index.html');
   const home=await page.evaluate(()=>({all:[...document.querySelectorAll('a[href="technology.html"]')].length,header:!!document.querySelector('header a[href="technology.html"]'),footer:!!document.querySelector('footer a[href="technology.html"]')}));
   ok(home.all>0&&home.header&&home.footer,'routing','Homepage/Header/Footer → Technology missing',{home});report.routing.push({from:'index/header/footer',to:'technology.html',...home});await page.close();
  }
  {
   const ctx=await newPage(browser,1440,900);const {page}=ctx;await goto(page,'technology.html');
   for(const [name,href] of [['Evidence Axis','evidence-axis.html'],['Portfolio','ventures.html'],['Contact','contact.html']]){
    const exists=await page.$(`main a[href="${href}"]`)!==null;ok(exists,'routing','Technology destination missing',{name,href});
    const p=await browser.newPage();const res=await p.goto(BASE+href,{waitUntil:'domcontentloaded',timeout:15000});ok([200,304].includes(res?.status()||0),'routing','Technology destination does not resolve',{name,href,status:res?.status()||0});await p.close();report.routing.push({from:'technology.html',to:href,name,exists,status:res?.status()||0});
   }
   await page.close();
  }

  // Phase 11 Sales regression at 1440 and 390.
  for(const [label,w,h] of [['1440x900',1440,900],['390x844',390,844]]){
   const ctx=await newPage(browser,w,h);const {page,consoleErrors,pageErrors,requestFailures,badResponses}=ctx;const status=await goto(page,'sales.html?product=Urea%2046');
   const data=await page.evaluate(()=>({
    areas:['rfq-product','rfq-grade','rfq-quantity','rfq-destination','rfq-timing','rfq-specification','rfq-contact-name'].filter(id=>document.getElementById(id)).length,
    product:document.getElementById('rfq-product')?.value||'',mailto:document.getElementById('rfq-email-action')?.getAttribute('href')||'',
    handoff:document.getElementById('rfq-local-note')?.textContent.trim()||'',scrollWidth:document.documentElement.scrollWidth,innerWidth,
    duplicateIds:(()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return[...new Set(a.filter((id,i)=>a.indexOf(id)!==i))]})()
   }));
   const scope='phase11-'+label;ok([200,304].includes(status),scope,'Sales HTTP status',{status});ok(data.areas===7,scope,'seven RFQ areas regression',{areas:data.areas});ok(data.product==='Urea 46',scope,'product prefill regression',{product:data.product});ok(/^mailto:sales@uniqueholding\.com\.tr\?subject=/i.test(data.mailto),scope,'email handoff regression',{mailto:data.mailto});ok(/not server submission/i.test(data.handoff),scope,'honest email handoff disclosure missing',{handoff:data.handoff});ok(data.scrollWidth<=data.innerWidth+1,scope,'Sales horizontal overflow',{data});ok(data.duplicateIds.length===0,scope,'Sales duplicate IDs',{ids:data.duplicateIds});ok(consoleErrors.length===0&&pageErrors.length===0&&cleanNetwork(requestFailures).length===0&&badResponses.length===0,scope,'Sales browser errors',{consoleErrors,pageErrors,requestFailures,badResponses});await page.screenshot({path:path.join(SHOTS,'sales',`sales-${label}.png`),fullPage:true});report.phase11.push({label,status,data});await page.close();
  }

  // Phase 10 Core reference regression at 390.
  for(const [route,tokens] of Object.entries(coreRoutes)){
   const ctx=await newPage(browser,390,844);const {page,consoleErrors,pageErrors,requestFailures,badResponses}=ctx;const status=await goto(page,route);const data=await page.evaluate(()=>({body:document.querySelector('main')?.innerText||'',reference:document.querySelector('.reference-status')?.textContent.trim()||'',sales:[...document.querySelectorAll('a[href^="sales.html?product="]')].map(a=>a.getAttribute('href')),scrollWidth:document.documentElement.scrollWidth,innerWidth}));const scope='phase10-'+route;for(const token of tokens)ok(data.body.includes(token),scope,'approved technical value missing',{token});ok(/reference detail/i.test(data.reference),scope,'REFERENCE DETAIL missing',{reference:data.reference});ok(data.sales.length>=1,scope,'Industrial Sales contextual route missing',{sales:data.sales});ok(data.scrollWidth<=data.innerWidth+1,scope,'Core page horizontal overflow',{data});ok(consoleErrors.length===0&&pageErrors.length===0&&cleanNetwork(requestFailures).length===0&&badResponses.length===0,scope,'Core browser errors',{consoleErrors,pageErrors,requestFailures,badResponses});await page.screenshot({path:path.join(SHOTS,'core',`${route.replace('.html','')}-390x844.png`),fullPage:true});report.phase10.push({route,status,reference:data.reference,sales:data.sales,scrollWidth:data.scrollWidth,innerWidth:data.innerWidth});await page.close();
  }

  // Phase 09 Products regression at 390.
  {
   const ctx=await newPage(browser,390,844);const {page,consoleErrors,pageErrors,requestFailures,badResponses}=ctx;await goto(page,'products.html');
   const counts=await page.evaluate(()=>({core:document.querySelectorAll('#core-grid [data-product-kind="core"]').length,inquiry:document.querySelectorAll('#catalog [data-product-kind="inquiry"]').length,scrollWidth:document.documentElement.scrollWidth,innerWidth}));ok(counts.core===3&&counts.inquiry===62,'phase09','3/62 parity regression',{counts});ok(counts.scrollWidth<=counts.innerWidth+1,'phase09','Products horizontal overflow',{counts});
   await page.type('#product-search','MEG');await page.waitForFunction(()=>document.querySelectorAll('#catalog [data-product-kind="inquiry"]:not([hidden])').length===1);let visible=await page.$$eval('#catalog [data-product-kind="inquiry"]:not([hidden])',a=>a.map(x=>x.dataset.slug));ok(visible.length===1&&visible[0]==='meg','phase09','MEG search regression',{visible});await page.click('#product-search-clear');await page.waitForFunction(()=>document.querySelectorAll('#catalog [data-product-kind="inquiry"]:not([hidden])').length===62);
   const fragments=[];for(const id of ['petrochemical','chemical','energy-products']){await goto(page,'products.html#'+id);const first=await page.$eval('#'+id,e=>e.getBoundingClientRect().top);await sleep(650);const later=await page.$eval('#'+id,e=>e.getBoundingClientRect().top);ok(first>=70&&first<=120,'phase09','fragment not header-safe',{id,first});ok(Math.abs(first-later)<1,'phase09','fragment shifted',{id,first,later});fragments.push({id,first,later});}
   const routing=await page.evaluate(()=>({refs:document.querySelectorAll('[data-destination="reference-detail"]').length,inquiries:document.querySelectorAll('[data-destination="inquiry-detail"]').length}));ok(routing.refs===3&&routing.inquiries===62,'phase09','routing classification regression',{routing});ok(consoleErrors.length===0&&pageErrors.length===0&&cleanNetwork(requestFailures).length===0&&badResponses.length===0,'phase09','Products browser errors',{consoleErrors,pageErrors,requestFailures,badResponses});await page.screenshot({path:path.join(SHOTS,'products','products-390x844.png'),fullPage:true});report.phase09.push({counts,visible,fragments,routing});await page.close();
  }

  // Site-wide 16 routes × 2 viewports = 32 smoke cases.
  for(const [label,w,h] of smokeViewports)for(const route of publicRoutes){
   const ctx=await newPage(browser,w,h);const {page,consoleErrors,pageErrors,requestFailures,badResponses}=ctx;const status=await goto(page,route);await page.evaluate(async()=>{for(const img of document.images){img.scrollIntoView({block:'center'});if(!img.complete)await new Promise(r=>{const done=()=>r();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});setTimeout(done,800)});}});const data=await page.evaluate(()=>({header:!!document.querySelector('header[data-header]'),footer:!!document.querySelector('footer.site-footer'),main:!!document.querySelector('main'),scrollWidth:document.documentElement.scrollWidth,innerWidth,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc||i.src),dup:(()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return[...new Set(a.filter((id,i)=>a.indexOf(id)!==i))]})()}));const scope=`smoke-${route}-${label}`;ok([200,304].includes(status),scope,'HTTP status',{status});ok(data.header&&data.footer&&data.main,scope,'shell/main missing',{data});ok(data.scrollWidth<=data.innerWidth+1,scope,'horizontal overflow',{data});ok(data.broken.length===0,scope,'broken images',{broken:data.broken});ok(data.dup.length===0,scope,'duplicate IDs',{dup:data.dup});ok(consoleErrors.length===0,scope,'console errors',{consoleErrors});ok(pageErrors.length===0,scope,'page errors',{pageErrors});ok(cleanNetwork(requestFailures).length===0,scope,'request failures',{requestFailures});ok(badResponses.length===0,scope,'HTTP subresource errors',{badResponses});report.smoke.push({route,label,status,data,errors:{consoleErrors,pageErrors,requestFailures,badResponses}});if(['technology.html','sales.html','products.html'].includes(route))await page.screenshot({path:path.join(SHOTS,'smoke',`${route.replace('.html','')}-${label}.png`),fullPage:true});await page.close();
  }
 }finally{await browser.close();}
 report.summary={technologyCases:report.technology.length,mobileCases:report.mobile.length,routingRecords:report.routing.length,phase11Cases:report.phase11.length,phase10Cases:report.phase10.length,phase09Records:report.phase09.length,smokeCases:report.smoke.length,failures:report.failures.length};
 fs.writeFileSync(path.join(OUT,'reports','browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));if(report.failures.length){console.error(JSON.stringify(report.failures,null,2));process.exit(2)}
})().catch(e=>{console.error(e?.stack||e);process.exit(3)});
