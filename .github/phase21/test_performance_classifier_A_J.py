import json, sys
from performance_source_classifier import classify_variant
from source_inert_media_model import classify_source_inert_media

URL='https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000'
HOME='https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&ixlib=rb-4.1.0&q=72&w=1800'
fixtures=[]

def add_legacy(name, expected_status, expected_class_contains, **kw):
    result=classify_variant(**kw)
    ok=result['status']==expected_status and expected_class_contains in result['classification']
    fixtures.append({'name':name,'expectedStatus':expected_status,'expectedClassContains':expected_class_contains,'actual':result,'pass':ok})

def add_inert(name, expected_status, expected_class_contains, **kw):
    result=classify_source_inert_media(**kw)
    ok=result['status']==expected_status and expected_class_contains in result['classification']
    fixtures.append({'name':name,'expectedStatus':expected_status,'expectedClassContains':expected_class_contains,'actual':result,'pass':ok})

# Existing fixtures A-F retained verbatim in behavioral intent.
add_legacy('A — HOMEPAGE PRELOAD REMOVAL','PASS','SOURCE-REMOVED OPTIMIZATION',
    url=HOME,resource_class='Image',baseline_occurrences=2,candidate_occurrences=0,
    baseline_source_exact=True,candidate_source_exact=False,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=True)

add_legacy('B — SALES STOCHASTIC','PASS','RUNTIME-ONLY STOCHASTIC VARIANT',
    url=URL,resource_class='Image',baseline_occurrences=2,candidate_occurrences=1,
    baseline_source_exact=True,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=False)

add_legacy('C — PRODUCTS MOBILE','PASS','RUNTIME-ONLY STOCHASTIC VARIANT',
    url=URL,resource_class='Image',baseline_occurrences=1,candidate_occurrences=0,
    baseline_source_exact=True,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=False)

add_legacy('D — PRODUCTS DESKTOP CURRENT CASE','PASS','RUNTIME-ONLY STOCHASTIC VARIANT',
    url=URL,resource_class='Image',baseline_occurrences=0,candidate_occurrences=1,
    baseline_source_exact=True,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=False)

add_legacy('E — SYNTHETIC REAL REGRESSION','FAIL','REAL PERFORMANCE REGRESSION',
    url=URL,resource_class='Image',baseline_occurrences=0,candidate_occurrences=2,
    baseline_source_exact=False,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=True)

add_legacy('F — SYNTHETIC NEW HOST','FAIL','REAL PERFORMANCE REGRESSION',
    url='https://new.example.invalid/new-image.jpg',resource_class='Image',baseline_occurrences=0,candidate_occurrences=2,
    baseline_source_exact=False,candidate_source_exact=False,
    baseline_logical_source=False,candidate_logical_source=False,
    responsible_source_changed=False,candidate_only_host=True)

common=dict(
    baseline_logical_source=True,
    candidate_logical_source=True,
    responsible_source_changed=False,
    candidate_added_media_declaration=False,
    candidate_only_host=False,
    candidate_only_resource_class=False,
    baseline_effective_suppressed=True,
    candidate_effective_suppressed=True,
    baseline_suppression_stable=True,
    candidate_suppression_stable=True,
    affected_region_visual_regression=False,
    geometry_regression=False,
    intended_media_disappears=False,
    cls_regression=False,
    deterministic_graph_regression=False,
    full_page_visual_covered_separately=True,
)

add_inert('G — SOURCE-INERT MEDIA','PASS','SOURCE-INERT ASSET',**common)

h=dict(common)
h['unrelated_outside_region_raster_delta']=True
add_inert('H — UNRELATED OUTSIDE-REGION RASTER DELTA','PASS','SOURCE-INERT ASSET',**h)

i=dict(common)
i['candidate_effective_suppressed']=False
add_inert('I — OVERRIDE REMOVED','FAIL','REAL PERFORMANCE REGRESSION',**i)

j=dict(common)
j['responsible_source_changed']=True
j['candidate_added_media_declaration']=True
add_inert('J — RESPONSIBLE SOURCE CHANGED','FAIL','REAL PERFORMANCE REGRESSION',**j)

report={'fixtureCount':len(fixtures),'passed':sum(1 for x in fixtures if x['pass']),'failed':sum(1 for x in fixtures if not x['pass']),'fixtures':fixtures}
print(json.dumps(report,indent=2))
if report['fixtureCount']!=10 or report['passed']!=10 or report['failed']!=0:
    sys.exit(1)
