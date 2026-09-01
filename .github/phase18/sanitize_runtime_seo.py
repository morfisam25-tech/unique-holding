from pathlib import Path
import re

root=Path.cwd()
site=root/'assets/site.js'
s=site.read_text(encoding='utf-8')
start="const addHeadLink=(rel,href,type)=>{if(document.head.querySelector(`link[href=\"${href}\"]`))return;const link=document.createElement('link');link.rel=rel;link.href=href;if(type)link.type=type;document.head.append(link)};\n"
end="\n/* Phase 03 — behavior only. Global navigation and footer are static HTML. */"
if start not in s or end not in s:
    raise SystemExit('Legacy runtime SEO block boundaries not found; stop rather than guess.')
left=s.index(start)
right=s.index(end)
replacement="const coreProductRoutes={'urea-46':'urea-46.html','caustic-soda-solid':'caustic-soda-solid.html','sodium-sulphate-anhydrous':'sodium-sulphate-anhydrous.html'};\ndocument.querySelectorAll('a[href^=\"product.html?slug=\"]').forEach(a=>{try{const slug=new URL(a.href,location.href).searchParams.get('slug');if(coreProductRoutes[slug])a.href=coreProductRoutes[slug]}catch{}});\nif(page==='product'){const slug=new URLSearchParams(location.search).get('slug');if(coreProductRoutes[slug])location.replace(coreProductRoutes[slug])}\n"
# The replacement retains only the existing product-route behavior that sat inside the removed block.
s=s[:left]+replacement+s[right:]
for forbidden in ['const addMeta=','data-org-schema','application/ld+json',"addMeta('property','og:","addMeta('name','twitter:","addHeadLink('icon'"]:
    if forbidden in s:
        raise SystemExit(f'Runtime SEO injection remained after sanitization: {forbidden}')
site.write_text(s,encoding='utf-8')

# Correct the generated audit wording to reflect the narrow runtime-SEO cleanup.
audit=root/'docs/qa/phase18-seo-social-audit.md'
a=audit.read_text(encoding='utf-8')
a=a.replace('- Phase 18 changes only HTML head metadata on the 16 routes. Source `<body>` markup hashes are unchanged on all 16 routes.', '- Phase 18 changes HTML head metadata on the 16 routes and removes the legacy runtime OG/Twitter/Organization-JSON-LD injection from `assets/site.js`. Navigation, RFQ and other runtime behavior remain outside this cleanup. Source `<body>` markup hashes are unchanged on all 16 routes.')
a=a.replace('- No `meta keywords`, hreflang, SearchAction, Twitter/X account metadata, unverified LinkedIn/Instagram URLs, or social `sameAs` entries were added.', '- No `meta keywords`, hreflang, SearchAction, Twitter/X account metadata, unverified LinkedIn/Instagram URLs, or social `sameAs` entries were added. Legacy JS injection of social metadata and Organization JSON-LD was removed so the final SEO layer is static in source HTML.')
audit.write_text(a,encoding='utf-8')

# Strengthen the generated Phase 18 QA with static-source/runtime-injection
# guards and source-accurate Phase 17 legal-boundary checks.
qa=root/'scripts/qa-seo.mjs'
q=qa.read_text(encoding='utf-8')
needle="for(const file of ['assets/site.js','assets/products-data.js']){const s=read(file);if(/meta\\s*\\[?name\\s*=\\s*[\"']robots|querySelector\\([^)]*robots|setAttribute\\([^)]*robots/i.test(s))fail(`${file}: runtime robots mutation detected`)}"
replacement_js=needle+"\nconst runtimeSite=read('assets/site.js');for(const rx of [/document\\.createElement\\(\\s*[\"']meta[\"']/i,/application\\/ld\\+json/i,/data-org-schema/i,/addMeta\\s*\\(/i,/og:title/i,/twitter:card/i])if(rx.test(runtimeSite))fail(`assets/site.js: SEO-critical metadata must not be injected at runtime -> ${rx}`);"
if needle not in q:
    raise SystemExit('qa-seo runtime guard insertion point missing')
q=q.replace(needle,replacement_js,1)

old="const phase17Files=['privacy.html','legal.html'];for(const route of phase17Files){const body=read(route).slice(read(route).search(/<body\\b/i));if(!/LEGAL REVIEW REQUIRED/i.test(body))fail(`${route}: Phase 17 legal-review status missing`)}"
new="const privacyBody=read('privacy.html').slice(read('privacy.html').search(/<body\\b/i));const legalBody=read('legal.html').slice(read('legal.html').search(/<body\\b/i));if(!/Legal review required/i.test(privacyBody))fail('privacy.html: Phase 17 legal-review boundary missing');if(!/does not add an unreviewed governing-law, jurisdiction, warranty, liability, arbitration or browsing-acceptance clause/i.test(legalBody))fail('legal.html: Phase 17 legal boundary missing');if(!/does not create a separate legal entity named [“\"]Unique Holding[”\"]/i.test(legalBody))fail('legal.html: Phase 17 group-entity boundary missing');"
if old not in q:
    raise SystemExit('qa-seo Phase 17 legal guard replacement point missing')
q=q.replace(old,new,1)
qa.write_text(q,encoding='utf-8')
print('Runtime SEO injection removed; static-source and Phase 17 boundary QA guards installed.')
