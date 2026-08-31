const fs=require('fs');
const puppeteer=require('puppeteer-core');
const SHA='7568f4d2215f2eeb2a09d0e5b60182ff19c80f96';
const base='http://127.0.0.1:8000/';
const outDir='phase09-review';
const vps=[
  {name:'1920x1080',width:1920,height:1080},
  {name:'1440x900',width:1440,height:900},
  {name:'768x1024',width:768,height:1024},
  {name:'390x844',width:390,height:844},
  {name:'360x800',width:360,height:800}
];
const compact=new Set(['768x1024','390x844','360x800']);
const fragments=['petrochemical','chemical','energy-products'];
const searchCases=[
  {name:'MEG',query:'MEG',count:1,slugs:['meg']},
  {name:'HDPE',query:'HDPE',count:1,slugs:['hdpe']},
  {name:'Urea',query:'Urea',count:3,slugs:['urea-agri-prilled','urea-agri-granular','urea-industrial']},
  {name:'Bitumen',query:'Bitumen',count:1,slugs:['bitumen']},
  {name:'no-results',query:'zz-no-such-product-zz',count:0,slugs:[]}
];
const smokeRoutes=['index.html','corporate.html','energy.html','products.html','product.html','urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html','sales.html','technology.html','evidence-axis.html','ventures.html','contact.html','privacy.html','legal.html','404.html'];
const routeCases=[
  {name:'core-urea',url:'urea-46.html',kind:'reference',expect:'Urea 46'},
  {name:'core-caustic',url:'caustic-soda-solid.html',kind:'reference',expect:'Caustic Soda Solid'},
  {name:'core-sodium',url:'sodium-sulphate-anhydrous.html',kind:'reference',expect:'Sodium Sulphate Anhydrous'},
  {name:'inquiry-meg',url:'product.html?slug=meg',kind:'inquiry',expect:'Monoethylene Glycol'},
  {name:'inquiry-caustic',url:'product.html?slug=caustic-soda',kind:'inquiry',expect:'Caustic Soda / Sodium Hydroxide'},
  {name:'inquiry-bitumen',url:'product.html?slug=bitumen',kind:'inquiry',expect:'Petroleum Bitumen'}
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(`${outDir}/screenshots/products`,{recursive:true});
fs.mkdirSync(`${outDir}/screenshots/fragments`,{recursive:true});
fs.mkdirSync(`${outDir}/screenshots/search`,{recursive:true});
fs.mkdirSync(`${outDir}/screenshots/routes`,{recursive:true});
fs.mkdirSync(`${outDir}/screenshots/smoke`,{recursive:true});
fs.mkdirSync(`${outDir}/reports`,{recursive:true});
const report={sha:SHA,failures:[],products:[],fragments:[],search:[],routes:[],smoke:[],accessibility:{},routingAudit:{},summary:{}};
function fail(area,detail){report.failures.push({area,detail});}
async function preparePage(browser,vp){
  const p=await browser.newPage();
  await p.setViewport({width:vp.width,height:vp.height,deviceScaleFactor:1});
  const errs={console:[],page:[],request:[]};
  p.on('console',m=>{if(m.type()==='error')errs.console.push(m.text())});
  p.on('pageerror',e=>errs.page.push(String(e)));
  p.on('requestfailed',r=>errs.request.push({url:r.url(),error:r.failure()?.errorText||''}));
  return{p,errs};
}
async function loadImages(p){
  await p.evaluate(async()=>{
    const imgs=[...document.images];
    for(const img of imgs){
      img.scrollIntoView({block:'center'});
      if(!img.complete||img.naturalWidth<1){
        await new Promise(resolve=>{
          let done=false;const end=()=>{if(done)return;done=true;resolve()};
          img.addEventListener('load',end,{once:true});img.addEventListener('error',end,{once:true});setTimeout(end,2500);
        });
      }
    }
    scrollTo(0,0);
  });
}
async function goto(p,url){
  const res=await p.goto(base+url,{waitUntil:'load',timeout:30000});
  await p.evaluate(()=>document.fonts?.ready||Promise.resolve());
  return res?.status()??null;
}
async function commonState(p){
  return p.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    scrollWidth:document.documentElement.scrollWidth,
    width:innerWidth,
    header:!!document.querySelector('.site-header[data-header]'),
    footer:!!document.querySelector('footer.site-footer'),
    brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth<1).map(i=>i.getAttribute('src')),
    duplicateIds:(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))]})()
  }));
}
(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=user-gesture-required']});

  // Static/crawler baseline with JS disabled: catalog must exist before enhancement.
  {
    const p=await browser.newPage();await p.setJavaScriptEnabled(false);await p.setViewport({width:390,height:844});await p.goto(base+'products.html',{waitUntil:'load'});
    const s=await p.evaluate(()=>({core:document.querySelectorAll('[data-product-kind="core"]').length,inquiry:document.querySelectorAll('[data-product-kind="inquiry"]').length,anchors:['petrochemical','chemical','energy-products'].map(id=>!!document.getElementById(id)),search:!!document.getElementById('product-search')}));
    report.accessibility.staticNoJs=s;
    if(s.core!==3||s.inquiry!==62||s.anchors.some(x=>!x)||!s.search)fail('static-nojs',s);
    await p.close();
  }

  // Full product-index QA at all five exact viewports.
  for(const vp of vps){
    const {p,errs}=await preparePage(browser,vp);const status=await goto(p,'products.html');await loadImages(p);const s=await p.evaluate(()=>({
      core:document.querySelectorAll('[data-product-kind="core"]').length,
      inquiry:document.querySelectorAll('[data-product-kind="inquiry"]').length,
      categories:document.querySelectorAll('[data-catalog-category]').length,
      familyNav:document.querySelectorAll('.product-family-nav a').length,
      iaLevels:document.querySelectorAll('.product-ia-path li').length,
      searchWidth:document.getElementById('product-search').getBoundingClientRect().width,
      searchHeight:document.getElementById('product-search').getBoundingClientRect().height,
      coreHrefs:[...document.querySelectorAll('[data-product-kind="core"]')].map(a=>a.getAttribute('href')),
      inquiryDestinations:[...document.querySelectorAll('[data-product-kind="inquiry"]')].every(a=>a.dataset.destination==='inquiry-detail'),
      focusableHidden:[...document.querySelectorAll('[data-product-kind="inquiry"][hidden]')].filter(a=>a.matches(':focusable')).length
    }));
    const common=await commonState(p);const row={vp:vp.name,status,...s,...common,errors:errs};report.products.push(row);
    if(status!==200||s.core!==3||s.inquiry!==62||s.categories!==3||s.familyNav!==3||s.iaLevels!==4||s.searchWidth<220||s.searchHeight<42||common.overflow||common.duplicateIds.length||errs.console.length||errs.page.length||errs.request.length)fail('products-'+vp.name,row);
    const expectedCore=['urea-46.html','caustic-soda-solid.html','sodium-sulphate-anhydrous.html'];if(JSON.stringify(s.coreHrefs)!==JSON.stringify(expectedCore)||!s.inquiryDestinations)fail('routing-index-'+vp.name,s);
    await p.screenshot({path:`${outDir}/screenshots/products/products-${vp.name}.png`,fullPage:true});

    if(compact.has(vp.name)){
      const menu=await p.$('.menu-toggle');await menu.click();await sleep(420);
      const nav=await p.evaluate(()=>{const n=document.getElementById('primary-nav'),r=n.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height,links:[...n.querySelectorAll('a')].map(a=>{const q=a.getBoundingClientRect();return{left:q.left,right:q.right,top:q.top,bottom:q.bottom}}),inertMain:document.querySelector('main')?.inert===true,inertFooter:document.querySelector('footer')?.inert===true,expanded:document.querySelector('.menu-toggle')?.getAttribute('aria-expanded')}});
      if(Math.abs(nav.left)>1||Math.abs(nav.top)>1||Math.abs(nav.width-vp.width)>1||Math.abs(nav.height-vp.height)>1||nav.links.length!==6||nav.links.some(x=>x.left<0||x.right>vp.width+1||x.top<0||x.bottom>vp.height+1)||!nav.inertMain||!nav.inertFooter||nav.expanded!=='true')fail('compact-nav-'+vp.name,nav);
      await p.keyboard.press('Escape');await sleep(100);const closed=await p.evaluate(()=>({expanded:document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'),active:document.activeElement?.className||''}));if(closed.expanded!=='false'||!String(closed.active).includes('menu-toggle'))fail('compact-nav-close-'+vp.name,closed);
    }
    await p.close();
  }

  // Native fragment direct-load QA: every fragment at all five viewports, numeric stability.
  for(const frag of fragments){for(const vp of vps){
    const {p,errs}=await preparePage(browser,vp);const status=await goto(p,`products.html#${frag}`);await sleep(80);
    const sample=async()=>p.evaluate(id=>{const target=document.getElementById(id),h=document.querySelector('.site-header'),r=target?.getBoundingClientRect();return{top:r?.top??null,headerBottom:h?.getBoundingClientRect().bottom??null,height:document.documentElement.scrollHeight,hash:location.hash}},frag);
    const a=await sample();await sleep(500);const b=await sample();await sleep(1000);const c=await sample();
    const common=await commonState(p);const row={frag,vp:vp.name,status,a,b,c,...common,errors:errs};report.fragments.push(row);
    const stable=a.top!==null&&Math.abs(a.top-b.top)<=1&&Math.abs(b.top-c.top)<=1&&a.height===b.height&&b.height===c.height;
    const visible=a.top!==null&&a.headerBottom!==null&&a.top>=a.headerBottom-1&&a.top<vp.height*0.45;
    if(status!==200||!stable||!visible||common.overflow||common.duplicateIds.length||errs.console.length||errs.page.length||errs.request.length)fail(`fragment-${frag}-${vp.name}`,row);
    await p.screenshot({path:`${outDir}/screenshots/fragments/${frag}-${vp.name}.png`,fullPage:false});await p.close();
  }}

  // Search/filter QA at all five viewports.
  for(const vp of vps){
    const {p,errs}=await preparePage(browser,vp);await goto(p,'products.html');
    for(const tc of searchCases){
      await p.focus('#product-search');await p.evaluate(()=>{const i=document.getElementById('product-search');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))});
      await p.type('#product-search',tc.query);await sleep(40);
      const s=await p.evaluate(()=>({visible:[...document.querySelectorAll('[data-product-kind="inquiry"]:not([hidden])')].map(a=>a.dataset.slug),count:document.getElementById('product-count').textContent,emptyHidden:document.getElementById('catalog-empty').hidden,visibleCategories:document.querySelectorAll('[data-catalog-category]:not([hidden])').length,hiddenFocusable:[...document.querySelectorAll('[data-product-kind="inquiry"][hidden]')].filter(a=>a.tabIndex>=0).length}));
      const row={vp:vp.name,case:tc.name,...s};report.search.push(row);const got=[...s.visible].sort(),exp=[...tc.slugs].sort();if(got.length!==tc.count||JSON.stringify(got)!==JSON.stringify(exp)||s.hiddenFocusable!==0||(tc.count===0?s.emptyHidden:s.emptyHidden===false))fail(`search-${tc.name}-${vp.name}`,row);
      if(tc.name==='Urea'||tc.name==='no-results')await p.screenshot({path:`${outDir}/screenshots/search/${tc.name}-${vp.name}.png`,fullPage:false});
    }
    await p.click('#product-search-clear');await sleep(30);const clear=await p.evaluate(()=>({value:document.getElementById('product-search').value,visible:document.querySelectorAll('[data-product-kind="inquiry"]:not([hidden])').length,categories:document.querySelectorAll('[data-catalog-category]:not([hidden])').length,count:document.getElementById('product-count').textContent,emptyHidden:document.getElementById('catalog-empty').hidden,focused:document.activeElement?.id}));
    report.search.push({vp:vp.name,case:'clear',...clear});if(clear.value!==''||clear.visible!==62||clear.categories!==3||!clear.emptyHidden||clear.focused!=='product-search')fail('search-clear-'+vp.name,clear);
    if(errs.console.length||errs.page.length||errs.request.length)fail('search-errors-'+vp.name,errs);await p.close();
  }

  // Full route classification audit from Products DOM.
  {
    const p=await browser.newPage();await p.goto(base+'products.html',{waitUntil:'load'});report.routingAudit=await p.evaluate(()=>({
      reference:[...document.querySelectorAll('[data-destination="reference-detail"]')].map(a=>({slug:a.dataset.slug,href:a.getAttribute('href')})),
      inquiry:[...document.querySelectorAll('[data-destination="inquiry-detail"]')].map(a=>({slug:a.dataset.slug,href:a.getAttribute('href')})),
      industrialSales:[...document.querySelectorAll('a[href="sales.html"]')].length,
      invalid:[...document.querySelectorAll('[data-product-kind]')].filter(a=>!['reference-detail','inquiry-detail'].includes(a.dataset.destination)).map(a=>a.dataset.slug)
    }));
    if(report.routingAudit.reference.length!==3||report.routingAudit.inquiry.length!==62||report.routingAudit.invalid.length)fail('routing-audit',report.routingAudit);await p.close();
  }

  // Representative static-reference and inquiry detail routes at desktop/mobile.
  for(const tc of routeCases){for(const vp of [vps[1],vps[3]]){
    const {p,errs}=await preparePage(browser,vp);const status=await goto(p,tc.url);await loadImages(p);const s=await p.evaluate(kind=>({title:document.querySelector('h1')?.textContent.trim()||'',breadcrumb:!!document.querySelector('.detail-breadcrumb'),context:!!document.querySelector('.product-route-context'),routeKind:document.body.dataset.productRoute||'',cta:[...document.querySelectorAll('.detail-cta a')].map(a=>a.textContent.trim()),overflow:document.documentElement.scrollWidth>innerWidth+1,duplicateIds:(()=>{const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))]})()}),tc.kind);
    const row={...tc,vp:vp.name,status,...s,errors:errs};report.routes.push(row);
    if(status!==200||!s.title.includes(tc.expect)||s.overflow||s.duplicateIds.length||errs.console.length||errs.page.length||errs.request.length)fail(`route-${tc.name}-${vp.name}`,row);
    if(tc.kind==='inquiry'&&(!s.breadcrumb||!s.context||s.routeKind!=='inquiry-detail'||!s.cta.includes('Start commercial inquiry')))fail(`route-context-${tc.name}-${vp.name}`,row);
    await p.screenshot({path:`${outDir}/screenshots/routes/${tc.name}-${vp.name}.png`,fullPage:false});await p.close();
  }}

  // Compatibility: generic core slugs must resolve to dedicated reference routes.
  for(const [slug,path] of [['urea-46','urea-46.html'],['caustic-soda-solid','caustic-soda-solid.html'],['sodium-sulphate-anhydrous','sodium-sulphate-anhydrous.html']]){
    const p=await browser.newPage();await p.goto(base+'product.html?slug='+slug,{waitUntil:'load'});await sleep(100);const pathname=await p.evaluate(()=>location.pathname);if(!pathname.endsWith('/'+path))fail('core-compat-redirect-'+slug,{pathname,path});await p.close();
  }

  // Lightweight site-wide smoke, all 16 routes at 1440x900 and 390x844.
  for(const vp of [vps[1],vps[3]]){for(const route of smokeRoutes){
    const {p,errs}=await preparePage(browser,vp);const status=await goto(p,route);await loadImages(p);const s=await commonState(p);const visibleMain=await p.evaluate(()=>{const m=document.querySelector('main'),r=m?.getBoundingClientRect();return !!m&&r.width>0&&r.height>20});const row={route,vp:vp.name,status,...s,visibleMain,errors:errs};report.smoke.push(row);
    if(status!==200||!s.header||!s.footer||!visibleMain||s.overflow||s.brokenImages.length||s.duplicateIds.length||errs.console.length||errs.page.length||errs.request.length)fail(`smoke-${route}-${vp.name}`,row);
    await p.screenshot({path:`${outDir}/screenshots/smoke/${route.replace('.html','')}-${vp.name}.png`,fullPage:false});await p.close();
  }}

  report.summary={
    exactViewports:vps.length,
    productIndexCases:report.products.length,
    fragmentCases:report.fragments.length,
    searchCases:report.search.length,
    representativeRouteCases:report.routes.length,
    smokeCases:report.smoke.length,
    routing:{reference:report.routingAudit.reference?.length||0,inquiry:report.routingAudit.inquiry?.length||0,invalid:report.routingAudit.invalid?.length||0},
    failures:report.failures.length
  };
  fs.writeFileSync(`${outDir}/reports/browser-report.json`,JSON.stringify(report,null,2));
  fs.writeFileSync(`${outDir}/reports/release-blocker.json`,JSON.stringify({id:'RELEASE-BLOCKER-HTTPS-001',status:'OPEN',note:'Custom domain can display Not Secure on a physical phone. Cause was not investigated or modified in Phase 09. Must be investigated and closed before production release / Phase 22.'},null,2));
  console.log(JSON.stringify(report.summary,null,2));
  if(report.failures.length)console.error(JSON.stringify(report.failures,null,2));
  await browser.close();
  if(report.failures.length)process.exit(2);
})().catch(e=>{console.error(e);process.exit(1)});
