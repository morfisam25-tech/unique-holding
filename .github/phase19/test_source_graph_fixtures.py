import json, os, sys
from collections import Counter
from performance_source_classifier import extract_source_graph, logical_asset, changed_responsible_files

BASE=os.environ.get('PHASE19_BASE','8d2811298c668865f5438f86337c9d8f9d959c80')
HOME_W1800='https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&ixlib=rb-4.1.0&q=72&w=1800'
ENERGY_W3000='https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000'
ENERGY_ASSET='unsplash:images.unsplash.com:photo-1778403393892-5334f4561b59'

def sig(r): return (r['exactUrl'],r['sourceFile'],r['declarationType'])
def refs_for(g,url): return [r for r in g['references'] if r['exactUrl']==url]
def asset_refs(g,aid): return [r for r in g['references'] if r.get('logicalAsset')==aid]

fixtures=[]
def add(name, ok, evidence): fixtures.append({'name':name,'pass':bool(ok),'evidence':evidence})

b_index=extract_source_graph('baseline',BASE,'index.html'); a_index=extract_source_graph('candidate',BASE,'index.html')
b_home=refs_for(b_index,HOME_W1800); a_home=refs_for(a_index,HOME_W1800)
b_pre=[r for r in b_home if r['sourceFile']=='index.html' and r['declarationType']=='preload-image']
a_pre=[r for r in a_home if r['sourceFile']=='index.html' and r['declarationType']=='preload-image']
home_asset=logical_asset(HOME_W1800,'Image')
add('A — HOMEPAGE PRELOAD REMOVAL', bool(b_pre) and not a_pre and home_asset in a_index['logicalAssets'], {'baselinePreloadRefs':b_pre,'candidatePreloadRefs':a_pre,'candidateLogicalAssetPresent':home_asset in a_index['logicalAssets']})

b_products=extract_source_graph('baseline',BASE,'products.html'); a_products=extract_source_graph('candidate',BASE,'products.html')
b_energy=asset_refs(b_products,ENERGY_ASSET); a_energy=asset_refs(a_products,ENERGY_ASSET)
bc=Counter(sig(r) for r in b_energy); ac=Counter(sig(r) for r in a_energy)
added=[]
for s,n in (ac-bc).items(): added += [next(r for r in a_energy if sig(r)==s)]*n
changed=changed_responsible_files(BASE,b_products,a_products,ENERGY_ASSET)
b_exact=refs_for(b_products,ENERGY_W3000); a_exact=refs_for(a_products,ENERGY_W3000)
add('D — PRODUCTS DESKTOP SOURCE GRAPH', bool(b_energy) and bool(a_energy) and not added and not changed, {'baselineLogicalRefs':b_energy,'candidateLogicalRefs':a_energy,'candidateAddedDeclarations':added,'responsibleSourceFilesChanged':changed,'baselineExactW3000Refs':b_exact,'candidateExactW3000Refs':a_exact})

report={'fixtureCount':len(fixtures),'passed':sum(x['pass'] for x in fixtures),'failed':sum(not x['pass'] for x in fixtures),'fixtures':fixtures}
print(json.dumps(report,indent=2))
if report['failed']: sys.exit(1)
