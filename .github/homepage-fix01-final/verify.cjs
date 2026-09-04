const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const puppeteer=require('puppeteer-core');

const BASE='http://127.0.0.1:4173/';
const SHA='75f5a232297b61f9bf857d208d334ce3f794a603';
const OUT=process.env.OUT||path.resolve('homepage-fix01-evidence');
const CHROME=process.env.CHROME;
if(!CHROME) throw new Error('CHROME missing');
fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
fs.mkdirSync(path.join(OUT,'reports'),{recursive:true});
const expectedFilmHashes={
  'player inline CSS':'304201e768beb75f4a8c00f50da66a44a2fc3ee116eec2da588cc3ec6c248848',
  'hero/player markup':'d9c6628f5451049921b2a0bfd1f5f174c8c482101b156473204dd2a1c8012e9f',
  'player behavior script':'1e1697cce9df7d454022d27a9925095a3a0b5a4f27c8a88dc02e4916b6d9afe1'
};
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
const index=fs.readFileSync('index.html','utf8');
const styleStart=index.indexOf('  <style>');
const styleEnd=styleStart>=0?index.indexOf('  </style>',styleStart):-1;
const heroStart=index.indexOf('    <section class="hero hero-film-hero"');
const heroEnd=heroStart>=0?index.indexOf('    <section class="home-thesis"',heroStart):-1;
const marker='  <script src="assets/site.js" defer></script>';
const markerPos=index.indexOf(marker); const markerEnd=markerPos>=0?markerPos+marker.length:-1;
const filmJsStart=markerEnd>=0?index.indexOf('  <script>',markerEnd):-1;
const filmJsEnd=filmJsStart>=0?index.indexOf('  </script>',filmJsStart):-1;
const actualFilmHashes={
  'player inline CSS':sha256(index.slice(styleStart,styleEnd+'  </style>'.length)),
  'hero/player markup':sha256(index.slice(heroStart,heroEnd)),
  'player behavior script':sha256(index.slice(filmJsStart,filmJsEnd+'  </script>'.length))
};
const filmHashPass=Object.keys(expectedFilmHashes).every(k=>expectedFilmHashes[k]===actualFilmHashes[k]);
fs.writeFileSync(path.join(OUT,'reports','film-hashes.json'),JSON.stringify({expectedFilmHashes,actualFilmHashes,pass:filmHashPass},null,2));
if(!filmHashPass) throw new Error('protected film hash mismatch');

const viewports=[{w:1920,h:1080},{w:1440,h:900},{w:768,h:1024},{w:390,h:844},{w:360,h:800}];
const errors=[]; const results=[];
(async()=>{
 const browser=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
 try{
  for(const vp of viewports){
   const page=await browser.newPage();
   await page.setCacheEnabled(false);
   await page.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1});
   const consoleErrors=[]; const pageErrors=[]; const failed=[]; const bad=[];
   page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
   page.on('pageerror',e=>pageErrors.push(String(e)));
   page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));
   page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()})});
   const response=await page.goto(BASE+'index.html?fix01='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForSelector('.home-hero-positioning',{visible:true,timeout:10000});
   await page.evaluate(()=>{const v=document.getElementById('holding-film');if(v){try{v.pause();v.currentTime=0}catch{}}});
   await new Promise(r=>setTimeout(r,900));
   const state=await page.evaluate(()=>{
    const rect=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,left:b.left,top:b.top,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
    const overlay=document.querySelector('.home-hero-positioning');
    const title=document.querySelector('.home-hero-positioning__title');
    const loc=document.querySelector('.home-hero-positioning__location');
    const header=document.querySelector('.site-header');
    const video=document.getElementById('holding-film');
    const controls=[...document.querySelectorAll('.hero-film-controls button:not([hidden]),.hero-film-controls input:not([hidden]),.hero-film-time')];
    const or=rect(overlay),hr=rect(header),vr=rect(video),cr=controls.map(rect);
    const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const titleText=[...title.querySelectorAll('span')].map(x=>x.textContent.trim());
    const overlayStyle=getComputedStyle(overlay); const titleStyle=getComputedStyle(title);
    const hero=document.querySelector('.hero-film-hero');
    return {
      overlay:or,header:hr,video:vr,hero:rect(hero),controlRects:cr,
      controlCollision:cr.some(c=>intersects(or,c)),headerCollision:intersects(or,hr),
      overlayVideoIntersection:intersects(or,vr),
      overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      titleText,supportText:loc.textContent.trim(),fontFamily:titleStyle.fontFamily,fontSize:titleStyle.fontSize,lineHeight:titleStyle.lineHeight,
      pointerEvents:overlayStyle.pointerEvents,visible:overlayStyle.display!=='none'&&overlayStyle.visibility!=='hidden'&&Number(overlayStyle.opacity)!==0,
      videoSource:document.querySelector('#holding-film source')?.getAttribute('src'),poster:video.getAttribute('poster'),captionTrack:document.querySelector('#holding-film track')?.getAttribute('src'),
      videoPlaysInline:video.hasAttribute('playsinline'),videoAutoplay:video.hasAttribute('autoplay')
    };
   });
   const prefix=`${vp.w}x${vp.h}`;
   const localFailed=failed.filter(x=>x.url.startsWith(BASE)); const localBad=bad.filter(x=>x.url.startsWith(BASE));
   if(!response||response.status()!==200)errors.push(`${prefix}: navigation ${response?.status()}`);
   if(state.titleText.join('|')!=='Industrial trade.|Technology.|Intelligence.')errors.push(`${prefix}: locked title drift`);
   if(state.supportText!=='Operating from Istanbul.')errors.push(`${prefix}: support copy drift`);
   if(!state.visible)errors.push(`${prefix}: positioning not visible`);
   if(state.headerCollision)errors.push(`${prefix}: header collision`);
   if(state.controlCollision)errors.push(`${prefix}: film control collision`);
   if(state.overflowX>1)errors.push(`${prefix}: horizontal overflow ${state.overflowX}`);
   if(consoleErrors.length)errors.push(`${prefix}: console errors ${consoleErrors.join(' | ')}`);
   if(pageErrors.length)errors.push(`${prefix}: page errors ${pageErrors.join(' | ')}`);
   if(localFailed.length)errors.push(`${prefix}: failed local requests ${JSON.stringify(localFailed)}`);
   if(localBad.length)errors.push(`${prefix}: bad local responses ${JSON.stringify(localBad)}`);
   if(state.pointerEvents!=='none')errors.push(`${prefix}: positioning captures pointer events`);
   if(state.videoSource!=='assets/media/unique-holding-film-720p.mp4')errors.push(`${prefix}: film source changed`);
   if(state.captionTrack!=='assets/media/unique-holding-caption.vtt')errors.push(`${prefix}: captions source changed`);
   if(!state.videoPlaysInline||state.videoAutoplay)errors.push(`${prefix}: protected video attributes changed`);
   const shot=`homepage-fix01-${prefix}.png`;
   await page.screenshot({path:path.join(OUT,'screenshots',shot),fullPage:false});
   results.push({viewport:prefix,status:response?.status(),...state,consoleErrors,pageErrors,failedRequests:localFailed,badResponses:localBad,screenshot:shot});
   await page.close();
  }
 }finally{await browser.close()}
 const report={status:errors.length?'FAIL':'PASS',candidateSha:SHA,filmHashPass,visualCases:results.length,errors,viewports:results};
 fs.writeFileSync(path.join(OUT,'homepage-fix01-browser-qa.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,filmHashPass,visualCases:results.length,errors},null,2));
 if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
