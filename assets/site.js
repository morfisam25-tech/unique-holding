const page=(location.pathname.split('/').pop()||'index.html').replace('.html','')||'index';
document.body.dataset.page=page;

const addHeadLink=(rel,href,type)=>{
  if(document.head.querySelector(`link[href="${href}"]`))return;
  const link=document.createElement('link');
  link.rel=rel;
  link.href=href;
  if(type)link.type=type;
  document.head.append(link);
};
const addMeta=(key,name,content)=>{
  if(document.head.querySelector(`meta[${key}="${name}"]`))return;
  const meta=document.createElement('meta');
  meta.setAttribute(key,name);
  meta.content=content;
  document.head.append(meta);
};
addHeadLink('icon','assets/favicon.svg','image/svg+xml');

const coreProductRoutes={
  'urea-46':'urea-46.html',
  'caustic-soda-solid':'caustic-soda-solid.html',
  'sodium-sulphate-anhydrous':'sodium-sulphate-anhydrous.html'
};
document.querySelectorAll('a[href^="product.html?slug="]').forEach(a=>{
  try{
    const slug=new URL(a.href,location.href).searchParams.get('slug');
    if(coreProductRoutes[slug])a.href=coreProductRoutes[slug];
  }catch{}
});
if(page==='product'){
  const slug=new URLSearchParams(location.search).get('slug');
  if(coreProductRoutes[slug])location.replace(coreProductRoutes[slug]);
}

const canonical=document.querySelector('link[rel="canonical"]')?.href;
addMeta('property','og:title',document.title);
const description=document.querySelector('meta[name="description"]')?.content||'';
if(description)addMeta('property','og:description',description);
addMeta('property','og:type','website');
if(canonical)addMeta('property','og:url',canonical);
addMeta('name','twitter:card','summary');
addMeta('name','twitter:title',document.title);
if(description)addMeta('name','twitter:description',description);
if(page==='index'&&!document.querySelector('script[data-org-schema]')){
  const s=document.createElement('script');
  s.type='application/ld+json';
  s.dataset.orgSchema='true';
  s.textContent=JSON.stringify({
    '@context':'https://schema.org','@type':'Organization',
    'name':'Unique Otomotiv Kimya Sanayi Limited Şirketi',
    'url':'https://www.uniqueholding.com.tr/',
    'brand':{'@type':'Brand','name':'Unique Holding'},
    'description':'Istanbul-based industrial trading activity in petrochemicals and chemicals, alongside specialist technology and intelligence ventures.',
    'address':{'@type':'PostalAddress','streetAddress':'29 Ekim Cad. Yenibosna Merkez Mah., İstanbul Vizyon Park Plazaları A1 Blok, Kat 9, Daire 98','addressLocality':'Bahçelievler','addressRegion':'İstanbul','addressCountry':'TR'},
    'telephone':'+90 212 727 22 22','email':'farahmand@uniqueholding.com.tr',
    'contactPoint':[{'@type':'ContactPoint','contactType':'industrial sales','telephone':'+90 212 727 22 22','email':'sales@uniqueholding.com.tr'}]
  });
  document.head.append(s);
}

/* Phase 03 — one shared navigation and footer architecture. */
let main=document.querySelector('main');
if(main&&!main.id)main.id='main';
let skipLink=document.querySelector('.skip-link');
if(!skipLink&&main){
  skipLink=document.createElement('a');
  skipLink.className='skip-link';
  skipLink.href='#main';
  skipLink.textContent='Skip to content';
  document.body.insertBefore(skipLink,document.body.firstChild);
}
let header=document.querySelector('[data-header]');
if(!header&&main){
  header=document.createElement('header');
  header.className='site-header is-scrolled';
  header.dataset.header='';
  header.innerHTML=`<div class="nav-shell"><a class="brand" href="index.html" aria-label="Unique Holding home"><span class="brand-symbol" aria-hidden="true"><i></i><i></i></span><span class="brand-type"><b>UNIQUE HOLDING</b><small>ISTANBUL · TÜRKİYE</small></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open navigation"><span></span><span></span></button><nav id="primary-nav" class="primary-nav" aria-label="Primary navigation"></nav></div>`;
  document.body.insertBefore(header,main);
}
let footer=document.querySelector('.site-footer');
if(!footer&&main){
  footer=document.createElement('footer');
  footer.className='site-footer';
  main.insertAdjacentElement('afterend',footer);
}
const menu=header?.querySelector('.menu-toggle')||null;
const nav=header?.querySelector('.primary-nav')||null;
const brand=header?.querySelector('.brand')||null;

const globalNav=[
  {key:'corporate',label:'Corporate',href:'corporate.html'},
  {key:'energy',label:'Energy & Trade',href:'energy.html'},
  {key:'technology',label:'Technology',href:'technology.html'},
  {key:'portfolio',label:'Portfolio',href:'ventures.html'},
  {key:'contact',label:'Contact',href:'contact.html'}
];
const activeRoute={
  corporate:'corporate',
  energy:'energy',products:'energy',product:'energy','urea-46':'energy','caustic-soda-solid':'energy','sodium-sulphate-anhydrous':'energy',
  technology:'technology','evidence-axis':'technology',
  ventures:'portfolio',
  contact:'contact',
  sales:'sales'
}[page]||'';

if(brand){
  brand.setAttribute('href','index.html');
  brand.setAttribute('aria-label','Unique Holding home');
}

if(nav){
  nav.setAttribute('aria-label','Primary navigation');
  nav.innerHTML=[
    ...globalNav.map(item=>`<a href="${item.href}" data-nav-key="${item.key}"${activeRoute===item.key?' aria-current="page"':''}>${item.label}</a>`),
    `<a class="sales-link nav-cta" href="sales.html" data-nav-key="sales"${activeRoute==='sales'?' aria-current="page"':''}>Industrial Sales</a>`
  ].join('');
}

if(footer){
  footer.setAttribute('aria-label','Global footer');
  footer.innerHTML=`
    <div class="global-footer-shell">
      <div class="global-footer-lead">
        <a class="global-footer-brand" href="index.html" aria-label="Unique Holding home">
          <span class="brand-symbol" aria-hidden="true"><i></i><i></i></span>
          <span><b>UNIQUE HOLDING</b><small>Istanbul · Türkiye</small></span>
        </a>
        <p>Industrial trade, technology and specialist ventures under one corporate identity.</p>
        <a class="global-footer-cta" href="sales.html">Industrial Sales <span aria-hidden="true">↗</span></a>
      </div>
      <nav class="global-footer-nav" aria-label="Footer navigation">
        <div><h2>Business Areas</h2><a href="energy.html">Energy &amp; Trade</a><a href="technology.html">Technology</a><a href="ventures.html">Portfolio</a><a href="evidence-axis.html">Evidence Axis</a></div>
        <div><h2>Corporate</h2><a href="corporate.html">Corporate Profile</a><a href="contact.html">Contact</a></div>
        <div><h2>Commercial</h2><a href="products.html">Products</a><a href="sales.html">Industrial Sales</a></div>
        <div><h2>Legal</h2><a href="privacy.html">Privacy &amp; Cookies</a><a href="legal.html">Legal Notice</a></div>
      </nav>
      <div class="global-footer-company">
        <div class="global-footer-company-name"><span>Industrial operating company</span><strong>Unique Otomotiv Kimya Sanayi Limited Şirketi</strong></div>
        <address>29 Ekim Cad. Yenibosna Merkez Mah.<br>İstanbul Vizyon Park Plazaları A1 Blok, Kat 9, Daire 98<br>Bahçelievler / İstanbul, Türkiye</address>
        <div class="global-footer-contact"><a href="tel:+902127272222">+90 212 727 22 22</a><a href="tel:+905393809197">+90 539 380 91 97</a><a href="mailto:farahmand@uniqueholding.com.tr">farahmand@uniqueholding.com.tr</a><a href="mailto:sales@uniqueholding.com.tr">sales@uniqueholding.com.tr</a></div>
      </div>
      <div class="global-footer-bottom"><span>© 2026 Unique Holding</span><span>Istanbul · Türkiye</span></div>
    </div>`;
}

let menuOpen=false;
let brandTabindex=null;
let skipTabindex=null;
const navFocusables=()=>nav?[menu,...nav.querySelectorAll('a[href]')].filter(Boolean):[];
const setInert=(node,value)=>{if(node&&'inert'in node)node.inert=value;};
const disableBackgroundFocus=()=>{
  setInert(main,true);
  setInert(footer,true);
  if(brand){brandTabindex=brand.getAttribute('tabindex');brand.setAttribute('tabindex','-1');}
  if(skipLink){skipTabindex=skipLink.getAttribute('tabindex');skipLink.setAttribute('tabindex','-1');}
};
const restoreBackgroundFocus=()=>{
  setInert(main,false);
  setInert(footer,false);
  if(brand){brandTabindex===null?brand.removeAttribute('tabindex'):brand.setAttribute('tabindex',brandTabindex);}
  if(skipLink){skipTabindex===null?skipLink.removeAttribute('tabindex'):skipLink.setAttribute('tabindex',skipTabindex);}
};
const openMenu=()=>{
  if(!nav||!menu||menuOpen)return;
  menuOpen=true;
  nav.classList.add('is-open');
  menu.setAttribute('aria-expanded','true');
  menu.setAttribute('aria-label','Close navigation');
  document.body.classList.add('nav-open');
  disableBackgroundFocus();
  requestAnimationFrame(()=>nav.querySelector('a[href]')?.focus());
};
const closeMenu=(restoreFocus=true)=>{
  if(!nav||!menu||!menuOpen)return;
  menuOpen=false;
  nav.classList.remove('is-open');
  menu.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-label','Open navigation');
  document.body.classList.remove('nav-open');
  restoreBackgroundFocus();
  if(restoreFocus)menu.focus();
};

const setHeader=()=>header?.classList.toggle('is-scrolled',window.scrollY>30);
setHeader();
addEventListener('scroll',setHeader,{passive:true});
menu?.addEventListener('click',()=>menuOpen?closeMenu(true):openMenu());
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>closeMenu(false)));
addEventListener('keydown',event=>{
  if(!menuOpen)return;
  if(event.key==='Escape'){
    event.preventDefault();
    closeMenu(true);
    return;
  }
  if(event.key!=='Tab')return;
  const items=navFocusables();
  if(!items.length)return;
  const first=items[0];
  const last=items[items.length-1];
  const current=document.activeElement;
  if(!items.includes(current)){
    event.preventDefault();
    (event.shiftKey?last:first).focus();
    return;
  }
  if(event.shiftKey&&current===first){
    event.preventDefault();
    last.focus();
  }else if(!event.shiftKey&&current===last){
    event.preventDefault();
    first.focus();
  }
});
addEventListener('resize',()=>{if(innerWidth>1180)closeMenu(false)},{passive:true});
