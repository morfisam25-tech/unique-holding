const fs=require('fs');
const p='scripts/qa-site.mjs';
let s=fs.readFileSync(p,'utf8');
const old="if(!products.includes('html{scroll-behavior:auto}.catalog-anchor{scroll-margin-top:96px}'))errors.push('products.html: native fragment landing must be immediate and use standards-based scroll-margin');";
const next="if(!products.includes('assets/products-ia.css')||!read('assets/products-ia.css').includes('html{scroll-behavior:auto}.catalog-anchor{scroll-margin-top:96px}'))errors.push('products.html: native fragment landing must be immediate and use standards-based scroll-margin');";
if(!s.includes(old))throw new Error('Legacy fragment guard not found');
s=s.replace(old,next);
fs.writeFileSync(p,s);
