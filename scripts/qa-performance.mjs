import fs from 'node:fs';
const fail=m=>{console.error('PHASE 19 PERFORMANCE QA FAIL — '+m);process.exitCode=1};
const site=fs.readFileSync('assets/site.css','utf8'),index=fs.readFileSync('index.html','utf8');
for(const locked of ["@import url('site-legacy.css') layer(base);","@import url('polish.css') layer(polish);","@import url('performance.css') layer(performance);"])if(!site.includes(locked))fail('Phase 02 CSS architecture lock changed: '+locked);
if(/rel="preload"[^>]+images\.unsplash\.com/.test(index))fail('obsolete homepage Unsplash preload remains');
if(/dns-prefetch[^>]+images\.unsplash\.com/.test(index))fail('redundant homepage dns-prefetch remains');
if(!/rel="preconnect" href="https:\/\/images\.unsplash\.com"/.test(index))fail('useful homepage Unsplash preconnect missing');
if(!index.includes('poster="https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&fm=jpg&ixid=rb-4.1.0&q=60&w=2000"') && !index.includes('poster="https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=60&w=2000"'))fail('protected film poster changed');
console.log('PHASE 19 PERFORMANCE QA PASS');
