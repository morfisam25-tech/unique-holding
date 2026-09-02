from pathlib import Path
import sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2])
s=src.read_text(encoding='utf-8')
old="const d=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,clipped:[...document.querySelectorAll('p,h1,h2,h3,button,a,input,textarea,select')].filter(e=>{const s=getComputedStyle(e);return s.overflow==='hidden'&&e.scrollHeight>e.clientHeight+2}).slice(0,10).map(e=>({tag:e.tagName,text:(e.textContent||e.value||'').trim().slice(0,60)}))}));"
new="const d=await page.evaluate(()=>{const visuallyHidden=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();const clipped=(s.clip&&s.clip!=='auto'&&s.clip!=='rect(auto, auto, auto, auto)')||(s.clipPath&&s.clipPath!=='none');return r.width<=1.5&&r.height<=1.5&&(s.position==='absolute'||s.position==='fixed')&&s.whiteSpace==='nowrap'&&s.overflow==='hidden'&&clipped};const candidates=[...document.querySelectorAll('p,h1,h2,h3,button,a,input,textarea,select')];const excluded=candidates.filter(visuallyHidden).map(e=>({tag:e.tagName,id:e.id||'',text:(e.textContent||e.value||'').trim().slice(0,80)}));const clipped=candidates.filter(e=>{if(visuallyHidden(e))return false;const s=getComputedStyle(e);return s.overflow==='hidden'&&e.scrollHeight>e.clientHeight+2}).slice(0,10).map(e=>({tag:e.tagName,text:(e.textContent||e.value||'').trim().slice(0,60)}));return{overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,clipped,visuallyHiddenExcluded:excluded}});"
if old not in s:
    raise SystemExit('Phase 19 spacing harness target not found')
s=s.replace(old,new,1)
dst.write_text(s,encoding='utf-8')
print('Phase 19 regression harness patched: intentionally visually-hidden semantic text excluded from clipping QA.')
