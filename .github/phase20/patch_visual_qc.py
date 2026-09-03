from pathlib import Path
import sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2]); s=src.read_text(encoding='utf-8')
needle="async function capture(browser,item){const p=await newPage(browser,item.w,item.h);"
insert="async function primeFullPage(page){const total=await page.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<total;y+=600){await page.evaluate(v=>scrollTo(0,v),y);await new Promise(r=>setTimeout(r,35));}await page.evaluate(()=>scrollTo(0,0));await new Promise(r=>setTimeout(r,180));}\n"
if needle not in s: raise SystemExit('capture marker missing')
s=s.replace(needle,insert+needle,1)
needle="await sleep(item.route==='index.html'?2200:700);const visual=await inspectPage(p);"
replace="await sleep(item.route==='index.html'?2200:700);await primeFullPage(p);const visual=await inspectPage(p);"
if needle not in s: raise SystemExit('capture wait marker missing')
s=s.replace(needle,replace,1)
needle="// RFQ form filled / long input state\n p=await newPage(browser,390,844);await p.goto(BASE+'contact.html',{waitUntil:'load'});"
replace="// RFQ form filled / long input state\n p=await newPage(browser,390,844);await p.goto(BASE+'sales.html',{waitUntil:'load'});"
if needle not in s: raise SystemExit('RFQ route marker missing')
s=s.replace(needle,replace,1)
dst.write_text(s,encoding='utf-8')
print('Phase 20 visual harness patched: scroll-prime full-page capture; RFQ visual state uses sales.html.')
