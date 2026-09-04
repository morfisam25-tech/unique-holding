const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const puppeteer=require('puppeteer-core');

const BASE='http://127.0.0.1:4173/';
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

const viewports=[
  {w:1920,h:1080},
  {w:1440,h:900},
  {w:768,h:1024},
  {w:390,h:844},
  {w:360,h:800}
];
const errors=[]; const results=[];
(async()=>{
 const browser=await puppeteer.launch({executablePath:CHROME,headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
 try{
  for(const vp of viewports){
   const page=await browser.newPage();
   await page.setViewport({width:vp.w,height:vp.h,deviceScaleFactor:1});
   const consoleErrors=[]; const pageErrors=[]; const failed=[]; const bad=[];
   page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
   page.on('pageerror',e=>pageErrors.push(String(e)));
   page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText||''}));
   page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()})});
   const response=await page.goto(BASE+'index.html?fix01='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForSelector('.home-hero-positioning',{visible:true,timeout:10000});
   await page.evaluate(()=>{
     const v=document.getElementById('holding-film');
     if(v){try{v.pause();v.currentTime=0}catch{}}
   });
   await new Promise(r=>setTimeout(r,700));
   const state=await page.evaluate(()=>{
    const r=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
    const overlay=document.querySelector('.home-hero-positioning');
    const title=document.querySelector('.home-hero-positioning__title');
    const loc=document.querySelector('.home-hero-positioning__location');
    const header=document.querySelector('.site-header');
    const video=document.getElementById('holding-film');
    const sound=document.querySelector('[data-film-sound]');
    const buttons=[...document.querySelectorAll('.hero-film-controls button:not([hidden]),.hero-film-controls input:not([hidden])')];
    const or=r(overlay),hr=r(header),vr=r(video);
    const controlRects=buttons.map(r);
    const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const controlCollision=controlRects.some(c=>intersects(or,c));
    const titleText=[...title.querySelectorAll('span')].map(x=>x.textContent.trim());
    const supportText=loc.textContent.trim();
    const titleStyle=getComputedStyle(title); const overlayStyle=getComputedStyle(overlay);
    return {
      overlay:or,header:hr,video:vr,controlRects,
      controlCollision,
      headerCollision:intersects(or,hr),
      overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      titleText,supportText,
      fontFamily:titleStyle.fontFamily,fontSize:titleStyle.fontSize,lineHeight:titleStyle.lineHeight,
      pointerEvents:overlayStyle.pointerEvents,
      visible:overlayStyle.display!=='none'&&overlayStyle.visibility!=='hidden'&&Number(overlayStyle.opacity)!==0,
      oldHiddenH1Visible:getComputedStyle(document.querySelector('.hero-film-heading')).display!=='none'&&document.querySelector('.hero-film-heading').getBoundingClientRect().width>2,
      videoSource:document.querySelector('#holding-film source')?.getAttribute('src'),
      poster:video.getAttribute('poster'),
      captionTrack:document.querySelector('#holding-film track')?.getAttribute('src')
    };
   });
   const prefix=`${vp.w}x${vp.h}`;
   const sameOriginFailed=failed.filter(x=>x.url.startsWith(BASE));
   const sameOriginBad=bad.filter(x=>x.url.startsWith(BASE));
   if(!response||response.status()!==200)errors.push(`${prefix}: navigation ${response?.status()}`);
   if(state.titleText.join('|')!=='Industrial trade.|Technology.|Intelligence.')errors.push(`${prefix}: locked title drift`);
   if(state.supportText!=='Operating from Istanbul.')errors.push(`${prefix}: support copy drift`);
   if(!state.visible)errors.push(`${prefix}: positioning not visible`);
   if(state.headerCollision)errors.push(`${prefix}: header collision`);
   if(state.controlCollision)errors.push(`${prefix}: film control collision`);
   if(state.overflowX>1)errors.push(`${prefix}: horizontal overflow ${state.overflowX}`);
   if(consoleErrors.length)errors.push(`${prefix}: console errors ${consoleErrors.join(' | ')}`);
   if(pageErrors.length)errors.push(`${prefix}: page errors ${pageErrors.join(' | ')}`);
   if(sameOriginFailed.length)errors.push(`${prefix}: failed local requests ${JSON.stringify(sameOriginFailed)}`);
   if(sameOriginBad.length)errors.push(`${prefix}: bad local responses ${JSON.stringify(sameOriginBad)}`);
   if(state.pointerEvents!=='none')errors.push(`${prefix}: presentation layer captures pointer events`);
   if(state.videoSource!=='assets/media/unique-holding-film-720p.mp4')errors.push(`${prefix}: film source changed`);
   if(state.captionTrack!=='assets/media/unique-holding-caption.vtt')errors.push(`${prefix}: caption track changed`);
   const shot=`homepage-fix01-${prefix}.png`;
   await page.screenshot({path:path.join(OUT,'screenshots',shot),fullPage:false});
   results.push({viewport:prefix,status:response?.status(),...state,consoleErrors,pageErrors,failedRequests:sameOriginFailed,badResponses:sameOriginBad,screenshot:shot});
   await page.close();
  }
 }finally{await browser.close()}
 const report={status:errors.length?'FAIL':'PASS',candidateSha:'130be874d2ffdf4763052201a8cfed03ab54be18',filmHashPass,viewports:results,errors};
 fs.writeFileSync(path.join(OUT,'homepage-fix01-browser-qa.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,filmHashPass,visualCases:results.length,errors},null,2));
 if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
