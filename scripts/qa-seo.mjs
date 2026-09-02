import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const expected={"index.html": {"title": "Unique Holding | Industrial Trade, Technology & Ventures", "description": "Unique Holding is an Istanbul-based group active in industrial trade, petrochemicals and chemicals, with specialist technology and venture activity.", "canonical": "https://www.uniqueholding.com.tr/", "robots": "index,follow", "image": "assets/social/group-corporate.png", "image_alt": "Unique Holding corporate social preview card.", "schema_type": "WebPage"}, "corporate.html": {"title": "Corporate | Unique Holding", "description": "Corporate profile for Unique Holding, including its Istanbul base, operating structure, industrial activity and public operating-company information.", "canonical": "https://www.uniqueholding.com.tr/corporate.html", "robots": "index,follow", "image": "assets/social/group-corporate.png", "image_alt": "Unique Holding corporate social preview card.", "schema_type": "AboutPage"}, "energy.html": {"title": "Energy & Global Trade | Unique Holding", "description": "Energy & Global Trade at Unique Holding covers industrial trading in petrochemicals and chemicals, including import, domestic supply, export and re-export.", "canonical": "https://www.uniqueholding.com.tr/energy.html", "robots": "index,follow", "image": "assets/social/industrial-trade.png", "image_alt": "Unique Holding Energy & Global Trade social preview card.", "schema_type": "WebPage"}, "products.html": {"title": "Industrial Products | Unique Holding", "description": "Browse three core industrial products with published reference data and a wider catalog of requirement-based petrochemical and chemical inquiry routes.", "canonical": "https://www.uniqueholding.com.tr/products.html", "robots": "index,follow", "image": "assets/social/industrial-trade.png", "image_alt": "Unique Holding Energy & Global Trade social preview card.", "schema_type": "CollectionPage"}, "product.html": {"title": "Product Inquiry Detail | Unique Holding", "description": "Generic industrial product inquiry detail for requirement-based review. Core products with published reference data use dedicated reference pages.", "canonical": "https://www.uniqueholding.com.tr/product.html", "robots": "noindex,follow", "image": null, "image_alt": null, "schema_type": null}, "urea-46.html": {"title": "Urea 46 | Reference Detail | Unique Holding", "description": "Urea 46 reference detail with published technical values, commercial inquiry routes and the boundary between reference data and offered-lot confirmation.", "canonical": "https://www.uniqueholding.com.tr/urea-46.html", "robots": "index,follow", "image": "assets/social/industrial-trade.png", "image_alt": "Unique Holding Energy & Global Trade social preview card.", "schema_type": "WebPage"}, "caustic-soda-solid.html": {"title": "Caustic Soda Solid | Reference Detail | Unique Holding", "description": "Caustic Soda Solid reference detail with published sodium hydroxide technical data, transport classification and industrial inquiry routing.", "canonical": "https://www.uniqueholding.com.tr/caustic-soda-solid.html", "robots": "index,follow", "image": "assets/social/industrial-trade.png", "image_alt": "Unique Holding Energy & Global Trade social preview card.", "schema_type": "WebPage"}, "sodium-sulphate-anhydrous.html": {"title": "Sodium Sulphate Anhydrous | Reference Detail | Unique Holding", "description": "Sodium Sulphate Anhydrous reference detail with published technical values, commercial inquiry routing and offered-lot confirmation boundaries.", "canonical": "https://www.uniqueholding.com.tr/sodium-sulphate-anhydrous.html", "robots": "index,follow", "image": "assets/social/industrial-trade.png", "image_alt": "Unique Holding Energy & Global Trade social preview card.", "schema_type": "WebPage"}, "sales.html": {"title": "Industrial Sales & RFQ | Unique Holding", "description": "Prepare an industrial RFQ for petrochemical, chemical and related product requirements, then send the structured inquiry through your email application.", "canonical": "https://www.uniqueholding.com.tr/sales.html", "robots": "index,follow", "image": "assets/social/industrial-trade.png", "image_alt": "Unique Holding Energy & Global Trade social preview card.", "schema_type": "WebPage"}, "technology.html": {"title": "Technology & Intelligence | Unique Holding", "description": "Technology and intelligence at Unique Holding: Evidence Axis, development-stage digital products, venture systems and content/distribution capabilities alongside active industrial operations.", "canonical": "https://www.uniqueholding.com.tr/technology.html", "robots": "index,follow", "image": "assets/social/technology-intelligence.png", "image_alt": "Unique Holding Technology & Intelligence social preview card.", "schema_type": "WebPage"}, "evidence-axis.html": {"title": "Evidence Axis | Competitive Intelligence Venture | Unique Holding", "description": "Evidence Axis is a specialist venture within the Unique Holding portfolio. Explore its competitive-intelligence focus, public research sample and specialist website.", "canonical": "https://www.uniqueholding.com.tr/evidence-axis.html", "robots": "index,follow", "image": "assets/social/evidence-axis.png", "image_alt": "Evidence Axis specialist venture social preview card.", "schema_type": "WebPage"}, "ventures.html": {"title": "Venture Development | Unique Holding", "description": "Venture development at Unique Holding: Evidence Axis as a specialist operating venture and YEKI HAST as a development-stage digital product under active build.", "canonical": "https://www.uniqueholding.com.tr/ventures.html", "robots": "index,follow", "image": "assets/social/venture-portfolio.png", "image_alt": "Unique Holding venture portfolio social preview card.", "schema_type": "WebPage"}, "contact.html": {"title": "Contact & Business Routing | Unique Holding", "description": "Contact Unique Holding through the correct business route for industrial sales, corporate communication, Evidence Axis specialist inquiries, technology or venture context, and the Istanbul office.", "canonical": "https://www.uniqueholding.com.tr/contact.html", "robots": "index,follow", "image": "assets/social/group-corporate.png", "image_alt": "Unique Holding corporate social preview card.", "schema_type": "ContactPage"}, "privacy.html": {"title": "Privacy & Cookies | Unique Holding", "description": "Privacy and cookies information for the Unique Holding website, including current site data flows, inquiry handling boundaries and legal-review notices.", "canonical": "https://www.uniqueholding.com.tr/privacy.html", "robots": "index,follow", "image": "assets/social/group-corporate.png", "image_alt": "Unique Holding corporate social preview card.", "schema_type": "WebPage"}, "legal.html": {"title": "Legal Notice | Unique Holding", "description": "Legal notice for the Unique Holding website, including site identity, information boundaries, contact routes and matters reserved for formal legal review.", "canonical": "https://www.uniqueholding.com.tr/legal.html", "robots": "index,follow", "image": "assets/social/group-corporate.png", "image_alt": "Unique Holding corporate social preview card.", "schema_type": "WebPage"}, "404.html": {"title": "Page Not Found | Unique Holding", "description": "The requested Unique Holding page could not be found. Use the site navigation to return to an available corporate, trade or venture page.", "canonical": null, "robots": "noindex,follow", "image": null, "image_alt": null, "schema_type": null}};
const products={"urea-46.html": {"name": "Urea 46", "description": "A core industrial material with a published reference specification. Commercial inquiries should identify the required prilled, granular or industrial route.", "category": "Fertilizer / Industrial Feedstock", "properties": [["Nitrogen Content", "min 46% wt"], ["Biuret", "max 0.8% wt"], ["Formaldehyde", "max 0.55% wt"], ["Moisture", "max 0.3% wt"], ["Particle size 2–4 mm", "90%"]]}, "caustic-soda-solid.html": {"name": "Caustic Soda Solid", "description": "Solid sodium hydroxide with published reference technical and transport classification data.", "category": "Industrial Chemicals", "properties": [["Chemical name", "Sodium Hydroxide"], ["CAS", "1310-73-2"], ["NaOH", "approx. 98.8%"], ["Dry basis", "99.3%"], ["UN", "1823"], ["Class", "8"], ["Packing Group", "II"]]}, "sodium-sulphate-anhydrous.html": {"name": "Sodium Sulphate Anhydrous", "description": "Anhydrous sodium sulphate with a published reference specification for commercial inquiry.", "category": "Industrial Chemicals", "properties": [["Na₂SO₄", "99.20%"], ["Water Insoluble Matter", "0.02%"], ["Ca & Mg", "0.02%"], ["Chloride", "0.30%"], ["Fe", "0.0003%"], ["Moisture", "0.05%"], ["Whiteness", "91%"]]}};
const sitemapExpected=["https://www.uniqueholding.com.tr/", "https://www.uniqueholding.com.tr/corporate.html", "https://www.uniqueholding.com.tr/energy.html", "https://www.uniqueholding.com.tr/products.html", "https://www.uniqueholding.com.tr/urea-46.html", "https://www.uniqueholding.com.tr/caustic-soda-solid.html", "https://www.uniqueholding.com.tr/sodium-sulphate-anhydrous.html", "https://www.uniqueholding.com.tr/sales.html", "https://www.uniqueholding.com.tr/technology.html", "https://www.uniqueholding.com.tr/evidence-axis.html", "https://www.uniqueholding.com.tr/ventures.html", "https://www.uniqueholding.com.tr/contact.html", "https://www.uniqueholding.com.tr/privacy.html", "https://www.uniqueholding.com.tr/legal.html"];
const socialExpected={"assets/social/group-corporate.png": {"pages": ["index.html", "corporate.html", "contact.html", "privacy.html", "legal.html"], "alt": "Unique Holding corporate social preview card."}, "assets/social/industrial-trade.png": {"pages": ["energy.html", "products.html", "urea-46.html", "caustic-soda-solid.html", "sodium-sulphate-anhydrous.html", "sales.html"], "alt": "Unique Holding Energy & Global Trade social preview card."}, "assets/social/technology-intelligence.png": {"pages": ["technology.html"], "alt": "Unique Holding Technology & Intelligence social preview card."}, "assets/social/evidence-axis.png": {"pages": ["evidence-axis.html"], "alt": "Evidence Axis specialist venture social preview card."}, "assets/social/venture-portfolio.png": {"pages": ["ventures.html"], "alt": "Unique Holding venture portfolio social preview card."}};
const errors=[];
const report={routes:[],schema:[],social:[],sitemap:[],machineReadableHits:[],summary:{}};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const attr=(tag,name)=>tag.match(new RegExp(`${name}=["']([^"']*)["']`,'i'))?.[1]??'';
const decode=s=>String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const fail=m=>errors.push(m);
const meta=(head,key,value)=>((head.match(/<meta\b[^>]*>/gi)||[]).filter(t=>attr(t,key).toLowerCase()===value.toLowerCase()));
const links=head=>(head.match(/<link\b[^>]*>/gi)||[]);
const pngDimensions=file=>{const b=fs.readFileSync(path.join(root,file));if(b.length<24||b.toString('hex',0,8)!=='89504e470d0a1a0a')return null;return{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const typesFrom=doc=>{const list=Array.isArray(doc?.['@graph'])?doc['@graph']:[doc];return list.filter(x=>x&&typeof x==='object'&&x['@type']).map(x=>x['@type'])};
const entitiesFrom=doc=>Array.isArray(doc?.['@graph'])?doc['@graph']:[doc];
const forbiddenTypes=new Set(['Review','AggregateRating','FAQPage','HowTo','Person','JobPosting','Event','NewsArticle','Article','SoftwareApplication','MobileApplication','Offer','LocalBusiness']);
const forbiddenKeys=new Set(['sameAs','legalName','taxID','vatID','leiCode','duns','globalLocationNumber','registrationNumber','founder','numberOfEmployees','parentOrganization','subOrganization','offers','price','priceCurrency','availability','itemCondition','seller','manufacturer','brand','sku','mpn','gtin','aggregateRating','review']);
const machinePhrases=['leading','market leader','industry leader','trusted by','customers','clients','fortune 500','award-winning','global offices','worldwide offices','proprietary ai','patented','subsidiary','wholly owned','active users','launched','production ready','revenue','arr','mrr','manufacturer','producer','in stock','available now','price'];
const expectedTypes={
  'index.html':['Organization','WebSite','WebPage'],
  'corporate.html':['AboutPage'],
  'energy.html':['WebPage'],
  'products.html':['CollectionPage'],
  'urea-46.html':['WebPage','Product'],
  'caustic-soda-solid.html':['WebPage','Product'],
  'sodium-sulphate-anhydrous.html':['WebPage','Product'],
  'sales.html':['WebPage'],
  'technology.html':['WebPage'],
  'evidence-axis.html':['WebPage'],
  'ventures.html':['WebPage'],
  'contact.html':['ContactPage'],
  'privacy.html':['WebPage'],
  'legal.html':['WebPage'],
  'product.html':[],
  '404.html':[]
};
const fullEntities=new Map();
for(const [route,cfg] of Object.entries(expected)){
  if(!fs.existsSync(path.join(root,route))){fail(`${route}: missing`);continue}
  const html=read(route);const hm=html.match(/<head>([\s\S]*?)<\/head>/i);if(!hm){fail(`${route}: head missing`);continue}const head=hm[1];
  const titles=[...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(m=>decode(m[1].trim()));
  const desc=meta(head,'name','description');const robots=meta(head,'name','robots');const keywords=meta(head,'name','keywords');
  const canonical=links(head).filter(t=>attr(t,'rel').toLowerCase()==='canonical');const icons=links(head).filter(t=>attr(t,'rel').toLowerCase()==='icon');
  if(titles.length!==1||titles[0]!==cfg.title)fail(`${route}: title mismatch/count`);
  if(desc.length!==1||decode(attr(desc[0],'content'))!==cfg.description)fail(`${route}: meta description mismatch/count`);
  if(robots.length!==1||attr(robots[0],'content')!==cfg.robots)fail(`${route}: robots mismatch/count`);
  if(keywords.length)fail(`${route}: meta keywords forbidden`);
  if(icons.length!==1||attr(icons[0],'href')!=='assets/favicon.svg')fail(`${route}: favicon reference mismatch`);
  if(route==='404.html'){if(canonical.length)fail('404.html: canonical must be absent')}else{if(canonical.length!==1||attr(canonical[0],'href')!==cfg.canonical)fail(`${route}: canonical mismatch/count`)}
  const indexable=cfg.robots==='index,follow';
  const ogNames=['title','description','type','url','image','image:width','image:height','image:alt','site_name','locale'];
  const twNames=['card','title','description','image','image:alt'];
  if(indexable){
    for(const n of ogNames)if(meta(head,'property','og:'+n).length!==1)fail(`${route}: og:${n} missing/duplicate`);
    for(const n of twNames)if(meta(head,'name','twitter:'+n).length!==1)fail(`${route}: twitter:${n} missing/duplicate`);
    if(meta(head,'name','twitter:site').length||meta(head,'name','twitter:creator').length)fail(`${route}: unapproved X identity metadata`);
    const ogUrl=attr(meta(head,'property','og:url')[0],'content');if(ogUrl!==cfg.canonical)fail(`${route}: og:url != canonical`);
    if(attr(meta(head,'property','og:type')[0],'content')!=='website')fail(`${route}: og:type must be website`);
    if(attr(meta(head,'property','og:site_name')[0],'content')!=='Unique Holding')fail(`${route}: og:site_name mismatch`);
    if(attr(meta(head,'property','og:locale')[0],'content')!=='en_US')fail(`${route}: og:locale mismatch`);
    if(attr(meta(head,'name','twitter:card')[0],'content')!=='summary_large_image')fail(`${route}: twitter card mismatch`);
    const ogImage=attr(meta(head,'property','og:image')[0],'content');const twImage=attr(meta(head,'name','twitter:image')[0],'content');
    const wanted='https://www.uniqueholding.com.tr/'+cfg.image;
    if(ogImage!==wanted||twImage!==wanted)fail(`${route}: social image mapping mismatch`);
    if(!ogImage.startsWith('https://www.uniqueholding.com.tr/'))fail(`${route}: remote social image`);
    const local=new URL(ogImage).pathname.replace(/^\//,'');if(!fs.existsSync(path.join(root,local)))fail(`${route}: local social image missing`);
    if(attr(meta(head,'property','og:image:width')[0],'content')!=='1200'||attr(meta(head,'property','og:image:height')[0],'content')!=='630')fail(`${route}: social dimensions metadata mismatch`);
    if(decode(attr(meta(head,'property','og:image:alt')[0],'content'))!==cfg.image_alt||decode(attr(meta(head,'name','twitter:image:alt')[0],'content'))!==cfg.image_alt)fail(`${route}: social alt mismatch`);
  }
  const ld=[...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  let docs=[];for(const raw of ld){try{docs.push(JSON.parse(raw))}catch(e){fail(`${route}: JSON-LD parse failure ${e.message}`)}}
  const typeList=docs.flatMap(typesFrom);const wantedTypes=expectedTypes[route]||[];
  if(JSON.stringify(typeList)!==JSON.stringify(wantedTypes))fail(`${route}: structured-data types ${JSON.stringify(typeList)} != ${JSON.stringify(wantedTypes)}`);
  for(const doc of docs){for(const ent of entitiesFrom(doc)){
    if(!ent||typeof ent!=='object')continue;const typ=ent['@type'];if(forbiddenTypes.has(typ))fail(`${route}: forbidden schema type ${typ}`);
    for(const k of Object.keys(ent))if(forbiddenKeys.has(k))fail(`${route}: forbidden schema property ${k}`);
    if(ent['@id']&&typ){const prior=fullEntities.get(ent['@id']);const now=JSON.stringify(ent);if(prior&&prior!==now)fail(`${route}: conflicting entity @id ${ent['@id']}`);else fullEntities.set(ent['@id'],now)}
    report.schema.push({route,type:typ||null,id:ent['@id']||null,keys:Object.keys(ent)});
  }}
  const machine=[...head.matchAll(/<meta\b[^>]*(?:content=["']([^"']*)["'])[^>]*>/gi)].map(m=>decode(m[1]||'')).join(' ')+' '+ld.join(' ');
  for(const phrase of machinePhrases){const rx=new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`,'i');if(rx.test(machine)){report.machineReadableHits.push({route,phrase});fail(`${route}: unsupported machine-readable phrase -> ${phrase}`)}}
  if(/linkedin\.com|instagram\.com/i.test(head))fail(`${route}: unverified social identity published in head`);
  report.routes.push({route,indexable,robots:cfg.robots,title:cfg.title,titleLength:cfg.title.length,description:cfg.description,descriptionLength:cfg.description.length,canonical:cfg.canonical||null,ogImage:indexable?'https://www.uniqueholding.com.tr/'+cfg.image:null,types:typeList});
}
const indexable=report.routes.filter(x=>x.indexable);
for(const [label,values] of [['TITLE',indexable.map(x=>x.title)],['DESCRIPTION',indexable.map(x=>x.description)],['CANONICAL',indexable.map(x=>x.canonical)]])if(new Set(values).size!==values.length)fail(`${label} DUPLICATES > 0`);
if(indexable.length!==14)fail(`indexable route count ${indexable.length} != 14`);

for(const [route,p] of Object.entries(products)){
  const html=read(route);const head=html.match(/<head>([\s\S]*?)<\/head>/i)?.[1]||'';const docs=[...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>JSON.parse(m[1]));
  const product=docs.flatMap(entitiesFrom).find(x=>x?.['@type']==='Product');if(!product){fail(`${route}: Product schema missing`);continue}
  if(product.name!==p.name||product.description!==p.description||product.category!==p.category||product.url!==expected[route].canonical)fail(`${route}: Product identity schema drift`);
  const actual=(product.additionalProperty||[]).map(x=>[x.name,x.value]);if(JSON.stringify(actual)!==JSON.stringify(p.properties))fail(`${route}: Product technical schema drift ${JSON.stringify(actual)}`);
  const body=html.slice(html.search(/<body\b/i));for(const [name,value] of p.properties){if(!body.includes(name)||!body.includes(value.replace('&','&amp;'))&&!body.includes(value))fail(`${route}: schema property not supported by visible body -> ${name}: ${value}`)}
}

const sitemap=read('sitemap.xml');const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);report.sitemap=urls;
if(urls.length!==14||JSON.stringify(urls)!==JSON.stringify(sitemapExpected))fail(`sitemap canonical set mismatch/count ${urls.length}`);
if(new Set(urls).size!==urls.length)fail('sitemap duplicates');
for(const u of urls){if(/[?#]/.test(u)||u.includes('product.html')||u.includes('404.html')||u.includes('github'))fail(`sitemap forbidden URL ${u}`)}
if(/<lastmod>/i.test(sitemap))fail('sitemap fabricated lastmod present');
const robotsTxt=read('robots.txt');if(!/^User-agent:\s*\*\s*\nAllow:\s*\//m.test(robotsTxt)||!robotsTxt.includes('Sitemap: https://www.uniqueholding.com.tr/sitemap.xml'))fail('robots.txt baseline mismatch');
if(/Disallow:\s*\/product\.html/i.test(robotsTxt))fail('robots.txt must not block product.html');

const favicon=read('assets/favicon.svg');const viewBox=favicon.match(/viewBox=["']0 0 (\d+) (\d+)["']/i);if(!viewBox||viewBox[1]!==viewBox[2])fail('favicon.svg is not square');
for(const [file,meta] of Object.entries(socialExpected)){
  if(!fs.existsSync(path.join(root,file))){fail(`${file}: missing`);continue}const d=pngDimensions(file);if(!d||d.width!==1200||d.height!==630)fail(`${file}: PNG dimensions invalid`);const size=fs.statSync(path.join(root,file)).size;if(size<5000||size>600000)fail(`${file}: suspicious file size ${size}`);report.social.push({file,...d,size,pages:meta.pages,alt:meta.alt});
}

for(const file of ['assets/site.js','assets/products-data.js']){const s=read(file);if(/meta\s*\[?name\s*=\s*["']robots|querySelector\([^)]*robots|setAttribute\([^)]*robots/i.test(s))fail(`${file}: runtime robots mutation detected`)}
const runtimeSite=read('assets/site.js');for(const rx of [/document\.createElement\(\s*["']meta["']/i,/application\/ld\+json/i,/data-org-schema/i,/addMeta\s*\(/i,/og:title/i,/twitter:card/i])if(rx.test(runtimeSite))fail(`assets/site.js: SEO-critical metadata must not be injected at runtime -> ${rx}`);
for(const route of ['index.html','products.html','urea-46.html','technology.html','evidence-axis.html','ventures.html','contact.html']){const html=read(route);const head=html.match(/<head>([\s\S]*?)<\/head>/i)?.[1]||'';for(const token of ['<title>','name="description"','name="robots"','rel="canonical"','property="og:title"','name="twitter:card"','application/ld+json'])if(!head.includes(token))fail(`${route}: static source metadata missing ${token}`)}

const privacyBody=read('privacy.html').slice(read('privacy.html').search(/<body\b/i));const legalBody=read('legal.html').slice(read('legal.html').search(/<body\b/i));if(!/Legal review required/i.test(privacyBody))fail('privacy.html: Phase 17 legal-review boundary missing');if(!/does not add an unreviewed governing-law, jurisdiction, warranty, liability, arbitration or browsing-acceptance clause/i.test(legalBody))fail('legal.html: Phase 17 legal boundary missing');if(!/does not create a separate legal entity named [“"]Unique Holding[”"]/i.test(legalBody))fail('legal.html: Phase 17 group-entity boundary missing');
if(!read('docs/qa/phase18-seo-social-audit.md').includes('RELEASE-BLOCKER-HTTPS-001` remains OPEN'))fail('Phase 18 audit must carry HTTPS blocker OPEN');
if(!read('docs/qa/phase18-seo-social-audit.md').includes('PHASE18-LIVE-SOCIAL-VALIDATION`: DEFERRED'))fail('Phase 18 live-social deferral missing');

report.summary={htmlRoutes:report.routes.length,indexable:indexable.length,titleDuplicates:indexable.length-new Set(indexable.map(x=>x.title)).size,descriptionDuplicates:indexable.length-new Set(indexable.map(x=>x.description)).size,canonicalDuplicates:indexable.length-new Set(indexable.map(x=>x.canonical)).size,jsonLdEntities:report.schema.filter(x=>x.type).length,socialAssets:report.social.length,sitemapEntries:urls.length,machineReadableHits:report.machineReadableHits.length,failures:errors.length};
const out=process.env.PHASE18_QA_OUT;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'phase18-seo-qa-report.json'),JSON.stringify({...report,errors},null,2))}
console.log(JSON.stringify(report.summary,null,2));if(errors.length){console.error(errors.join('\n'));process.exit(1)}console.log('PHASE 18 SEO QA PASS');
