import json, sys
from performance_source_classifier import classify_variant

URL='https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000'
HOME='https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&ixlib=rb-4.1.0&q=72&w=1800'
fixtures=[]

def add(name, expected_status, expected_class_contains, **kw):
    result=classify_variant(**kw)
    ok=result['status']==expected_status and expected_class_contains in result['classification']
    fixtures.append({'name':name,'expectedStatus':expected_status,'expectedClassContains':expected_class_contains,'actual':result,'pass':ok})

add('A — HOMEPAGE PRELOAD REMOVAL','PASS','SOURCE-REMOVED OPTIMIZATION',
    url=HOME,resource_class='Image',baseline_occurrences=2,candidate_occurrences=0,
    baseline_source_exact=True,candidate_source_exact=False,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=True)

add('B — SALES STOCHASTIC','PASS','RUNTIME-ONLY STOCHASTIC VARIANT',
    url=URL,resource_class='Image',baseline_occurrences=2,candidate_occurrences=1,
    baseline_source_exact=True,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=False)

add('C — PRODUCTS MOBILE','PASS','RUNTIME-ONLY STOCHASTIC VARIANT',
    url=URL,resource_class='Image',baseline_occurrences=1,candidate_occurrences=0,
    baseline_source_exact=True,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=False)

add('D — PRODUCTS DESKTOP CURRENT CASE','PASS','RUNTIME-ONLY STOCHASTIC VARIANT',
    url=URL,resource_class='Image',baseline_occurrences=0,candidate_occurrences=1,
    baseline_source_exact=True,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=False)

add('E — SYNTHETIC REAL REGRESSION','FAIL','REAL PERFORMANCE REGRESSION',
    url=URL,resource_class='Image',baseline_occurrences=0,candidate_occurrences=2,
    baseline_source_exact=False,candidate_source_exact=True,
    baseline_logical_source=True,candidate_logical_source=True,
    responsible_source_changed=True)

add('F — SYNTHETIC NEW HOST','FAIL','REAL PERFORMANCE REGRESSION',
    url='https://new.example.invalid/new-image.jpg',resource_class='Image',baseline_occurrences=0,candidate_occurrences=2,
    baseline_source_exact=False,candidate_source_exact=False,
    baseline_logical_source=False,candidate_logical_source=False,
    responsible_source_changed=False,candidate_only_host=True)

report={'fixtureCount':len(fixtures),'passed':sum(1 for x in fixtures if x['pass']),'failed':sum(1 for x in fixtures if not x['pass']),'fixtures':fixtures}
print(json.dumps(report,indent=2))
if report['failed']:
    sys.exit(1)
