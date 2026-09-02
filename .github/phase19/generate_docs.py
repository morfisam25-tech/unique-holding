from pathlib import Path
import json, statistics, os, urllib.parse
ROOT=Path.cwd(); PACK=Path(os.environ.get('PHASE19_PACKET','/tmp/phase19-review'))
BEFORE=PACK/'before'; AFTER=PACK/'after'; REG=PACK/'regression'
b=json.loads((BEFORE/'phase19-baseline.json').read_text()); a=json.loads((AFTER/'phase19-baseline.json').read_text()); g=json.loads((REG/'phase19-regression.json').read_text())

def median_rows(data):
 d={}
 for x in data['performance']:
  k=(x['route'],x['w'],x['h']); d.setdefault(k,[]).append(x)
 out={}
 for k,v in d.items():
  med=lambda key:int(statistics.median([x[key] for x in v]))
  t=[x['timing'] for x in v]
  out[k]={'requests':med('requests'),'transfer':med('transfer'),'image':med('image'),'css':med('css'),'js':med('js'),'video':med('video'),'thirdParty':med('thirdParty'),'cls':round(statistics.median([x['cls'] for x in t]),5),'fcp':round(statistics.median([x['fcp'] or 0 for x in t]),1),'lcp':round(statistics.median([(x['lcp'] or {}).get('startTime',0) for x in t]),1)}
 return out
bm,am=median_rows(b),median_rows(a)

def fmt(n): return f'{n:,}'
def axe_summary(data):
 s={'critical':0,'serious':0,'moderate':0,'minor':0,'contexts':len(data['accessibility'])}
 rules={}
 for c in data['accessibility']:
  for k in ['critical','serious','moderate','minor']: s[k]+=c['counts'].get(k,0)
  for v in c['violations']:
   key=(v.get('impact') or 'unknown',v['id']); z=rules.setdefault(key,{'contexts':0,'nodes':0,'routes':set()});z['contexts']+=1;z['nodes']+=len(v['nodes']);z['routes'].add(c['route'])
 return s,rules
baxe,brules=axe_summary(b); aaxe,arules=axe_summary(a)
# budgets based on baseline, structural not timing-score thresholds
bud=[]
for k,bv in bm.items():
 av=am[k]; bud.append({'case':k,'requestDelta':av['requests']-bv['requests'],'transferPct':(av['transfer']/bv['transfer']-1)*100 if bv['transfer'] else 0,'thirdPartyDelta':av['thirdParty']-bv['thirdParty'],'clsDelta':av['cls']-bv['cls']})
# media rollup from final browser observation
med={}
for c in a['media']:
 for x in c['items']:
  u=x['url']; z=med.setdefault(u,{'kind':x['kind'],'routes':set(),'natural':x['natural'],'rendered':[],'above':False,'loading':x.get('loading'),'decoding':x.get('decoding'),'fetchpriority':x.get('fetchpriority'),'alt':x.get('alt')});z['routes'].add(c['route']);z['rendered'].append(x['rendered']);z['above']=z['above'] or x['aboveFold']
# exact remote perf resource examples
remote={}
for x in a['performance']:
 for r in x['resources']:
  if 'images.unsplash.com' in r['url']:
   z=remote.setdefault(r['url'],{'routes':set(),'sizes':[]});z['routes'].add(x['route']);z['sizes'].append(r.get('encoded',0))
# docs
perf=['# Phase 19 — Performance Audit','',f'Baseline: `8d2811298c668865f5438f86337c9d8f9d959c80`','', '## Method','', '- Representative routes measured at 1440×900 and 390×844.','- Two cold local-browser runs per route; medians are used for structural before/after comparison.','- Timing values are observations only; no statistical speedup claim is made from local synthetic timing.','- Performance budget is baseline-derived: no request/third-party increase, no material transfer regression, and no material CLS regression.','', '## Before / after','', '| Route | Viewport | Requests | Transfer | Image | Third-party | CLS | FCP obs. | LCP obs. |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
for k in sorted(bm):
 bv,av=bm[k],am[k]; route,w,h=k
 perf.append(f'| {route} | {w}×{h} | {bv["requests"]} → {av["requests"]} | {fmt(bv["transfer"])} → {fmt(av["transfer"])} B | {fmt(bv["image"])} → {fmt(av["image"])} B | {bv["thirdParty"]} → {av["thirdParty"]} | {bv["cls"]:.5f} → {av["cls"]:.5f} | {bv["fcp"]:.0f} → {av["fcp"]:.0f} ms | {bv["lcp"]:.0f} → {av["lcp"]:.0f} ms |')
perf += ['','## Evidence-backed changes','', '- Flattened the three CSS `@import` dependencies already loaded by `assets/site.css` into the same cascade layers. This removes three render-blocking request dependencies without deleting the source CSS files or changing selector content.','- Removed the homepage Unsplash image preload that duplicated the protected film poster request for the same photograph. The protected poster itself remains unchanged.','- Removed redundant `dns-prefetch` for Unsplash while retaining the stronger `preconnect` used by the first-view poster.','- No remote image was copied into the repository.','', '## Budget result','']
for z in bud:
 route,w,h=z['case']; perf.append(f'- `{route}` {w}×{h}: requests {z["requestDelta"]:+d}; transfer {z["transferPct"]:+.1f}%; third-party {z["thirdPartyDelta"]:+d}; CLS {z["clsDelta"]:+.5f}.')
perf += ['','## Film performance finding','', '`PHASE19-FILM-PERFORMANCE-001`: the protected film poster remains a fixed Unsplash `w=2000` request on mobile. Baseline local transfer was about 227 KB for that poster at 390×844. Correcting the poster width would modify protected hero/player markup, so Phase 19 reports the issue and does not change it. The 43.8 MB local MP4 is protected and was not recompressed. Python local static serving returned the MP4 with HTTP 200 rather than proving production range behavior, so production video-bandwidth/range performance is not asserted.','', '## Limits','', '- Local timing is noisy and not a substitute for production RUM.','- HTTPS/custom-domain release blocker remains open, so no production transport conclusion is claimed.']
(ROOT/'docs/qa/phase19-performance-audit.md').write_text('\n'.join(perf)+'\n',encoding='utf-8')

media=['# Phase 19 — Media Inventory','', 'No third-party image was localized. Provenance classes: `LOCAL-CONTROLLED`, `REMOTE-UNSPLASH-EXISTING`, `PROTECTED-FILM`.','', '| Asset / URL | Kind | Routes observed | Natural | Max rendered observed | Fold | Loading | Provenance | Action |','|---|---|---|---:|---:|---|---|---|---|']
for u,z in sorted(med.items()):
 nat='×'.join(map(str,z['natural'])) if z['natural'] else '—'; rr=max(z['rendered'],key=lambda q:q[0]*q[1]) if z['rendered'] else [0,0]; rend=f'{rr[0]}×{rr[1]}'; prov='REMOTE-UNSPLASH-EXISTING' if 'images.unsplash.com' in u else ('PROTECTED-FILM' if 'unique-holding-film-720p.mp4' in u else 'LOCAL-CONTROLLED'); action='KEEP — existing responsive CDN sizing retained' if prov=='REMOTE-UNSPLASH-EXISTING' else ('KEEP LOCKED — no Phase 19 film modification' if prov=='PROTECTED-FILM' else 'KEEP — local asset appropriately controlled')
 media.append(f'| `{u}` | {z["kind"]} | {", ".join(sorted(z["routes"]))} | {nat} | {rend} | {"above" if z["above"] else "below"} | {z.get("loading") or "default"} | {prov} | {action} |')
media += ['','## Remote Unsplash audit','', '- CSS background variants remain `w=1800 q=72` desktop and `w=1200 q=70` at ≤900px, with CDN format negotiation (`auto=format`).','- Energy, Products and Industrial Sales each observed one bounded remote background request per tested first view.','- Homepage duplicate preload was removed; the protected film poster remains the only first-view photograph request for that source.','- Existing Unsplash host was retained; no provenance or redistribution claim was manufactured.','', '## Loading decisions','', '- LCP/first-view media: EAGER/BACKGROUND as already designed; no blanket lazy loading.','- Below-fold `<img>` assets already using `loading="lazy"` remain lazy.','- Technology hero SVG remains eager/high-priority because it is above fold.','- Protected film remains `preload="metadata"`; reduced-motion gate remains unchanged.']
(ROOT/'docs/qa/phase19-media-inventory.md').write_text('\n'.join(media)+'\n',encoding='utf-8')

acc=['# Phase 19 — Accessibility Audit','', 'Engineering target: practical WCAG 2.2 AA behavior. This is not a certification or public compliance claim.','', '## Automated axe result','', f'- Contexts: {aaxe["contexts"]} / 32',f'- Critical: {aaxe["critical"]}',f'- Serious: {aaxe["serious"]}',f'- Moderate: {aaxe["moderate"]}',f'- Minor: {aaxe["minor"]}','', 'Baseline serious violations were color-contrast findings across all 32 contexts; the two baseline moderate findings were the nested complementary landmark on the homepage Evidence Axis sample. Both defect classes were corrected narrowly.','', '## Per-context matrix','', '| Route | Viewport | Critical | Serious | Moderate | Minor | Main/H1 | Keyboard | Alt/intrinsic |','|---|---:|---:|---:|---:|---:|---|---|---|']
kb={(x['route'],x['w'],x['h']):x for x in a['keyboard']}
for x in a['accessibility']:
 k=(x['route'],x['w'],x['h']); y=kb[k]; lm=x['landmarks']; imgs=lm['imgs']; altok=all(i['alt'] is not None and i['width'] is not None and i['height'] is not None for i in imgs)
 acc.append(f'| {x["route"]} | {x["w"]}×{x["h"]} | {x["counts"]["critical"]} | {x["counts"]["serious"]} | {x["counts"]["moderate"]} | {x["counts"]["minor"]} | {"PASS" if lm["main"]==1 and lm["h1"]==1 else "FAIL"} | {"PASS" if y["hiddenFocus"]==0 and y["tinyFocus"]==0 else "FAIL"} | {"PASS" if altok else "FAIL"} |')
acc += ['','## Keyboard / focus','', f'- 32 keyboard contexts traversed. Hidden-focus findings: {sum(x["hiddenFocus"] for x in a["keyboard"])}; zero-size focus findings: {sum(x["tinyFocus"] for x in a["keyboard"])}.','- Skip link is the first keyboard focus on every route and compact navigation open/Escape/focus restoration is covered by the Phase 19 regression suite.','- Existing visible focus treatments were preserved; no global brand-color replacement was made.','', '## Moderate / minor findings','']
remaining=[]
for (impact,rid),z in arules.items():
 if impact in ('moderate','minor'): remaining.append(f'- {impact.upper()} `{rid}` — {z["nodes"]} nodes in {z["contexts"]} contexts: {", ".join(sorted(z["routes"]))}.')
acc += remaining or ['- None in the final 32-context axe run.']
acc += ['','## Locked film-control note','', f'- Film controls below ~44px are reported rather than modified when protected: {len(g.get("film",{}).get("lockedTouchTargets",[]))} measured control(s). Film implementation hashes remain locked.','', '## Other regression coverage','', f'- 200% effective reflow: {g["summary"]["zoomCases"]} cases, {g["summary"]["zoomFailures"]} failures.',f'- Text spacing: {g["summary"]["textSpacingCases"]} cases, {g["summary"]["textSpacingFailures"]} failures.',f'- Forced colors: {g["summary"]["forcedColorsCases"]} cases, {g["summary"]["forcedColorsFailures"]} failures.',f'- Compact-nav keyboard: {g["summary"]["keyboardMenuCases"]} cases, {g["summary"]["keyboardMenuFailures"]} failures.','- RFQ labels, keyboard access, long-input mailto generation, reset behavior and mobile layout passed browser regression.']
(ROOT/'docs/qa/phase19-accessibility-audit.md').write_text('\n'.join(acc)+'\n',encoding='utf-8')

# machine-readable comparison used by gates and packet
summary={'baselineAxe':baxe,'afterAxe':aaxe,'routeMetrics':[],'regression':g['summary']}
for k in sorted(bm):summary['routeMetrics'].append({'route':k[0],'viewport':f'{k[1]}x{k[2]}','before':bm[k],'after':am[k]})
(PACK/'phase19-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({'baselineAxe':baxe,'afterAxe':aaxe,'regression':g['summary']},indent=2))
