const fs=require('fs');
const path=require('path');
const puppeteer=require('puppeteer-core');

const BASE=process.env.PHASE23_BASE||'http://127.0.0.1:4173/';
const OUT=process.env.PHASE23_OUT||'/tmp/phase23-review';
const SHOTS=path.join(OUT,'screenshots');
fs.mkdirSync(SHOTS,{recursive:true});
const mobile='+90 539 380 91 97';
const email='farahmand@uniqueholding.com.tr';
const errors=[];
const routes=['index.html','corporate.html','energy.html','products.html','product.html','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','sales.html','technology.html','evidence-axis.html','ventures.html','contact.html','privacy.html','legal.html','404.html'];
const requiredSmoke=['index.html','contact.html','corporate.html','technology.html','evidence-axis.html','ventures.html','legal.html','privacy.html'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function inspectRoute(browser,route,width,height){
  const p=await browser.newPage();
  await p.setViewport({width,height,deviceScaleFactor:1});
  const consoleErrors=[],pageErrors=[],badResponses=[];
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  p.on('pageerror',e=>pageErrors.push(String(e)));
  p.on('response',r=>{try{const u=new URL(r.url());if(u.origin===new URL(BASE).origin&&r.status()>=400)badResponses.push({url:r.url(),status:r.status(),type:r.request().resourceType()})}catch{}});
  let resp=null;
  try{resp=await p.goto(BASE+route,{waitUntil:'load',timeout:30000});await sleep(120)}catch(e){pageErrors.push('navigation '+String(e))}
  const dom=await p.evaluate(({mobile,email})=>{
    const body=document.body;
    const hrefs=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')||'');
    const imgs=[...document.images].map(i=>({src:i.getAttribute('src')||'',currentSrc:i.currentSrc||'',complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight}));
    return {
      bodyHasMobile:(body?.innerText||'').includes(mobile),
      bodyHasEmail:(body?.innerText||'').toLowerCase().includes(email),
      forbiddenTel:hrefs.filter(h=>h.toLowerCase().includes('tel:+905393809197')),
      forbiddenMailto:hrefs.filter(h=>h.toLowerCase().includes('mailto:'+email)),
      approvedOfficeTel:hrefs.filter(h=>h.toLowerCase().startsWith('tel:+902127272222')).length,
      approvedSalesMail:hrefs.filter(h=>h.toLowerCase().startsWith('mailto:sales@uniqueholding.com.tr')).length,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
      main:!!document.querySelector('main'),
      h1:document.querySelectorAll('main h1').length,
      imgs
    };
  },{mobile,email});
  const result={route,width,height,status:resp?.status()||0,finalUrl:p.url(),consoleErrors,pageErrors,badResponses,...dom};
  if(result.status!==200)errors.push(`${route} status ${result.status}`);
  if(result.bodyHasMobile||result.bodyHasEmail||result.forbiddenTel.length||result.forbiddenMailto.length)errors.push(`${route} personal contact exposure`);
  if(result.overflow)errors.push(`${route} horizontal overflow ${width}x${height}`);
  if(result.pageErrors.length||result.consoleErrors.length)errors.push(`${route} console/page error ${width}x${height}`);
  if(result.badResponses.length)errors.push(`${route} same-origin >=400 ${width}x${height}`);
  if(!result.main||result.h1!==1)errors.push(`${route} main/H1 structure ${result.h1}`);
  await p.close(); return result;
}

async function capture(browser,{name,route,width,height,selector,block='center'}){
  const p=await browser.newPage();await p.setViewport({width,height,deviceScaleFactor:1});
  const consoleErrors=[],pageErrors=[],badResponses=[];
  p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});p.on('pageerror',e=>pageErrors.push(String(e)));
  p.on('response',r=>{try{const u=new URL(r.url());if(u.origin===new URL(BASE).origin&&r.status()>=400)badResponses.push({url:r.url(),status:r.status()})}catch{}});
  const resp=await p.goto(BASE+route,{waitUntil:'load',timeout:30000});await sleep(200);
  if(selector){await p.waitForSelector(selector,{timeout:10000});await p.$eval(selector,(e,b)=>e.scrollIntoView({block:b,inline:'nearest'}),block);await sleep(180)}
  const verify=await p.evaluate(({mobile,email})=>({mobile:(document.body.innerText||'').includes(mobile),email:(document.body.innerText||'').toLowerCase().includes(email),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}),{mobile,email});
  if(resp.status()!==200||verify.mobile||verify.email||verify.overflow||consoleErrors.length||pageErrors.length||badResponses.length)errors.push(`visual gate ${name}`);
  const file=path.join(SHOTS,name+'.png');await p.screenshot({path:file,fullPage:false});
  const item={name,file:path.basename(file),route,width,height,selector,status:resp.status(),consoleErrors,pageErrors,badResponses,verify};
  await p.close();return item;
}

(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.CHROME,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
  const smoke=[];
  for(const r of routes){smoke.push(await inspectRoute(browser,r,1440,900));}
  for(const r of requiredSmoke){smoke.push(await inspectRoute(browser,r,390,844));}

  // Contact-specific structural checks.
  const cp=await browser.newPage();await cp.setViewport({width:1440,height:900,deviceScaleFactor:1});await cp.goto(BASE+'contact.html',{waitUntil:'load',timeout:30000});
  const contact=await cp.evaluate(()=>({
    routeCards:[...document.querySelectorAll('.contact-route-card')].map(x=>({text:x.innerText.trim(),links:[...x.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))})),
    communication:[...document.querySelectorAll('.contact-communication-grid > div')].map(x=>({text:x.innerText.trim(),links:[...x.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))})),
    direct:[...document.querySelectorAll('.contact-direct-list a[href]')].map(a=>({href:a.getAttribute('href'),text:a.innerText.trim()}))
  }));
  if(contact.routeCards.length!==4||contact.routeCards.some(x=>!x.text||x.links.length<1))errors.push('contact route card empty/awkward');
  if(contact.communication.length!==2||contact.communication.some(x=>!x.text||x.links.length<1))errors.push('contact communication block empty/awkward');
  if(contact.direct.length!==2)errors.push(`contact direct list expected 2 approved contacts, got ${contact.direct.length}`);
  if(!contact.direct.some(x=>x.href==='tel:+902127272222')||!contact.direct.some(x=>x.href?.startsWith('mailto:sales@uniqueholding.com.tr')))errors.push('approved public contact routes missing');
  await cp.close();

  // Homepage replacement image intrinsic/render checks across required widths.
  const imageChecks=[];
  for(const [width,height] of [[1440,900],[390,844],[360,800]]){
    const p=await browser.newPage();await p.setViewport({width,height,deviceScaleFactor:1});await p.goto(BASE+'index.html',{waitUntil:'load',timeout:30000});await p.waitForSelector('.home-operating-world--trade img');
    const x=await p.$eval('.home-operating-world--trade img',i=>{const r=i.getBoundingClientRect();return {src:i.getAttribute('src'),widthAttr:i.getAttribute('width'),heightAttr:i.getAttribute('height'),naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,renderedWidth:r.width,renderedHeight:r.height,complete:i.complete}});
    x.viewport={width,height};x.density=x.renderedWidth?x.naturalWidth/x.renderedWidth:0;imageChecks.push(x);
    if(x.src!=='assets/phase08/film-still-physical-trade.webp'||x.widthAttr!=='960'||x.heightAttr!=='540'||x.naturalWidth!==960||x.naturalHeight!==540||!x.complete||x.density<1)errors.push(`homepage replacement image quality/load ${width}x${height}`);
    await p.close();
  }

  const visualSpecs=[
    {name:'homepage-1440x900',route:'index.html',width:1440,height:900,selector:'.home-operating-world--trade'},
    {name:'homepage-390x844',route:'index.html',width:390,height:844,selector:'.home-operating-world--trade'},
    {name:'homepage-360x800',route:'index.html',width:360,height:800,selector:'.home-operating-world--trade'},
    {name:'contact-1440x900',route:'contact.html',width:1440,height:900,selector:'#istanbul-office'},
    {name:'contact-390x844',route:'contact.html',width:390,height:844,selector:'#istanbul-office'},
    {name:'technology-1440x900',route:'technology.html',width:1440,height:900,selector:'.site-footer',block:'end'},
    {name:'technology-390x844',route:'technology.html',width:390,height:844,selector:'.site-footer',block:'end'},
    {name:'corporate-1440x900',route:'corporate.html',width:1440,height:900,selector:'#company'},
    {name:'corporate-390x844',route:'corporate.html',width:390,height:844,selector:'#company'}
  ];
  const visuals=[];for(const spec of visualSpecs)visuals.push(await capture(browser,spec));

  // Extra review crops/viewport evidence requested by the phase packet.
  const p1=await browser.newPage();await p1.setViewport({width:1440,height:1000,deviceScaleFactor:1});await p1.goto(BASE+'index.html',{waitUntil:'load'});await p1.waitForSelector('.home-operating-world--trade');const e1=await p1.$('.home-operating-world--trade');await e1.screenshot({path:path.join(SHOTS,'homepage-fixed-image-area.png')});await p1.close();
  const p2=await browser.newPage();await p2.setViewport({width:1440,height:900,deviceScaleFactor:1});await p2.goto(BASE+'corporate.html',{waitUntil:'load'});await p2.$eval('#company',e=>e.scrollIntoView({block:'center'}));await sleep(100);await p2.screenshot({path:path.join(SHOTS,'former-email-page-corporate.png')});await p2.close();
  const p3=await browser.newPage();await p3.setViewport({width:390,height:844,deviceScaleFactor:1});await p3.goto(BASE+'contact.html',{waitUntil:'load'});await p3.$eval('#istanbul-office',e=>e.scrollIntoView({block:'center'}));await sleep(100);await p3.screenshot({path:path.join(SHOTS,'clean-contact-mobile.png')});await p3.close();

  await browser.close();
  const out={base:BASE,smokeCases:smoke.length,requiredRouteSmokeCases:requiredSmoke.length*2,smokeFailures:smoke.filter(x=>x.status!==200||x.bodyHasMobile||x.bodyHasEmail||x.forbiddenTel.length||x.forbiddenMailto.length||x.overflow||x.consoleErrors.length||x.pageErrors.length||x.badResponses.length).length,contact,imageChecks,visualCases:visuals.length,visualAutomatedFailures:visuals.filter(x=>x.status!==200||x.verify.mobile||x.verify.email||x.verify.overflow||x.consoleErrors.length||x.pageErrors.length||x.badResponses.length).length,visuals,totalErrors:errors.length,errors};
  fs.writeFileSync(path.join(OUT,'browser-qa.json'),JSON.stringify(out,null,2));
  console.log(JSON.stringify({smokeCases:out.smokeCases,smokeFailures:out.smokeFailures,visualCases:out.visualCases,visualAutomatedFailures:out.visualAutomatedFailures,totalErrors:out.totalErrors,errors},null,2));
  if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
