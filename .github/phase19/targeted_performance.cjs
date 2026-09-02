const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=process.env.PHASE19_PERF_OUT||'/tmp/phase19-perf-diag';
const beforeBase=process.env.PHASE19_BEFORE_BASE||'http://127.0.0.1:8000/';
const afterBase=process.env.PHASE19_AFTER_BASE||'http://127.0.0.1:8001/';
const ROUTE=process.env.PHASE19_PERF_ROUTE||'contact.html';
const WIDTH=Number(process.env.PHASE19_PERF_WIDTH||390);
const HEIGHT=Number(process.env.PHASE19_PERF_HEIGHT||844);
const REPS=5;
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2};
const sorted=a=>[...a].sort((x,y)=>x-y);
const sameNums=(a,b)=>JSON.stringify(sorted(a))===JSON.stringify(sorted(b));
const safeName=s=>s.replace(/[^a-z0-9._-]+/gi,'-');
const normalize=(u,base)=>u.startsWith(base)?`LOCAL/${u.slice(base.length)}`:u;
const externalHost=(u,base)=>{if(u.startsWith(base))return null;try{return new URL(u).host}catch{return 'INVALID-URL'}};
async function run(browser,base,label,rep){
  const ctx=await browser.createBrowserContext();
  const page=await ctx.newPage();
  await page.setViewport({width:WIDTH,height:HEIGHT});
  await page.setCacheEnabled(false);
  const cdp=await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  const byId=new Map();
  const requests=[];
  cdp.on('Network.requestWillBeSent',e=>{
    const u=e.request&&e.request.url||'';
    if(!u||u.startsWith('data:'))return;
    const row={requestId:e.requestId,url:u,resourceType:e.type||null,initiatorType:e.initiator&&e.initiator.type||null,thirdParty:!u.startsWith(base),responseStatus:null,transferSize:0,decodedSize:0,mimeType:null,failed:false};
    byId.set(e.requestId,row);requests.push(row);
  });
  cdp.on('Network.responseReceived',e=>{const r=byId.get(e.requestId);if(!r)return;r.responseStatus=e.response.status;r.mimeType=e.response.mimeType||null});
  cdp.on('Network.loadingFinished',e=>{const r=byId.get(e.requestId);if(!r)return;r.transferSize=Math.round(e.encodedDataLength||0)});
  cdp.on('Network.loadingFailed',e=>{const r=byId.get(e.requestId);if(!r)return;r.failed=true;r.responseStatus='FAILED'});
  await page.goto(base+ROUTE,{waitUntil:'load',timeout:45000});
  await sleep(3000);
  for(const r of requests){
    try{
      const body=await cdp.send('Network.getResponseBody',{requestId:r.requestId});
      r.decodedSize=body.base64Encoded?Buffer.from(body.body,'base64').length:Buffer.byteLength(body.body||'','utf8');
    }catch{}
  }
  await ctx.close();
  return {label,rep,requests:requests.map(({requestId,...r})=>({...r,url:normalize(r.url,base),externalHost:externalHost(r.url,base)}))};
}
function side(rows,label){
  const rs=rows.filter(x=>x.label===label);
  const requestCounts=rs.map(x=>x.requests.length);
  const thirdPartyCounts=rs.map(x=>x.requests.filter(r=>r.thirdParty).length);
  const transferTotals=rs.map(x=>x.requests.reduce((a,r)=>a+(r.transferSize||0),0));
  const decodedTotals=rs.map(x=>x.requests.reduce((a,r)=>a+(r.decodedSize||0),0));
  const urlCounts=rs.map(x=>{const m={};for(const r of x.requests)m[r.url]=(m[r.url]||0)+1;return m});
  const urlTransfers=rs.map(x=>{const m={};for(const r of x.requests)m[r.url]=(m[r.url]||0)+(r.transferSize||0);return m});
  const union=[...new Set(rs.flatMap(x=>x.requests.map(r=>r.url)))].sort();
  const hosts=[...new Set(rs.flatMap(x=>x.requests.filter(r=>r.thirdParty).map(r=>r.externalHost).filter(Boolean)))].sort();
  const resourceClasses=[...new Set(rs.flatMap(x=>x.requests.map(r=>r.resourceType||'UNKNOWN')))].sort();
  return {rs,requestCounts,thirdPartyCounts,transferTotals,decodedTotals,urlCounts,urlTransfers,union,hosts,resourceClasses};
}
function totalFrequency(urlCounts,url){return urlCounts.reduce((n,m)=>n+(m[url]||0),0)}
function materiallyEquivalentTransfers(before,after){
  if(!before.length&&!after.length)return true;
  if(!before.length||!after.length)return false;
  const bm=median(before),am=median(after),delta=Math.abs(am-bm);
  const denom=Math.max(bm,am,1);
  return delta<=4096 || delta/denom<=0.05;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const rows=[];
  try{for(let i=1;i<=REPS;i++)rows.push(await run(browser,beforeBase,'before',i));for(let i=1;i<=REPS;i++)rows.push(await run(browser,afterBase,'after',i));}finally{await browser.close()}
  const b=side(rows,'before'),a=side(rows,'after');
  const allUrls=[...new Set([...b.union,...a.union])].sort();
  const frequencyDifferences=[];
  const withinSideVariability=[];
  const transferMaterialDifferences=[];
  const transferByUrl=[];
  const urlFrequencyMap={before:{},after:{}};
  for(const u of allUrls){
    const bc=b.urlCounts.map(m=>m[u]||0),ac=a.urlCounts.map(m=>m[u]||0);
    const bTotal=bc.reduce((x,y)=>x+y,0),aTotal=ac.reduce((x,y)=>x+y,0);
    urlFrequencyMap.before[u]=bTotal;urlFrequencyMap.after[u]=aTotal;
    if(bTotal!==aTotal)frequencyDifferences.push({url:u,beforeRuns:bc,afterRuns:ac,beforeTotal:bTotal,afterTotal:aTotal});
    if(new Set(bc).size>1||new Set(ac).size>1)withinSideVariability.push({url:u,before:bc,after:ac,beforeTotal:bTotal,afterTotal:aTotal});
    const bt=b.urlTransfers.map(m=>m[u]||0),at=a.urlTransfers.map(m=>m[u]||0);
    const bObserved=bt.filter(x=>x>0),aObserved=at.filter(x=>x>0);
    const thirdParty=!u.startsWith('LOCAL/');
    const intermittent=(new Set(bc).size>1||new Set(ac).size>1);
    const transferEquivalent=!thirdParty||!intermittent||materiallyEquivalentTransfers(bObserved,aObserved);
    if(thirdParty&&intermittent&&!transferEquivalent)transferMaterialDifferences.push({url:u,beforeObserved:bObserved,afterObserved:aObserved,beforeMedianObserved:median(bObserved),afterMedianObserved:median(aObserved)});
    transferByUrl.push({url:u,before:bt,after:at,beforeObserved:bObserved,afterObserved:aObserved,beforeMedian:median(bt),afterMedian:median(at),medianDelta:median(at)-median(bt),thirdParty,intermittent,materiallyEquivalentWhenIntermittent:transferEquivalent});
  }
  transferByUrl.sort((x,y)=>Math.abs(y.medianDelta)-Math.abs(x.medianDelta));
  const added=a.union.filter(x=>!b.union.includes(x));
  const removed=b.union.filter(x=>!a.union.includes(x));
  const candidateOnlyHosts=a.hosts.filter(x=>!b.hosts.includes(x));
  const baselineOnlyHosts=b.hosts.filter(x=>!a.hosts.includes(x));
  const candidateOnlyResourceClasses=a.resourceClasses.filter(x=>!b.resourceClasses.includes(x));
  const baselineOnlyResourceClasses=b.resourceClasses.filter(x=>!a.resourceClasses.includes(x));
  const stableBefore=b.requestCounts.every(x=>x===b.requestCounts[0]);
  const stableAfter=a.requestCounts.every(x=>x===a.requestCounts[0]);
  const requestCountDistributionsEquivalent=sameNums(b.requestCounts,a.requestCounts);
  const thirdPartyCountDistributionsEquivalent=sameNums(b.thirdPartyCounts,a.thirdPartyCounts);
  const urlFrequenciesEquivalent=frequencyDifferences.length===0;
  const structurallyEquivalent=added.length===0&&removed.length===0&&candidateOnlyHosts.length===0&&baselineOnlyHosts.length===0&&candidateOnlyResourceClasses.length===0&&baselineOnlyResourceClasses.length===0&&requestCountDistributionsEquivalent&&thirdPartyCountDistributionsEquivalent&&urlFrequenciesEquivalent&&transferMaterialDifferences.length===0;
  const report={
    route:ROUTE,viewport:`${WIDTH}x${HEIGHT}`,repetitionsPerSide:REPS,
    beforeRequestCounts:b.requestCounts,afterRequestCounts:a.requestCounts,
    beforeRequestCountDistribution:sorted(b.requestCounts),afterRequestCountDistribution:sorted(a.requestCounts),requestCountDistributionsEquivalent,
    beforeThirdPartyCounts:b.thirdPartyCounts,afterThirdPartyCounts:a.thirdPartyCounts,
    beforeThirdPartyCountDistribution:sorted(b.thirdPartyCounts),afterThirdPartyCountDistribution:sorted(a.thirdPartyCounts),thirdPartyCountDistributionsEquivalent,
    beforeTransferTotals:b.transferTotals,afterTransferTotals:a.transferTotals,
    beforeDecodedTotals:b.decodedTotals,afterDecodedTotals:a.decodedTotals,
    beforeUnion:b.union,afterUnion:a.union,added,removed,
    beforeThirdPartyHosts:b.hosts,afterThirdPartyHosts:a.hosts,candidateOnlyHosts,baselineOnlyHosts,
    beforeResourceClasses:b.resourceClasses,afterResourceClasses:a.resourceClasses,candidateOnlyResourceClasses,baselineOnlyResourceClasses,
    urlFrequencyMap,frequencyDifferences,withinSideVariability,transferMaterialDifferences,transferByUrl,
    medians:{before:{requests:median(b.requestCounts),thirdParty:median(b.thirdPartyCounts),transfer:median(b.transferTotals)},after:{requests:median(a.requestCounts),thirdParty:median(a.thirdPartyCounts),transfer:median(a.transferTotals)}},
    stableBefore,stableAfter,urlFrequenciesEquivalent,structurallyEquivalent,rows
  };
  const outFile=path.join(OUT,`${safeName(ROUTE)}-${WIDTH}x${HEIGHT}-performance-diagnostic.json`);
  fs.writeFileSync(outFile,JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,rows:undefined,transferByUrl:report.transferByUrl.slice(0,12)},null,2));
  if(!structurallyEquivalent)process.exit(1);
})();
