const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const puppeteer=require('puppeteer-core');

const BASE='https://www.uniqueholding.com.tr/';
const SHA='46190b02d6760d5c3e59d042535479636c2f2b9a';
const candidate=process.env.CANDIDATE_DIR;
const out=process.env.OUT;
const chrome=process.env.CHROME;
if(!candidate||!out||!chrome) throw new Error('missing env');
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
fs.mkdirSync(path.join(out,'reports'),{recursive:true});
const routes=['index.html','contact.html','corporate.html','technology.html','evidence-axis.html','ventures.html','legal.html','privacy.html','energy.html','products.html','sales.html','product.html','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','404.html'];
const forbidden=['+90 539 380 91 97','farahmand@uniqueholding.com.tr'];
const approved=['+90 212 727 22 22','sales@uniqueholding.com.tr'];
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const errors=[];
const sourceResults=[];
let mobileCount=0,emailCount=0,officeCount=0,salesCount=0;

async function fetchBuffer(url){
  const r=await fetch(url,{redirect:'follow',cache:'no-store',headers:{'cache-control':'no-cache, no-store','pragma':'no-cache'}});
  const b=Buffer.from(await r.arrayBuffer());
  return {r,b};
}
(async()=>{
  for(const route of routes){
    const bust=`?phase23=${SHA.slice(0,12)}-${Date.now()}`;
    const {r,b}=await fetchBuffer(BASE+route+bust);
    if(r.status!==200) errors.push(`${route}: HTTP ${r.status}`);
    const text=b.toString('utf8');
    const mc=(text.match(/\+90 539 380 91 97/g)||[]).length;
    const ec=(text.match(/farahmand@uniqueholding\.com\.tr/g)||[]).length;
    mobileCount+=mc; emailCount+=ec;
    officeCount+=(text.match(/\+90 212 727 22 22/g)||[]).length;
    salesCount+=(text.match(/sales@uniqueholding\.com\.tr/g)||[]).length;
    if(mc) errors.push(`${route}: forbidden mobile present`);
    if(ec) errors.push(`${route}: forbidden email present`);
    const local=fs.readFileSync(path.join(candidate,route));
    const identical=Buffer.compare(local,b)===0;
    if(!identical) errors.push(`${route}: live bytes differ from authorized SHA file`);
    sourceResults.push({route,status:r.status,liveBytes:b.length,sha256:sha256(b),matchesAuthorizedFile:identical,mobileOccurrences:mc,emailOccurrences:ec});
  }
  if(mobileCount!==0) errors.push(`live mobile occurrences=${mobileCount}`);
  if(emailCount!==0) errors.push(`live email occurrences=${emailCount}`);
  if(!officeCount) errors.push('approved office phone not found live');
  if(!salesCount) errors.push('approved sales email not found live');
  const assetRoute='assets/phase08/film-still-physical-trade.webp';
  const {r:ar,b:ab}=await fetchBuffer(BASE+assetRoute+`?phase23=${Date.now()}`);
  const localAsset=fs.readFileSync(path.join(candidate,assetRoute));
  const assetIdentical=ar.status===200&&Buffer.compare(localAsset,ab)===0;
  if(!assetIdentical) errors.push('live replacement image differs or failed');

  const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const visualRoutes=['index.html','contact.html','corporate.html','technology.html'];
  const viewports=[{w:1440,h:900},{w:390,h:844}];
  const visual=[];
  try{
    for(const route of visualRoutes){
      for(const vp of viewports){
        const page=await browser.newPage();
        await page.setCacheEnabled(false);
        await page.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1});
        const consoleErrors=[]; const pageErrors=[]; const failed=[]; const badResponses=[];
        page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
        page.on('pageerror',e=>pageErrors.push(String(e)));
        page.on('requestfailed',req=>failed.push({url:req.url(),error:req.failure()?.errorText||''}));
        page.on('response',res=>{if(res.status()>=400) badResponses.push({url:res.url(),status:res.status()})});
        const response=await page.goto(BASE+route+`?phase23=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:45000});
        await new Promise(r=>setTimeout(r,1200));
        if(!response||response.status()!==200) errors.push(`${route} ${vp.w}x${vp.h}: navigation status ${response?.status()}`);
        const state=await page.evaluate(({forbidden,route})=>{
          const bodyText=document.body?.innerText||'';
          const html=document.documentElement.outerHTML;
          const overflow=document.documentElement.scrollWidth-document.documentElement.clientWidth;
          const mixed=[...performance.getEntriesByType('resource')].map(x=>x.name).filter(u=>u.startsWith('http:'));
          const emptyCards=route==='contact.html'?[...document.querySelectorAll('.contact-route-card')].filter(c=>!c.textContent.trim()||!c.querySelector('a[href]')).length:0;
          const target=document.querySelector('img[src*="assets/phase08/film-still-physical-trade.webp"]');
          const old=document.querySelector('img[src*="assets/phase04/film-still-logistics.webp"]');
          let targetInfo=null;
          if(target){const b=target.getBoundingClientRect();targetInfo={complete:target.complete,naturalWidth:target.naturalWidth,naturalHeight:target.naturalHeight,width:b.width,height:b.height,visible:b.width>0&&b.height>0};}
          return {bodyForbidden:forbidden.filter(x=>bodyText.includes(x)),htmlForbidden:forbidden.filter(x=>html.includes(x)),overflow,mixed,emptyCards,targetInfo,oldPresent:!!old};
        },{forbidden,route});
        if(state.bodyForbidden.length||state.htmlForbidden.length) errors.push(`${route} ${vp.w}x${vp.h}: forbidden contact visible/source`);
        if(state.overflow>1) errors.push(`${route} ${vp.w}x${vp.h}: horizontal overflow ${state.overflow}`);
        if(state.mixed.length) errors.push(`${route} ${vp.w}x${vp.h}: mixed content ${state.mixed.join(',')}`);
        if(state.emptyCards) errors.push(`${route} ${vp.w}x${vp.h}: empty contact cards ${state.emptyCards}`);
        const sameOriginFailed=failed.filter(x=>x.url.startsWith(BASE));
        const sameOriginBad=badResponses.filter(x=>x.url.startsWith(BASE));
        if(pageErrors.length) errors.push(`${route} ${vp.w}x${vp.h}: page errors ${pageErrors.join(' | ')}`);
        if(consoleErrors.length) errors.push(`${route} ${vp.w}x${vp.h}: console errors ${consoleErrors.join(' | ')}`);
        if(sameOriginFailed.length) errors.push(`${route} ${vp.w}x${vp.h}: failed local requests ${JSON.stringify(sameOriginFailed)}`);
        if(sameOriginBad.length) errors.push(`${route} ${vp.w}x${vp.h}: bad local responses ${JSON.stringify(sameOriginBad)}`);
        if(route==='index.html'){
          if(!state.targetInfo||!state.targetInfo.complete||state.targetInfo.naturalWidth!==960||state.targetInfo.naturalHeight!==540||!state.targetInfo.visible) errors.push(`index ${vp.w}x${vp.h}: replacement image invalid ${JSON.stringify(state.targetInfo)}`);
          if(state.oldPresent) errors.push(`index ${vp.w}x${vp.h}: old blurry image still present`);
        }
        const shot=`${route.replace('.html','')}-${vp.w}x${vp.h}.png`;
        await page.screenshot({path:path.join(out,'screenshots',shot),fullPage:false});
        visual.push({route,viewport:`${vp.w}x${vp.h}`,status:response?.status(),consoleErrors,pageErrors,failedRequests:sameOriginFailed,badResponses:sameOriginBad,...state,screenshot:shot});
        await page.close();
      }
    }
  } finally { await browser.close(); }
  const result={status:errors.length?'FAIL':'PASS',authorizedSha:SHA,liveSourceRoutes:sourceResults.length,liveMobileOccurrences:mobileCount,liveEmailOccurrences:emailCount,approvedOfficePhoneOccurrences:officeCount,approvedSalesEmailOccurrences:salesCount,replacementAsset:{path:assetRoute,status:ar.status,bytes:ab.length,sha256:sha256(ab),matchesAuthorizedFile:assetIdentical},visualCases:visual.length,errors,sourceResults,visual};
  fs.writeFileSync(path.join(out,'live-verification.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:result.status,liveMobileOccurrences:mobileCount,liveEmailOccurrences:emailCount,visualCases:visual.length,errors},null,2));
  if(errors.length) process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
