const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const PRODUCT_SHA = 'db2e8b9134f7bac4b825bc5ac07301f19499237e';
const base = 'http://127.0.0.1:8000/';
const viewports = [
  [1920,1080],
  [1440,900],
  [768,1024],
  [390,844],
  [360,800]
];
const routes = ['privacy.html','legal.html'];
const outDir = process.env.OUT_DIR || 'phase17-policy-diagnostic';
const shotsDir = path.join(outDir,'screenshots');
fs.mkdirSync(shotsDir,{recursive:true});

const bodySelector = [
  '.legal-hero .intro',
  '.legal-policy-section .section-cap > p',
  '.legal-card p',
  '.legal-split p',
  '.legal-callout p',
  '.legal-review-grid p',
  '.legal-contact-panel p'
].join(',');
const metadataSelector = [
  '.subsite-label',
  '.legal-kicker',
  '.legal-label',
  '.section-cap .num',
  '.legal-card > span',
  '.legal-review-grid strong',
  '.legal-callout > strong'
].join(',');

const failures = [];
const records = [];
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const round = n => Number(Number(n).toFixed(2));

(async()=>{
  const browser = await puppeteer.launch({
    executablePath:process.env.CHROME,
    headless:true,
    args:['--no-sandbox']
  });
  try {
    for (const route of routes) {
      for (const [w,h] of viewports) {
        const page = await browser.newPage();
        const consoleErrors=[];
        const pageErrors=[];
        const failedRequests=[];
        page.on('console',msg=>{if(msg.type()==='error') consoleErrors.push(msg.text())});
        page.on('pageerror',err=>pageErrors.push(String(err)));
        page.on('requestfailed',req=>failedRequests.push({url:req.url(),failure:req.failure()?.errorText||'unknown'}));
        await page.setViewport({width:w,height:h});
        await page.goto(base+route,{waitUntil:'networkidle2',timeout:45000});
        await sleep(250);

        const metrics = await page.evaluate(({bodySelector,metadataSelector,w})=>{
          const rect = el => {
            if(!el) return null;
            const r=el.getBoundingClientRect();
            return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
          };
          const styleMetric = el => {
            const cs=getComputedStyle(el);
            const r=el.getBoundingClientRect();
            return {
              tag:el.tagName.toLowerCase(),
              cls:el.className||'',
              text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,160),
              fontSize:parseFloat(cs.fontSize),
              lineHeight:cs.lineHeight==='normal' ? null : parseFloat(cs.lineHeight),
              width:r.width,
              geometry:rect(el)
            };
          };
          const body=[...document.querySelectorAll(bodySelector)].filter(el=>(el.textContent||'').trim()).map(styleMetric);
          const metadata=[...document.querySelectorAll(metadataSelector)].filter(el=>(el.textContent||'').trim()).map(styleMetric);

          // Action-like controls: button-styled links, link-row controls, and standalone contact-panel links.
          // Inline prose links are intentionally excluded from the 40px control-height rule.
          const actionNodes=[...new Set([
            ...document.querySelectorAll('main .button-link'),
            ...document.querySelectorAll('main .legal-link-row a'),
            ...document.querySelectorAll('main .legal-contact-panel a')
          ])];
          const actions=actionNodes.map(el=>({
            text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,120),
            href:el.getAttribute('href')||'',
            cls:el.className||'',
            geometry:rect(el)
          }));

          const sectionContainers=[...document.querySelectorAll('main .legal-policy-section .section-cap')].map(el=>({
            text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),
            geometry:rect(el)
          }));
          const company=[...document.querySelectorAll('main strong')].find(el=>(el.textContent||'').includes('UNIQE OTOMOTİV'));
          const address=document.querySelector('main address');
          const emails=[...document.querySelectorAll('main a[href^="mailto:"]')].map(el=>({text:(el.textContent||'').trim(),geometry:rect(el)}));
          const hero=document.querySelector('.legal-hero');
          const bodyMin=body.length?Math.min(...body.map(x=>x.fontSize)):null;
          const metadataMin=metadata.length?Math.min(...metadata.map(x=>x.fontSize)):null;
          const bodyLineHeights=body.map(x=>x.lineHeight).filter(Number.isFinite);
          const bodyMinLineHeight=bodyLineHeights.length?Math.min(...bodyLineHeights):null;
          const bodyMaxWidth=body.length?Math.max(...body.map(x=>x.width)):null;
          const sectionMaxWidth=sectionContainers.length?Math.max(...sectionContainers.map(x=>x.geometry.width)):null;
          return {
            document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,scrollHeight:document.documentElement.scrollHeight},
            body,metadata,actions,sectionContainers,
            bodyMin,metadataMin,bodyMinLineHeight,bodyMaxWidth,sectionMaxWidth,
            heroBefore:hero?getComputedStyle(hero,'::before').backgroundImage:null,
            company:rect(company),address:rect(address),emails,
            viewportWidth:w
          };
        },{bodySelector,metadataSelector,w});

        const mobile=w<=390;
        const requiredBodyMin=mobile?16:15;
        const localFailures=[];
        for(const item of metrics.body){
          if(item.fontSize+0.01<requiredBodyMin){
            localFailures.push({type:'body-copy-font',required:requiredBodyMin,actual:item.fontSize,element:item});
          }
          // Retain the existing 1000px maximum prose-measure concept, but measure actual prose rather than wrappers.
          if(item.width>Math.min(w,1000)+2){
            localFailures.push({type:'content-text-measure',limit:Math.min(w,1000),actual:item.width,element:item});
          }
        }
        if(metrics.document.scrollWidth>w+1){
          localFailures.push({type:'horizontal-overflow',viewport:w,scrollWidth:metrics.document.scrollWidth});
        }
        const clipped=(g)=>g&&(g.x<-1||g.right>w+1);
        if(clipped(metrics.company)) localFailures.push({type:'company-clip',geometry:metrics.company});
        if(clipped(metrics.address)) localFailures.push({type:'address-clip',geometry:metrics.address});
        for(const email of metrics.emails){
          if(clipped(email.geometry)) localFailures.push({type:'email-clip',email});
        }
        if(mobile){
          for(const action of metrics.actions){
            const g=action.geometry;
            if(clipped(g)||g.height<40){
              localFailures.push({type:'mobile-action',requiredHeight:40,action});
            }
          }
        }
        if(/url\(/i.test(metrics.heroBefore||'')){
          localFailures.push({type:'hero-background-url',backgroundImage:metrics.heroBefore});
        }
        if(consoleErrors.length) localFailures.push({type:'console-errors',items:consoleErrors});
        if(pageErrors.length) localFailures.push({type:'page-errors',items:pageErrors});
        if(failedRequests.length) localFailures.push({type:'failed-requests',items:failedRequests});

        const shotName=`${route.replace('.html','')}-${w}x${h}.png`;
        await page.screenshot({path:path.join(shotsDir,shotName),fullPage:true});
        const record={
          productSha:PRODUCT_SHA,route,viewport:{width:w,height:h},
          bodyCopyMinFont:round(metrics.bodyMin),
          metadataLabelMinFont:round(metrics.metadataMin),
          bodyMinLineHeight:round(metrics.bodyMinLineHeight),
          contentTextMeasureMax:round(metrics.bodyMaxWidth),
          sectionContainerWidthMax:round(metrics.sectionMaxWidth),
          horizontalOverflow:metrics.document.scrollWidth>w+1,
          document:metrics.document,
          companyGeometry:metrics.company,
          addressGeometry:metrics.address,
          emailGeometry:metrics.emails,
          actionGeometry:metrics.actions,
          heroBackgroundImage:metrics.heroBefore,
          consoleErrors,pageErrors,failedRequests,
          bodyElements:metrics.body,
          metadataElements:metrics.metadata,
          screenshot:`screenshots/${shotName}`,
          failures:localFailures
        };
        records.push(record);
        for(const failure of localFailures) failures.push({route,viewport:{width:w,height:h},...failure});
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const summary={
    productSha:PRODUCT_SHA,
    cases:records.length,
    bodyCopyRule:'desktop/tablet >= 15px; mobile <=390px >= 16px',
    metadataRule:'reported separately; metadata is not classified as body copy',
    failures:failures.length,
    result:failures.length?'FAIL':'PASS',
    records
  };
  fs.writeFileSync(path.join(outDir,'semantic-policy-diagnostic.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({
    productSha:PRODUCT_SHA,
    cases:records.length,
    failures:failures.length,
    result:summary.result,
    caseMetrics:records.map(r=>({route:r.route,viewport:r.viewport,bodyCopyMinFont:r.bodyCopyMinFont,metadataLabelMinFont:r.metadataLabelMinFont,bodyMinLineHeight:r.bodyMinLineHeight,contentTextMeasureMax:r.contentTextMeasureMax,sectionContainerWidthMax:r.sectionContainerWidthMax,horizontalOverflow:r.horizontalOverflow,failures:r.failures.length}))
  },null,2));
  process.exit(failures.length?1:0);
})().catch(err=>{console.error(err);process.exit(2)});
