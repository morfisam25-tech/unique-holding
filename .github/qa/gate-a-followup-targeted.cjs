const fs=require('fs');
const puppeteer=require('puppeteer-core');
const PRODUCT='bfdaeefcce715ff36bf8f9838b6401ffcc477b9c';
const base='http://127.0.0.1:8000/';
const compact=[{name:'768x1024',width:768,height:1024},{name:'390x844',width:390,height:844},{name:'360x800',width:360,height:800}];
const filmVP=[{name:'1920x1080',width:1920,height:1080},{name:'1440x900',width:1440,height:900},...compact];
const hashVP=[{name:'1440x900',width:1440,height:900},...compact];
const families=[['petrochemical','Petrochemical Products'],['chemical','Chemical Products'],['energy-products','Energy & Hydrocarbon Products']];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const intersects=(a,b)=>Boolean(a&&b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);
const out={productSha:PRODUCT,nav:{},film:{},hashes:{},hashchange:[],corporate:null,assertions:[],failures:[]};
const ok=(name,condition,detail)=>{out.assertions.push({name,pass:Boolean(condition),detail});if(!condition)out.failures.push({name,detail});};
async function newPage(browser,vp){const p=await browser.newPage();await p.setViewport({width:vp.width,height:vp.height,deviceScaleFactor:1});return p}
async function goto(p,url){const res=await p.goto(base+url,{waitUntil:'load',timeout:30000});await p.evaluate(()=>document.fonts?.ready||Promise.resolve());await sleep(80);return res}

(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=user-gesture-required']});
 fs.mkdirSync('gate-a-followup/targeted',{recursive:true});

 // Locked A-001: steady-state compact navigation after transition completion.
 for(const vp of compact){
   const p=await newPage(browser,vp);await goto(p,'index.html');await p.click('.menu-toggle');await sleep(450);
   const open=await p.evaluate(()=>{const box=e=>{const q=e.getBoundingClientRect();return{left:q.left,top:q.top,right:q.right,bottom:q.bottom,width:q.width,height:q.height}};const n=document.querySelector('#primary-nav'),t=document.querySelector('.menu-toggle'),m=document.querySelector('main'),f=document.querySelector('footer');return{viewport:{w:innerWidth,h:innerHeight},nav:box(n),navScrollHeight:n.scrollHeight,expanded:t.getAttribute('aria-expanded'),bodyOpen:document.body.classList.contains('nav-open'),links:[...n.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),rect:box(a)})),mainInert:m?.inert??null,footerInert:f?.inert??null,navPosition:getComputedStyle(n).position,navOverflowY:getComputedStyle(n).overflowY,navTransform:getComputedStyle(n).transform,headerBackdrop:getComputedStyle(document.querySelector('.site-header')).backdropFilter};});
   await p.screenshot({path:`gate-a-followup/targeted/nav-${vp.name}.png`});
   const fwd=[];for(let i=0;i<9;i++){await p.keyboard.press('Tab');fwd.push(await p.evaluate(()=>Boolean(document.activeElement?.closest?.('.site-header'))))}
   const back=[];for(let i=0;i<9;i++){await p.keyboard.down('Shift');await p.keyboard.press('Tab');await p.keyboard.up('Shift');back.push(await p.evaluate(()=>Boolean(document.activeElement?.closest?.('.site-header'))))}
   await p.keyboard.press('Escape');await sleep(120);
   const closed=await p.evaluate(()=>{const t=document.querySelector('.menu-toggle'),m=document.querySelector('main'),f=document.querySelector('footer');return{expanded:t.getAttribute('aria-expanded'),bodyOpen:document.body.classList.contains('nav-open'),mainInert:m?.inert??null,footerInert:f?.inert??null,focus:(document.activeElement?.getAttribute?.('aria-label')||document.activeElement?.textContent||'').trim()}});
   out.nav[vp.name]={open,forwardTrap:fwd,backwardTrap:back,closed};
   ok(`nav-${vp.name}-full-viewport`,Math.abs(open.nav.left)<=1&&Math.abs(open.nav.top)<=1&&Math.abs(open.nav.width-vp.width)<=1&&Math.abs(open.nav.height-vp.height)<=1,open.nav);
   ok(`nav-${vp.name}-six-routes`,open.links.length===6&&open.links.every(x=>x.rect.left>=open.nav.left-1&&x.rect.right<=open.nav.right+1&&x.rect.top>=open.nav.top-1&&x.rect.bottom<=open.nav.bottom+1),open.links);
   ok(`nav-${vp.name}-inert`,open.mainInert===true&&open.footerInert===true,{main:open.mainInert,footer:open.footerInert});
   ok(`nav-${vp.name}-tab-trap`,fwd.every(Boolean),fwd);
   ok(`nav-${vp.name}-shift-tab-trap`,back.every(Boolean),back);
   ok(`nav-${vp.name}-escape`,closed.expanded==='false'&&!closed.bodyOpen&&closed.mainInert===false&&closed.footerInert===false&&/Open navigation/i.test(closed.focus),closed);
   await p.close();
 }

 // A-002/PF-001: live cue, true 16:9 portrait video box and control separation.
 for(const vp of filmVP){
   const p=await newPage(browser,vp);await goto(p,'index.html');
   await p.evaluate(async()=>{const v=document.getElementById('holding-film');if(v.readyState<1)await new Promise(resolve=>{v.addEventListener('loadedmetadata',resolve,{once:true});setTimeout(resolve,4000)});const t=v.textTracks?.[0];if(t)t.mode='showing';v.pause();v.currentTime=5;await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};v.addEventListener('seeked',finish,{once:true});setTimeout(finish,1500)});if(t)t.mode='showing';});
   await sleep(180);
   const data=await p.evaluate(()=>{const box=e=>{const q=e.getBoundingClientRect();return{left:q.left,top:q.top,right:q.right,bottom:q.bottom,width:q.width,height:q.height}};const v=document.getElementById('holding-film'),hero=document.querySelector('.hero-film-hero'),cs=getComputedStyle(v),vr=v.getBoundingClientRect();const iw=v.videoWidth||1280,ih=v.videoHeight||720;let visibleX=1,visibleY=1,renderW=vr.width,renderH=vr.height;if(cs.objectFit==='cover'){const scale=Math.max(vr.width/iw,vr.height/ih);renderW=iw*scale;renderH=ih*scale;visibleX=Math.min(1,vr.width/renderW);visibleY=Math.min(1,vr.height/renderH)}else if(cs.objectFit==='contain'){const scale=Math.min(vr.width/iw,vr.height/ih);renderW=iw*scale;renderH=ih*scale;}const controls={};for(const [k,sel] of Object.entries({sound:'[data-film-sound]',play:'[data-film-play]',progress:'[data-film-progress]',time:'[data-film-time]',mute:'[data-film-mute]',volume:'[data-film-volume]',captions:'[data-film-captions]',fullscreen:'[data-film-fullscreen]',replay:'[data-film-replay]'})){const e=document.querySelector(sel);const s=e?getComputedStyle(e):null;controls[k]=e?{hidden:e.hidden,display:s.display,visibility:s.visibility,rect:box(e)}:null}const track=v.textTracks?.[0];const active=track?.activeCues?[...track.activeCues].map(c=>({text:c.text,line:c.line,position:c.position,size:c.size,align:c.align,startTime:c.startTime,endTime:c.endTime})):[];return{viewport:{w:innerWidth,h:innerHeight},video:box(v),hero:box(hero),intrinsic:{w:iw,h:ih},objectFit:cs.objectFit,objectPosition:cs.objectPosition,renderedVisibleFilm:{w:renderW,h:renderH},sourceVisiblePct:{x:visibleX*100,y:visibleY*100},trackMode:track?.mode||null,activeCues:active,controls};});
   const visibleControls=Object.entries(data.controls).filter(([,c])=>c&&!c.hidden&&c.display!=='none'&&c.visibility!=='hidden');
   const videoIntersections=visibleControls.filter(([,c])=>intersects(data.video,c.rect)).map(([k])=>k);
   data.captionGeometry={containmentBox:data.video,activeCue:data.activeCues[0]||null};
   data.captionControlIntersectionCount=videoIntersections.length;
   data.controlsIntersectingCaptionContainment=videoIntersections;
   out.film[vp.name]=data;
   await p.screenshot({path:`gate-a-followup/targeted/film-${vp.name}.png`});
   const portrait=vp.width<=980&&vp.height>vp.width;
   if(portrait){
     const ratio=data.video.width/data.video.height;
     const centered=Math.abs((data.video.top+data.video.height/2)-(data.hero.top+data.hero.height/2))<=2;
     ok(`film-${vp.name}-portrait-fit`,data.objectFit==='contain',{fit:data.objectFit});
     ok(`film-${vp.name}-video-box-16x9`,Math.abs(ratio-(16/9))<0.01,{ratio,video:data.video});
     ok(`film-${vp.name}-centered`,centered,{video:data.video,hero:data.hero});
     ok(`film-${vp.name}-full-source`,data.sourceVisiblePct.x>=99.9&&data.sourceVisiblePct.y>=99.9,data.sourceVisiblePct);
     ok(`film-${vp.name}-live-caption`,data.trackMode==='showing'&&data.activeCues.length>0&&/Technology changes how businesses compete\./.test(data.activeCues[0].text),{mode:data.trackMode,active:data.activeCues});
     ok(`film-${vp.name}-caption-control-intersections-zero`,videoIntersections.length===0,{video:data.video,intersections:videoIntersections,controls:data.controls});
   }else{
     ok(`film-${vp.name}-desktop-cover`,data.objectFit==='cover',{fit:data.objectFit,video:data.video,hero:data.hero});
     ok(`film-${vp.name}-desktop-live-caption`,data.trackMode==='showing'&&data.activeCues.length>0,{mode:data.trackMode,active:data.activeCues});
   }
   for(const key of ['play','progress','time','mute','volume','captions','fullscreen','replay']){const c=data.controls[key];ok(`film-${vp.name}-${key}-viewport`,Boolean(c)&&!c.hidden&&c.display!=='none'&&c.visibility!=='hidden'&&c.rect.left>=-1&&c.rect.right<=vp.width+1&&c.rect.top>=-1&&c.rect.bottom<=vp.height+1,c)}
   await p.close();
 }

 // A-003: direct load of all three static anchors at all four exact viewports.
 for(const [id,headingText] of families){out.hashes[id]={};for(const vp of hashVP){const p=await newPage(browser,vp);await goto(p,`products.html#${id}`);const data=await p.evaluate(id=>{const box=e=>{if(!e)return null;const q=e.getBoundingClientRect();return{left:q.left,top:q.top,right:q.right,bottom:q.bottom,width:q.width,height:q.height}};const t=document.getElementById(id),h=t?.querySelector('h2'),head=document.querySelector('.site-header');return{hash:location.hash,target:box(t),heading:box(h),headingText:h?.textContent.trim()||'',header:box(head),scrollY,hidden:t?.hidden??null}},id);out.hashes[id][vp.name]=data;await p.screenshot({path:`gate-a-followup/targeted/hash-${id}-${vp.name}.png`});const hh=data.header?.height||0;ok(`hash-${id}-${vp.name}-static-target`,Boolean(data.target)&&data.headingText===headingText&&!data.hidden,data);ok(`hash-${id}-${vp.name}-header-safe`,Boolean(data.heading)&&data.heading.top>=hh+8&&data.heading.top<=hh+60&&data.heading.bottom<vp.height*.45,data);await p.close();}}

 // Same-page native hash transitions, including return to first family.
 {const p=await newPage(browser,{name:'390x844',width:390,height:844});await goto(p,'products.html');for(const id of ['petrochemical','chemical','energy-products','petrochemical']){await p.evaluate(id=>{location.hash=id},id);await sleep(100);const data=await p.evaluate(id=>{const box=e=>{if(!e)return null;const q=e.getBoundingClientRect();return{left:q.left,top:q.top,right:q.right,bottom:q.bottom,width:q.width,height:q.height}};const t=document.getElementById(id),h=t?.querySelector('h2'),head=document.querySelector('.site-header');return{id,hash:location.hash,target:box(t),heading:box(h),header:box(head),headingText:h?.textContent.trim()||''}},id);out.hashchange.push(data);const hh=data.header?.height||0;ok(`hashchange-${id}-${out.hashchange.length}`,data.hash==='#'+id&&data.heading&&data.heading.top>=hh+8&&data.heading.top<=hh+60,data)}await p.close()}

 // Locked A-004.
 {const p=await newPage(browser,{name:'1440x900',width:1440,height:900});await goto(p,'corporate.html');out.corporate=await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(x=>x.textContent.trim()==='Public sample ↗');return a?{href:a.href,rawHref:a.getAttribute('href'),target:a.target,rel:a.rel,text:a.textContent.trim()}:null});ok('corporate-public-sample',out.corporate?.rawHref==='https://evidenceaxis.com/sample-report/'&&out.corporate?.target==='_blank'&&out.corporate?.rel.split(/\s+/).includes('noopener'),out.corporate);await p.screenshot({path:'gate-a-followup/targeted/corporate-sample.png',fullPage:true});await p.close()}

 fs.writeFileSync('gate-a-followup/targeted/targeted-report.json',JSON.stringify(out,null,2));console.log(JSON.stringify({productSha:PRODUCT,assertions:out.assertions.length,failures:out.failures},null,2));await browser.close();if(out.failures.length)process.exit(2);
})().catch(e=>{console.error(e);process.exit(1)});
