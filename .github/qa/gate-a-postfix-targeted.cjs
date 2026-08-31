const fs=require('fs');
const puppeteer=require('puppeteer-core');
const PRODUCT='ac633ec0e431668b000c105cb05bc81da93ebd2d';
const base='http://127.0.0.1:8000/';
const compact=[{name:'768x1024',width:768,height:1024},{name:'390x844',width:390,height:844},{name:'360x800',width:360,height:800}];
const filmVP=[{name:'1920x1080',width:1920,height:1080},{name:'1440x900',width:1440,height:900},...compact];
const hashVP=[{name:'1440x900',width:1440,height:900},...compact];
const families=[['petrochemical','Petrochemical Products'],['chemical','Chemical Products'],['energy-products','Energy & Hydrocarbon Products']];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rectObj=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
const out={productSha:PRODUCT,nav:{},film:{},hashes:{},hashchange:{},corporate:null,assertions:[],failures:[]};
const ok=(name,condition,detail)=>{out.assertions.push({name,pass:Boolean(condition),detail});if(!condition)out.failures.push({name,detail});};

async function newPage(browser,vp){const p=await browser.newPage();await p.setViewport({width:vp.width,height:vp.height,deviceScaleFactor:1});return p}
async function goto(p,url){const res=await p.goto(base+url,{waitUntil:'domcontentloaded',timeout:30000});await p.evaluate(()=>document.fonts?.ready||Promise.resolve());await sleep(220);return res}

(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=user-gesture-required']});
 fs.mkdirSync('gate-a-postfix/targeted',{recursive:true});

 // A-001: actual overlay geometry + keyboard interaction.
 for(const vp of compact){
   const p=await newPage(browser,vp);await goto(p,'index.html');
   await p.click('.menu-toggle');await sleep(180);
   const open=await p.evaluate(()=>{
     const n=document.querySelector('#primary-nav'),t=document.querySelector('.menu-toggle'),m=document.querySelector('main'),f=document.querySelector('footer');
     const r=e=>rectObj(e.getBoundingClientRect());
     return{viewport:{w:innerWidth,h:innerHeight},nav:r(n),navScrollHeight:n.scrollHeight,expanded:t.getAttribute('aria-expanded'),bodyOpen:document.body.classList.contains('nav-open'),links:[...n.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),rect:r(a)})),active:(document.activeElement?.textContent||document.activeElement?.getAttribute?.('aria-label')||'').trim(),mainInert:m?.inert??null,footerInert:f?.inert??null,headerBackdrop:getComputedStyle(document.querySelector('.site-header')).backdropFilter,navPosition:getComputedStyle(n).position,navOverflowY:getComputedStyle(n).overflowY};
   });
   await p.screenshot({path:`gate-a-postfix/targeted/nav-${vp.name}.png`});
   const focusForward=[];for(let i=0;i<9;i++){await p.keyboard.press('Tab');focusForward.push(await p.evaluate(()=>({tag:document.activeElement?.tagName||'',text:(document.activeElement?.textContent||document.activeElement?.getAttribute?.('aria-label')||'').trim(),inHeader:Boolean(document.activeElement?.closest?.('.site-header'))})))}
   const focusBackward=[];for(let i=0;i<9;i++){await p.keyboard.down('Shift');await p.keyboard.press('Tab');await p.keyboard.up('Shift');focusBackward.push(await p.evaluate(()=>({tag:document.activeElement?.tagName||'',text:(document.activeElement?.textContent||document.activeElement?.getAttribute?.('aria-label')||'').trim(),inHeader:Boolean(document.activeElement?.closest?.('.site-header'))})))}
   await p.keyboard.press('Escape');await sleep(120);
   const closed=await p.evaluate(()=>{const t=document.querySelector('.menu-toggle'),m=document.querySelector('main'),f=document.querySelector('footer');return{expanded:t.getAttribute('aria-expanded'),bodyOpen:document.body.classList.contains('nav-open'),active:(document.activeElement?.textContent||document.activeElement?.getAttribute?.('aria-label')||'').trim(),mainInert:m?.inert??null,footerInert:f?.inert??null}});
   out.nav[vp.name]={open,focusForward,focusBackward,closed};
   ok(`nav-${vp.name}-covers-viewport`,open.nav.top<=1&&open.nav.left<=1&&open.nav.width>=vp.width-2&&open.nav.bottom>=vp.height-1,open.nav);
   ok(`nav-${vp.name}-six-links`,open.links.length===6&&open.links.every(x=>x.rect.top>=open.nav.top-1&&x.rect.bottom<=Math.max(open.nav.bottom,open.nav.top+open.navScrollHeight)+1),open.links);
   ok(`nav-${vp.name}-open-state`,open.expanded==='true'&&open.bodyOpen&&open.mainInert===true&&open.footerInert===true,{expanded:open.expanded,bodyOpen:open.bodyOpen,mainInert:open.mainInert,footerInert:open.footerInert});
   ok(`nav-${vp.name}-keyboard-forward-trapped`,focusForward.every(x=>x.inHeader),focusForward);
   ok(`nav-${vp.name}-keyboard-backward-trapped`,focusBackward.every(x=>x.inHeader),focusBackward);
   ok(`nav-${vp.name}-escape-closes`,closed.expanded==='false'&&!closed.bodyOpen&&closed.mainInert===false&&closed.footerInert===false,closed);
   await p.close();
 }

 // A-002: exact five viewport film framing and controls/captions.
 for(const vp of filmVP){
   const p=await newPage(browser,vp);await goto(p,'index.html');
   await p.evaluate(async()=>{const v=document.getElementById('holding-film');if(v&&v.readyState<1)await new Promise(resolve=>{v.addEventListener('loadedmetadata',resolve,{once:true});setTimeout(resolve,4000)})});
   await sleep(120);
   const data=await p.evaluate(()=>{
     const v=document.getElementById('holding-film'),hero=document.querySelector('.hero-film-hero');
     const r=e=>rectObj(e.getBoundingClientRect()),cs=getComputedStyle(v);const iw=v.videoWidth||1280,ih=v.videoHeight||720,box=v.getBoundingClientRect();
     let visibleX=1,visibleY=1,renderW=box.width,renderH=box.height;if(cs.objectFit==='cover'){const scale=Math.max(box.width/iw,box.height/ih);renderW=iw*scale;renderH=ih*scale;visibleX=Math.min(1,box.width/renderW);visibleY=Math.min(1,box.height/renderH)}else if(cs.objectFit==='contain'){const scale=Math.min(box.width/iw,box.height/ih);renderW=iw*scale;renderH=ih*scale;}
     const controls={};for(const [k,sel] of Object.entries({sound:'[data-film-sound]',play:'[data-film-play]',progress:'[data-film-progress]',time:'[data-film-time]',mute:'[data-film-mute]',volume:'[data-film-volume]',captions:'[data-film-captions]',fullscreen:'[data-film-fullscreen]',replay:'[data-film-replay]'})){const e=document.querySelector(sel);if(!e){controls[k]=null;continue}const s=getComputedStyle(e),rr=e.getBoundingClientRect();controls[k]={hidden:e.hidden,display:s.display,visibility:s.visibility,rect:r(e),inViewport:rr.left>=-1&&rr.right<=innerWidth+1&&rr.top>=-1&&rr.bottom<=innerHeight+1}}
     return{viewport:{w:innerWidth,h:innerHeight},intrinsic:{w:iw,h:ih},video:r(v),hero:r(hero),objectFit:cs.objectFit,objectPosition:cs.objectPosition,visibleSource:{x:visibleX,y:visibleY},rendered:{w:renderW,h:renderH},controls,captions:{trackCount:v.textTracks?.length||0,modes:v.textTracks?[...v.textTracks].map(t=>t.mode):[],trackElements:[...v.querySelectorAll('track')].map(t=>({kind:t.kind,src:t.getAttribute('src'),default:t.default}))}};
   });
   out.film[vp.name]=data;await p.screenshot({path:`gate-a-postfix/targeted/film-${vp.name}.png`});
   const portrait=vp.width<=980&&vp.height>vp.width;
   ok(`film-${vp.name}-fit`,portrait?data.objectFit==='contain':data.objectFit==='cover',{fit:data.objectFit,portrait});
   if(portrait)ok(`film-${vp.name}-full-source`,data.visibleSource.x>=.999&&data.visibleSource.y>=.999,data.visibleSource);
   ok(`film-${vp.name}-intrinsic`,data.intrinsic.w===1280&&data.intrinsic.h===720,data.intrinsic);
   for(const key of ['play','progress','time','mute','volume','captions','fullscreen','replay'])ok(`film-${vp.name}-${key}-available`,Boolean(data.controls[key])&&!data.controls[key].hidden&&data.controls[key].display!=='none'&&data.controls[key].visibility!=='hidden'&&data.controls[key].inViewport,data.controls[key]);
   ok(`film-${vp.name}-captions`,data.captions.trackCount>=1&&data.captions.trackElements.some(t=>t.kind==='captions'&&/unique-holding-caption\.vtt$/.test(t.src||'')),data.captions);
   await p.close();
 }

 // A-003: every direct family URL at all four mandated viewports.
 for(const [id,heading] of families){out.hashes[id]={};for(const vp of hashVP){const p=await newPage(browser,vp);await goto(p,`products.html#${id}`);await sleep(260);const data=await p.evaluate(id=>{const t=document.getElementById(id),h=t?.querySelector('h2'),head=document.querySelector('.site-header');const r=e=>e?rectObj(e.getBoundingClientRect()):null;return{hash:location.hash,target:r(t),heading:r(h),headingText:h?.textContent.trim()||'',header:r(head),scrollY,visible:t?getComputedStyle(t).visibility:null}},id);out.hashes[id][vp.name]=data;await p.screenshot({path:`gate-a-postfix/targeted/hash-${id}-${vp.name}.png`});const headerH=data.header?.height||0;ok(`hash-${id}-${vp.name}-target`,Boolean(data.target)&&data.headingText===heading,data);ok(`hash-${id}-${vp.name}-aligned`,Boolean(data.target)&&data.target.top>=headerH+8&&data.target.top<=headerH+45&&data.heading&&data.heading.top>=headerH+8&&data.heading.top<vp.height*.45,data);await p.close();}}

 // Explicit later hashchange behavior at compact size.
 {const vp={name:'390x844',width:390,height:844},p=await newPage(browser,vp);await goto(p,'products.html');out.hashchange[vp.name]=[];for(const [id,heading] of families){await p.evaluate(id=>{location.hash=id},id);await sleep(220);const d=await p.evaluate(id=>{const t=document.getElementById(id),h=t?.querySelector('h2'),head=document.querySelector('.site-header');const r=e=>e?rectObj(e.getBoundingClientRect()):null;return{id,hash:location.hash,target:r(t),heading:r(h),headingText:h?.textContent.trim()||'',header:r(head)}},id);out.hashchange[vp.name].push(d);ok(`hashchange-${id}`,d.headingText===heading&&d.target.top>=(d.header?.height||0)+8&&d.target.top<=(d.header?.height||0)+45,d)}await p.close()}

 // A-004: exact browser-visible href/target/rel.
 {const p=await newPage(browser,{name:'1440x900',width:1440,height:900});await goto(p,'corporate.html');out.corporate=await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(x=>x.textContent.trim()==='Public sample ↗');return a?{href:a.href,rawHref:a.getAttribute('href'),target:a.target,rel:a.rel,text:a.textContent.trim()}:null});ok('corporate-public-sample',out.corporate?.rawHref==='https://evidenceaxis.com/sample-report/'&&out.corporate?.target==='_blank'&&out.corporate?.rel.split(/\s+/).includes('noopener'),out.corporate);await p.screenshot({path:'gate-a-postfix/targeted/corporate-sample.png',fullPage:true});await p.close()}

 fs.writeFileSync('gate-a-postfix/targeted/targeted-report.json',JSON.stringify(out,null,2));console.log(JSON.stringify({productSha:PRODUCT,assertions:out.assertions.length,failures:out.failures},null,2));await browser.close();if(out.failures.length)process.exit(2);
})().catch(e=>{console.error(e);process.exit(1)});
