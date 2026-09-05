const fs=require('fs');
const path=require('path');
const puppeteer=require('puppeteer-core');

(async()=>{
  const out=process.env.OUT;
  fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
  const browser=await puppeteer.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
  const cases=[
    {name:'1920x1080',width:1920,height:1080},
    {name:'1440x900',width:1440,height:900},
    {name:'390x844',width:390,height:844,isMobile:true}
  ];
  const results=[]; const errors=[];
  for(const c of cases){
    const page=await browser.newPage();
    await page.setViewport({width:c.width,height:c.height,deviceScaleFactor:1,isMobile:!!c.isMobile,hasTouch:!!c.isMobile});
    const consoleErrors=[]; const pageErrors=[]; const failed=[];
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('pageerror',e=>pageErrors.push(String(e)));
    page.on('requestfailed',r=>{if(r.url().startsWith('http://127.0.0.1:4173/'))failed.push(r.url()+': '+(r.failure()?.errorText||''))});
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle0',timeout:45000});
    await page.evaluate(()=>document.querySelectorAll('video').forEach(v=>v.pause()));
    const selector='.home-operating-world--trade';
    await page.waitForSelector(selector,{visible:true});
    const imageInfo=await page.$eval(`${selector} img`,img=>({src:img.getAttribute('src'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,complete:img.complete,renderedWidth:img.getBoundingClientRect().width,renderedHeight:img.getBoundingClientRect().height,alt:img.alt,widthAttr:img.getAttribute('width'),heightAttr:img.getAttribute('height')}));
    const section=await page.$(selector);
    await page.evaluate(sel=>{const el=document.querySelector(sel); const y=el.getBoundingClientRect().top+window.scrollY; window.scrollTo(0,Math.max(0,y));},selector);
    await new Promise(r=>setTimeout(r,250));
    const layout=await page.evaluate(sel=>{
      const el=document.querySelector(sel),img=el.querySelector('img');
      const e=el.getBoundingClientRect(),i=img.getBoundingClientRect();
      return {scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,section:{x:e.x,y:e.y,width:e.width,height:e.height},image:{x:i.x,y:i.y,width:i.width,height:i.height},bodyOverflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-window.innerWidth};
    },selector);
    await page.screenshot({path:path.join(out,'screenshots',`homepage-fix02-${c.name}.png`),fullPage:false});
    await section.screenshot({path:path.join(out,'screenshots',`energy-trade-section-${c.name}.png`)});
    const ok=imageInfo.src==='assets/homepage/home-trade-port-arthur.webp'&&imageInfo.naturalWidth===1920&&imageInfo.naturalHeight===1080&&imageInfo.complete&&layout.bodyOverflow<=0&&consoleErrors.length===0&&pageErrors.length===0&&failed.length===0;
    if(!ok)errors.push(`${c.name}: image/layout/browser QA failed`);
    results.push({viewport:c,imageInfo,layout,consoleErrors,pageErrors,failed,ok});
    await page.close();
  }
  await browser.close();
  const report={status:errors.length?'FAIL':'PASS',candidate:'7a768f2ab8e4ccd463d5ac3334de840f92be13f4',results,errors};
  fs.writeFileSync(path.join(out,'homepage-fix02-browser-qa.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,cases:results.length,errors},null,2));
  if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
