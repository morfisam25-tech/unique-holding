#!/usr/bin/env bash
set -euo pipefail

BASE='6f9d49cb96b4599f4518a07a5927090c6daea563'
MAIN='6d106520dd82bf4448312b5f45b54ae15981b1db'
TARGET='rebuild/award-level-corporate-v2'
PACKET='/tmp/phase18-review-packet'
QA='../qa-harness/.github/phase18'

rm -rf "$PACKET" /tmp/phase18-node
mkdir -p "$PACKET/reports"

echo '=== PREFLIGHT ==='
test "$(git rev-parse HEAD)" = "$BASE"
TARGET_BEFORE="$(git ls-remote origin "refs/heads/$TARGET" | cut -f1)"
MAIN_BEFORE="$(git ls-remote origin refs/heads/main | cut -f1)"
printf 'BASELINE=%s\nTARGET_BEFORE=%s\nMAIN_BEFORE=%s\n' "$BASE" "$TARGET_BEFORE" "$MAIN_BEFORE" | tee "$PACKET/reports/preflight.txt"
test "$TARGET_BEFORE" = "$BASE"
test "$MAIN_BEFORE" = "$MAIN"

python3 -m pip install --quiet Pillow==11.3.0
python3 -m py_compile "$QA/build_phase18.py" "$QA/build_phase18_v2.py" "$QA/sanitize_runtime_seo.py"
python3 "$QA/build_phase18_v2.py" | tee "$PACKET/reports/build.log"
python3 "$QA/sanitize_runtime_seo.py" | tee "$PACKET/reports/runtime-seo-cleanup.log"
node --check scripts/qa-seo.mjs

cat > /tmp/phase18-expected-files.txt <<'EOF'
404.html
assets/site.js
assets/social/evidence-axis.png
assets/social/group-corporate.png
assets/social/industrial-trade.png
assets/social/technology-intelligence.png
assets/social/venture-portfolio.png
caustic-soda-solid.html
contact.html
corporate.html
docs/qa/phase18-seo-social-audit.md
docs/qa/phase18-social-assets.md
docs/qa/phase18-structured-data-audit.md
energy.html
evidence-axis.html
index.html
legal.html
privacy.html
product.html
products.html
sales.html
scripts/qa-seo.mjs
sodium-sulphate-anhydrous.html
technology.html
urea-46.html
ventures.html
EOF
{ git diff --name-only; git ls-files --others --exclude-standard; } | sort -u > /tmp/phase18-actual-files.txt
echo '=== EXACT PRODUCT SCOPE ==='
diff -u /tmp/phase18-expected-files.txt /tmp/phase18-actual-files.txt
git diff --check
cp /tmp/phase18-actual-files.txt "$PACKET/reports/exact-files-changed.txt"

# Prove the two files intentionally audited unchanged remain byte-identical.
git diff --exit-code "$BASE" -- robots.txt sitemap.xml

# Static gates before any commit or branch movement.
node scripts/qa-site.mjs | tee "$PACKET/reports/qa-site-precommit.log"
PHASE18_QA_OUT="$PACKET/reports" node scripts/qa-seo.mjs | tee "$PACKET/reports/qa-seo-precommit.log"
grep -q 'TECHNICAL QA PASS' "$PACKET/reports/qa-site-precommit.log"
grep -q 'REFERENCE DETAIL=3 / INQUIRY DETAIL=62 / INVALID=0' "$PACKET/reports/qa-site-precommit.log"
grep -q 'RELEASE-BLOCKER-HTTPS-001 STATUS: OPEN' "$PACKET/reports/qa-site-precommit.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACKET/reports/qa-seo-precommit.log"

# Browser acceptance on the uncommitted candidate tree.
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)"
test -n "$CHROME"
mkdir -p /tmp/phase18-node
(
  cd /tmp/phase18-node
  npm init -y >/dev/null 2>&1
  npm install --no-save --ignore-scripts puppeteer-core@24.16.0 >/dev/null
)
python3 -m http.server 8000 --bind 127.0.0.1 >"$PACKET/reports/server.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
PHASE18_BROWSER_OUT="$PACKET" NODE_PATH='/tmp/phase18-node/node_modules' CHROME="$CHROME" node "$QA/browser_phase18.cjs" | tee "$PACKET/reports/browser-console.log"
kill "$SERVER_PID" 2>/dev/null || true
trap - EXIT

# Create the one authorized Phase 18 product commit only after all precommit gates pass.
mapfile -t FILES < /tmp/phase18-expected-files.txt
git add -- "${FILES[@]}"
test -z "$(git status --porcelain | grep '^??' || true)"
TESTED_TREE="$(git write-tree)"
printf 'TESTED_TREE=%s\n' "$TESTED_TREE" | tee "$PACKET/reports/tested-tree.txt"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git commit -m 'PHASE 18 — Establish search, structured data and social discovery'
NEW="$(git rev-parse HEAD)"
test "$(git rev-parse HEAD^)" = "$BASE"
test "$(git rev-parse HEAD^{tree})" = "$TESTED_TREE"

# Race-safe fast-forward only push. No force, no main mutation.
REMOTE_TARGET="$(git ls-remote origin "refs/heads/$TARGET" | cut -f1)"
REMOTE_MAIN="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$REMOTE_TARGET" = "$BASE"
test "$REMOTE_MAIN" = "$MAIN"
git push origin "HEAD:refs/heads/$TARGET"
TARGET_AFTER="$(git ls-remote origin "refs/heads/$TARGET" | cut -f1)"
MAIN_AFTER="$(git ls-remote origin refs/heads/main | cut -f1)"
test "$TARGET_AFTER" = "$NEW"
test "$MAIN_AFTER" = "$MAIN"
printf 'NEW_SHA=%s\nREBUILD_BRANCH=%s\nMAIN=%s\n' "$NEW" "$TARGET_AFTER" "$MAIN_AFTER" | tee "$PACKET/reports/branch-readback.txt"

git diff-tree --no-commit-id --name-only -r "$NEW" | sort > /tmp/phase18-commit-files.txt
diff -u /tmp/phase18-expected-files.txt /tmp/phase18-commit-files.txt
cp /tmp/phase18-commit-files.txt "$PACKET/reports/commit-files.txt"
git show --stat --oneline "$NEW" > "$PACKET/reports/commit-stat.txt"
git show --no-patch --format=fuller "$NEW" > "$PACKET/reports/commit-metadata.txt"

# Repeat static gates against the exact committed tree.
test "$(git rev-parse HEAD)" = "$NEW"
node scripts/qa-site.mjs | tee "$PACKET/reports/qa-site-postcommit.log"
PHASE18_QA_OUT="$PACKET/reports" node scripts/qa-seo.mjs | tee "$PACKET/reports/qa-seo-postcommit.log"
grep -q 'TECHNICAL QA PASS' "$PACKET/reports/qa-site-postcommit.log"
grep -q 'PHASE 18 SEO QA PASS' "$PACKET/reports/qa-seo-postcommit.log"
test -z "$(git status --porcelain)"

mkdir -p "$PACKET/audits" "$PACKET/social-assets"
cp docs/qa/phase18-seo-social-audit.md "$PACKET/audits/"
cp docs/qa/phase18-structured-data-audit.md "$PACKET/audits/"
cp docs/qa/phase18-social-assets.md "$PACKET/audits/"
cp assets/social/*.png "$PACKET/social-assets/"

NEW_SHA="$NEW" python3 - <<'PY'
from pathlib import Path
import json, os
p=Path('/tmp/phase18-review-packet')
seo=json.loads((p/'reports/phase18-seo-qa-report.json').read_text())
b=json.loads((p/'reports/phase18-browser-report.json').read_text())
new=os.environ['NEW_SHA']
files=(p/'reports/commit-files.txt').read_text().strip().splitlines()
s=seo['summary']; bs=b['summary']
sections=[]
def add(n,title,text): sections.extend([f'## {n}. {title}', '', text, ''])
lines=['# PHASE 18 — REVIEW PACKET','', 'STATUS: READY FOR EXTERNAL REVIEW','', 'BASELINE SHA: `6f9d49cb96b4599f4518a07a5927090c6daea563`','',f'NEW SHA: `{new}`','']
add(1,'EXACT FILES CHANGED','\n'.join(f'- `{x}`' for x in files))
add(2,'INDEXABILITY MATRIX — ALL 16 ROUTES','See `audits/phase18-seo-social-audit.md`. 14 indexable / 2 noindex.')
add(3,'TITLE MATRIX',f"See audit. Indexable title duplicates: {s['titleDuplicates']}.")
add(4,'META DESCRIPTION MATRIX',f"See audit. Indexable description duplicates: {s['descriptionDuplicates']}.")
add(5,'CANONICAL MATRIX',f"See audit. Indexable canonical duplicates: {s['canonicalDuplicates']}.")
add(6,'ROBOTS META MATRIX','14 routes = `index,follow`; `product.html` and `404.html` = `noindex,follow`.')
add(7,'GENERIC PRODUCT ROUTER SEO DECISION','`product.html` remains crawlable `noindex,follow` and self-canonical to `/product.html`; query variants are excluded from the sitemap.')
add(8,'404 SEO DECISION','`404.html` remains `noindex,follow`, has no canonical and is excluded from the sitemap. Production HTTP status is not inferred from local static serving.')
add(9,'OPEN GRAPH MATRIX','All 14 indexable routes have static OG title, description, website type, canonical URL, local image, 1200×630 dimensions, alt, site name and en_US locale.')
add(10,'TWITTER CARD MATRIX','All 14 indexable routes use static `summary_large_image`; no unverified account metadata.')
add(11,'SOCIAL IMAGE SYSTEM','Five controlled local 1200×630 PNG cards: corporate, industrial/trade, technology/intelligence, Evidence Axis and venture portfolio.')
add(12,'SOCIAL ASSET PROVENANCE','See `audits/phase18-social-assets.md`; every asset status is VERIFIED.')
add(13,'REMOTE SOCIAL IMAGE REMOVAL','PASS. OG/Twitter images use only `https://www.uniqueholding.com.tr/assets/social/...`; no Unsplash social-preview dependency remains.')
add(14,'ORGANIZATION STRUCTURED DATA','Homepage conservative Organization `#organization`: name + canonical URL only beyond type/id. No legalName or legal relationship fields.')
add(15,'WEBSITE STRUCTURED DATA','Homepage WebSite `#website` with URL, name, language and publisher reference; no SearchAction.')
add(16,'WEBPAGE STRUCTURED DATA','Corporate=AboutPage; Products=CollectionPage; Contact=ContactPage; remaining indexable content routes=WebPage.')
add(17,'CORE PRODUCT STRUCTURED DATA','Three minimal Product mainEntity records. No Offer, price, availability, seller, manufacturer, brand, identifiers, rating or review.')
add(18,'PRODUCT TECHNICAL VALUE SCHEMA AUDIT','PASS. Values match the visible locked reference tables exactly; see structured-data audit.')
add(19,'EVIDENCE AXIS SCHEMA BOUNDARY','WebPage only. No subsidiary, parent/subOrganization, Service or SoftwareApplication relationship.')
add(20,'YEKI HAST SCHEMA BOUNDARY','No standalone structured-data entity; no public-availability or operating-company implication.')
add(21,'SAMEAS / SOCIAL IDENTITY DECISION','No sameAs. Evidence Axis external site is not encoded as sameAs for Unique Holding.')
add(22,'LINKEDIN DECISION','UNVERIFIED — NOT PUBLISHED.')
add(23,'INSTAGRAM DECISION','UNVERIFIED — NOT PUBLISHED.')
add(24,'ROBOTS.TXT','Audited byte-unchanged from Phase 17 baseline. Crawl allowed; sitemap declared; product router not blocked.')
add(25,'SITEMAP.XML','Audited byte-unchanged. Canonical HTTPS routes only; no query, 404, product router, fragments, external or GitHub Pages URLs.')
add(26,'SITEMAP ENTRY COUNT',f"{s['sitemapEntries']} / 14 PASS.")
add(27,'FAVICON AUDIT','`assets/favicon.svg` retained; local square 64×64 viewBox and statically referenced by all 16 routes.')
add(28,'JSON-LD PARSE RESULTS',f"PASS. {s['jsonLdEntities']} typed entities; parse failures 0.")
add(29,'STRUCTURED-DATA CLAIM AUDIT','PASS. No forbidden schema types/properties or conflicting full @id entities.')
add(30,'MACHINE-READABLE CLAIM SWEEP',f"Unsupported hits: {s['machineReadableHits']}.")
add(31,'TITLE / DESCRIPTION DUPLICATION QA',f"Titles {s['titleDuplicates']}; descriptions {s['descriptionDuplicates']}; canonicals {s['canonicalDuplicates']} duplicates.")
add(32,'STATIC SOURCE METADATA QA','PASS on required representative routes. Legacy runtime OG/Twitter/Organization JSON-LD injection was removed from `assets/site.js`.')
add(33,'SOCIAL CARD VISUAL QA',f"{bs['socialCardCases']} native/reduced browser checks; failures {bs['socialCardFailures']}. Original PNGs and captures are in the packet.")
add(34,'25 REPRESENTATIVE FIVE-VIEWPORT CASES',f"{bs['representativeCases']} cases; failures {bs['representativeFailures']}. Screenshots included.")
add(35,'32 SITE-WIDE SMOKE CASES',f"{bs['smokeCases']} cases; failures {bs['smokeFailures']}.")
add(36,'CORE PRODUCT REGRESSION',f"{bs['coreProductCases']} mobile cases; failures {bs['coreProductFailures']}. Reference status, sales routing and locked values retained.")
add(37,'PRIVACY / LEGAL REGRESSION',f"{bs['privacyLegalCases']} mobile cases; failures {bs['privacyLegalFailures']}. Phase 17 typography and legal-review boundaries retained.")
add(38,'ROBOTS / SITEMAP FETCH QA','PASS.' if bs['robotsSitemapPass'] else 'FAIL.')
add(39,'TECHNICAL QA','PASS: `node scripts/qa-site.mjs` + `node scripts/qa-seo.mjs`; Phase 09–17 locks and film hashes retained.')
add(40,'EXTERNAL LIVE VALIDATION LIMITATION','No claim of successful Google/LinkedIn/Facebook/X production fetch while the custom-domain HTTPS blocker remains open.')
add(41,'PHASE18-LIVE-SOCIAL-VALIDATION STATUS','DEFERRED UNTIL HTTPS RELEASE BLOCKER IS CLOSED.')
add(42,'RELEASE-BLOCKER-HTTPS-001 STATUS','OPEN.')
add(43,'LEGAL-PRIVACY-001 STATUS','OPEN / LEGAL REVIEW REQUIRED.')
add(44,'LEGAL-PRIVACY-002 STATUS','OPEN / LEGAL REVIEW REQUIRED.')
add(45,'SCREENSHOTS / ARTIFACT','25 representative + 3 core-product mobile + 2 Privacy/Legal mobile + 10 social native/reduced captures, reports, audits, original social cards and SHA256 manifest.')
add(46,'LIMITATIONS','Local/static SEO, schema, social asset and browser validation only. No deployment, HTTPS repair, live social crawler validation or production HTTP-404 validation.')
add(47,'rebuild branch SHA',f'`{new}`')
add(48,'main SHA','`6d106520dd82bf4448312b5f45b54ae15981b1db`')
lines += sections + ['PHASE 19: NOT STARTED','', 'PRODUCTION DEPLOYMENT: NOT PERFORMED','', 'MAIN MERGE: NOT PERFORMED','', 'WAITING FOR: REVIEWER APPROVED PHASE 18','']
(p/'PHASE_18_REVIEW_PACKET.md').write_text('\n'.join(lines),encoding='utf-8')
PY

(
  cd "$PACKET"
  find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt
)

echo '=== PHASE 18 COMPLETE ==='
echo "NEW_SHA=$NEW"
echo "REBUILD_BRANCH=$TARGET_AFTER"
echo "MAIN=$MAIN_AFTER"
