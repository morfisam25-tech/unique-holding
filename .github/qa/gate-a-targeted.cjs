const fs=require('fs');
const puppeteer=require('puppeteer-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
 const out={productSha:'4ca464131e2e0d3ce2ba98aeda385c5d6162f34f',nav:{},energyLazy:{},hashLinks:{}};
 for(const v of [{n:'768x1024',w:768,h:1024},{n:'390x844',w:390,h:844},{n:'360x800',w:360,h:800}]){
  const p=await browser.newPage();await p.setViewport({width:v.w,height:v.h});await p.goto('http://127.0.0.1:8000/index.html',{waitUntil:'domcontentloaded'});await sleep(300);await p.click('.menu-toggle');await sleep(500);
  out.nav[v.n]=await p.evaluate(()=>{const nav=document.querySelector('#primary-nav'),head=document.querySelector('[data-header]'),links=[...nav.querySelectorAll('a')];const box=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,position:s.position,overflow:s.overflow,display:s.display,visibility:s.visibility,opacity:s.opacity,backdropFilter:s.backdropFilter,transform:s.transform}};return{header:box(head),nav:box(nav),links:links.map(a=>({text:a.textContent.trim(),box:box(a)})),viewport:{w:innerWidth,h:innerHeight},bodyOverflow:getComputedStyle(document.body).overflow}});
  await p.screenshot({path:`gate-a-targeted/nav-${v.n}.png`});await p.close();
 }
 for(const v of [{n:'1920x1080',w:1920,h:1080},{n:'1440x900',w:1440,h:900},{n:'768x1024',w:768,h:1024},{n:'390x844',w:390,h:844},{n:'360x800',w:360,h:800}]){
  const p=await browser.newPage();await p.setViewport({width:v.w,height:v.h});const failures=[];p.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText||''}));await p.goto('http://127.0.0.1:8000/energy.html',{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.querySelector('img[src*="operations-context"]')?.scrollIntoView({block:'center'}));let loaded=false;try{await p.waitForFunction(()=>{const i=document.querySelector('img[src*="operations-context"]');return i&&i.complete&&i.naturalWidth>0},{timeout:5000});loaded=true}catch{}await sleep(300);out.energyLazy[v.n]=await p.evaluate((loaded)=>{const i=document.querySelector('img[src*="operations-context"]'),r=i.getBoundingClientRect();return{loaded,complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,src:i.getAttribute('src'),rect:{left:r.left,top:r.top,width:r.width,height:r.height}}},loaded);out.energyLazy[v.n].requestFailures=failures;await p.screenshot({path:`gate-a-targeted/energy-lazy-${v.n}.png`});await p.close();
 }
 for(const id of ['petrochemical','chemical','energy-products']){
  const p=await browser.newPage();await p.setViewport({width:1440,height:900});await p.goto(`http://127.0.0.1:8000/products.html#${id}`,{waitUntil:'domcontentloaded'});await sleep(700);out.hashLinks[id]=await p.evaluate(id=>{const e=document.getElementById(id);if(!e)return{exists:false,scrollY,hash:location.hash};const r=e.getBoundingClientRect();return{exists:true,scrollY,hash:location.hash,rect:{top:r.top,bottom:r.bottom,height:r.height},heading:e.querySelector('h2')?.textContent.trim()||''}},id);await p.screenshot({path:`gate-a-targeted/hash-${id}.png`});await p.close();
 }
 fs.writeFileSync('gate-a-targeted/targeted.json',JSON.stringify(out,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});