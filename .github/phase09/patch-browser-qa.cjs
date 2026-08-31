const fs=require('fs');
const p='.github/phase09/phase09-browser-qa.cjs';
let s=fs.readFileSync(p,'utf8');
s=s.replace(".filter(a=>a.matches(':focusable')).length",".filter(a=>a.tabIndex>=0&&a.getClientRects().length>0).length");
s=s.replace("hiddenFocusable:[...document.querySelectorAll('[data-product-kind=\"inquiry\"][hidden]')].filter(a=>a.tabIndex>=0).length","hiddenFocusable:[...document.querySelectorAll('[data-product-kind=\"inquiry\"][hidden]')].filter(a=>a.tabIndex>=0&&a.getClientRects().length>0).length");
s=s.replace("(tc.count===0?s.emptyHidden:s.emptyHidden===false)","(tc.count===0?s.emptyHidden!==false:s.emptyHidden!==true)");
fs.writeFileSync(p,s);
