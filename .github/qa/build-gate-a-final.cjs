const fs=require('fs');
const vm=require('vm');
const path=require('path');

const ROOT=process.cwd();
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(ROOT,p),s);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const searchText=p=>[p.name,p.abbr,p.category,p.family].filter(Boolean).join(' ').toLowerCase();

const sandbox={window:{}};
vm.runInNewContext(read('assets/products-data.js'),sandbox,{filename:'assets/products-data.js'});
const inquiry=sandbox.window.UNIQUE_PRODUCTS||[];
const core=sandbox.window.UNIQUE_CORE_PRODUCTS||[];
if(!Array.isArray(inquiry)||!Array.isArray(core))throw new Error('Product data arrays unavailable');

let products=read('products.html');

const coreHtml=core.map(p=>`<a class="product-link" data-product-kind="core" data-slug="${esc(p.slug)}" href="product.html?slug=${encodeURIComponent(p.slug)}"><small>${esc(p.family)}</small><h3>${esc(p.name)}</h3><p>${esc(p.abbr||p.category)}</p><span>Reference technical data ↗</span></a>`).join('');
products=products.replace('<div class="product-grid" id="core-grid"></div>',`<div class="product-grid" id="core-grid">${coreHtml}</div>`);

const categoryMeta={
  'Petrochemical Products':{id:'petrochemical',intro:'Polymers, basic petrochemicals, aromatics, glycols, intermediates, ethanolamines and fertilizer-related inquiry families.'},
  'Chemical Products':{id:'chemical',intro:'Industrial chemical inquiry families reviewed against requested specification and offered-lot availability.'},
  'Energy & Hydrocarbon Products':{id:'energy-products',intro:'Liquefied gases, refinery materials, base oils, waxes and hydrocarbon-stream inquiry families.'}
};
const familyBlocks=rows=>{
  const families=[];
  for(const p of rows)if(!families.includes(p.family))families.push(p.family);
  return families.map(f=>{
    const cards=rows.filter(p=>p.family===f).map(p=>`<a class="product-link" data-product-kind="inquiry" data-slug="${esc(p.slug)}" data-category="${esc(p.category)}" data-family="${esc(p.family)}" data-search="${esc(searchText(p))}" href="product.html?slug=${encodeURIComponent(p.slug)}"><small>${esc(p.family)}</small><h3>${esc(p.name)}</h3><p>${esc(p.abbr||'Specification-based inquiry')}</p><span>Open inquiry route ↗</span></a>`).join('');
    return `<div class="catalog-group" data-catalog-family="${esc(f)}"><p class="subsite-label">${esc(f)}</p><div class="product-grid">${cards}</div></div>`;
  }).join('');
};
const catalogHtml=Object.entries(categoryMeta).map(([category,meta])=>{
  const rows=inquiry.filter(p=>p.category===category);
  return `<section class="catalog-group catalog-anchor" id="${meta.id}" data-catalog-category="${esc(category)}"><h2>${category==='Energy & Hydrocarbon Products'?'Energy &amp; Hydrocarbon Products':esc(category)}</h2><p>${esc(meta.intro)}</p><div data-catalog-rows>${familyBlocks(rows)}</div></section>`;
}).join('');
const catalogStart=products.indexOf('<div id="catalog">');
const catalogEndMarker='</div></section>\n<section class="subsite-section paper">';
const catalogEnd=products.indexOf(catalogEndMarker,catalogStart);
if(catalogStart<0||catalogEnd<0)throw new Error('Catalog replacement markers not found');
products=products.slice(0,catalogStart)+`<div id="catalog">${catalogHtml}</div></section>\n<section class="subsite-section paper">`+products.slice(catalogEnd+catalogEndMarker.length);

if(!products.includes('.catalog-anchor{scroll-margin-top:96px}')){
  products=products.replace('</head>','<style>@layer page{.catalog-anchor{scroll-margin-top:96px}}</style></head>');
}

const scriptStartMarker='<script src="assets/products-data.js"></script><script>';
const scriptEndMarker='</script><script src="assets/site.js" defer></script>';
const scriptStart=products.indexOf(scriptStartMarker);
const scriptEnd=products.indexOf(scriptEndMarker,scriptStart);
if(scriptStart<0||scriptEnd<0)throw new Error('Enhancement script markers not found');
const enhancement=`(function(){const catalog=document.getElementById('catalog');const input=document.getElementById('product-search');const count=document.getElementById('product-count');const cards=[...catalog.querySelectorAll('[data-product-kind="inquiry"]')];const families=[...catalog.querySelectorAll('[data-catalog-family]')];const groups=[...catalog.querySelectorAll('[data-catalog-category]')];function filter(q=''){const term=q.trim().toLowerCase();let visible=0;for(const card of cards){const match=!term||(card.dataset.search||card.textContent.toLowerCase()).includes(term);card.hidden=!match;if(match)visible++;}for(const family of families)family.hidden=!family.querySelector('[data-product-kind="inquiry"]:not([hidden])');for(const group of groups)group.hidden=!group.querySelector('[data-catalog-family]:not([hidden])');count.textContent=visible+' inquiry routes';}input.addEventListener('input',e=>filter(e.target.value));filter(input.value);})();`;
products=products.slice(0,scriptStart)+scriptStartMarker+enhancement+scriptEndMarker+products.slice(scriptEnd+scriptEndMarker.length);

if(products.includes('style="scroll-margin-top:96px"'))throw new Error('Inline scroll-margin survived');
if(/alignHashTarget|requestAnimationFrame\s*\(|setTimeout\s*\(|MutationObserver\s*\(|window\.scrollTo\s*\(|\.innerHTML\s*=/.test(products))throw new Error('Forbidden timing/catalog-construction code present');
write('products.html',products);

let qa=read('scripts/qa-site.mjs');
if(!qa.includes("import vm from 'node:vm';"))qa=qa.replace("import crypto from 'node:crypto';","import crypto from 'node:crypto';\nimport vm from 'node:vm';");
const guardStart=qa.indexOf("const products=read('products.html');");
const guardEnd=qa.indexOf("for(const id of ['overview','product-families','trading','core-products','customers','operations'])",guardStart);
if(guardStart<0||guardEnd<0)throw new Error('Existing products guard block not found');
const newGuards=`const products=read('products.html');
const productSandbox={window:{}};
try{vm.runInNewContext(read('assets/products-data.js'),productSandbox,{filename:'assets/products-data.js'})}catch(e){errors.push('assets/products-data.js: data evaluation failed -> '+e.message)}
const inquiryData=productSandbox.window.UNIQUE_PRODUCTS||[];
const coreData=productSandbox.window.UNIQUE_CORE_PRODUCTS||[];
const htmlEsc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
for(const id of ['petrochemical','chemical','energy-products']){
  const matches=products.match(new RegExp(\\`<section\\\\b[^>]*id=["']\\${id}["'][^>]*data-catalog-category=\\`,'gi'))||[];
  if(matches.length!==1)errors.push(\\`products.html: persistent family anchor #\\${id} must exist exactly once, found \\${matches.length}\\`);
}
if(!products.includes('.catalog-anchor{scroll-margin-top:96px}'))errors.push('products.html: standards-based catalog scroll-margin rule missing');
if(/style=["'][^"']*scroll-margin-top/i.test(products))errors.push('products.html: catalog scroll-margin must not use repeated inline styles');
for(const token of ['data-catalog-category="Petrochemical Products"','data-catalog-category="Chemical Products"','data-catalog-category="Energy & Hydrocarbon Products"','data-catalog-rows','data-catalog-family','data-product-kind="core"','data-product-kind="inquiry"'])if(!products.includes(token))errors.push(\\`products.html: Gate A static catalog architecture regression -> \\${token}\\`);
if(/alignHashTarget|requestAnimationFrame\\s*\\(|setTimeout\\s*\\(|MutationObserver\\s*\\(|window\\.scrollTo\\s*\\(/.test(products))errors.push('products.html: timing fragment workaround must not return');
if(/\\.innerHTML\\s*=/.test(products))errors.push('products.html: default catalog must not depend on post-load innerHTML construction');
const staticCore=[...products.matchAll(/<a\\b[^>]*data-product-kind=["']core["'][^>]*>[\\s\\S]*?<\\/a>/gi)].map(m=>m[0]);
const staticInquiry=[...products.matchAll(/<a\\b[^>]*data-product-kind=["']inquiry["'][^>]*>[\\s\\S]*?<\\/a>/gi)].map(m=>m[0]);
let productMismatches=0;
const verifyCard=(p,kind,cards)=>{
  const card=cards.find(c=>attr(c,'data-slug')===p.slug);
  if(!card){productMismatches++;errors.push(\\`products.html: static \\${kind} card missing -> \\${p.slug}\\`);return}
  const expectedHref=\\`product.html?slug=\\${encodeURIComponent(p.slug)}\\`;
  if(attr(card,'href')!==expectedHref){productMismatches++;errors.push(\\`products.html: static \\${kind} href drift -> \\${p.slug}\\`)}
  for(const token of [\\`<small>\\${htmlEsc(p.family)}</small>\\`,\\`<h3>\\${htmlEsc(p.name)}</h3>\\`,\\`<p>\\${htmlEsc(p.abbr||(kind==='core'?p.category:'Specification-based inquiry'))}</p>\\`])if(!card.includes(token)){productMismatches++;errors.push(\\`products.html: static \\${kind} content drift -> \\${p.slug} / \\${token}\\`)}
  if(kind==='inquiry'&&(attr(card,'data-category')!==htmlEsc(p.category)||attr(card,'data-family')!==htmlEsc(p.family))){productMismatches++;errors.push(\\`products.html: static inquiry metadata drift -> \\${p.slug}\\`)}
};
for(const p of coreData)verifyCard(p,'core',staticCore);
for(const p of inquiryData)verifyCard(p,'inquiry',staticInquiry);
if(staticCore.length!==coreData.length){productMismatches++;errors.push(\\`products.html: static core count \\${staticCore.length} != data count \\${coreData.length}\\`)}
if(staticInquiry.length!==inquiryData.length){productMismatches++;errors.push(\\`products.html: static inquiry count \\${staticInquiry.length} != data count \\${inquiryData.length}\\`)}
if(new Set(staticCore.map(c=>attr(c,'data-slug'))).size!==staticCore.length){productMismatches++;errors.push('products.html: duplicate static core product slug')}
if(new Set(staticInquiry.map(c=>attr(c,'data-slug'))).size!==staticInquiry.length){productMismatches++;errors.push('products.html: duplicate static inquiry product slug')}
console.log('CORE DATA COUNT: '+coreData.length);
console.log('STATIC CORE CARD COUNT: '+staticCore.length);
console.log('INQUIRY DATA COUNT: '+inquiryData.length);
console.log('STATIC INQUIRY CARD COUNT: '+staticInquiry.length);
console.log('MISMATCH COUNT: '+productMismatches);
if(!products.includes("input.addEventListener('input'"))errors.push('products.html: progressive-enhancement search listener missing');
if(!products.includes("card.hidden=!match"))errors.push('products.html: search must filter existing static cards');
if(!products.includes("group.hidden=!group.querySelector('[data-catalog-family]:not([hidden])')"))errors.push('products.html: search must hide empty catalog families without destroying anchors');
`;
qa=qa.slice(0,guardStart)+newGuards+qa.slice(guardEnd);
write('scripts/qa-site.mjs',qa);

console.log('BUILDER CORE DATA COUNT='+core.length);
console.log('BUILDER INQUIRY DATA COUNT='+inquiry.length);
console.log('BUILDER COMPLETE');
