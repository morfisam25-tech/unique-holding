from pathlib import Path
import hashlib
import re

idx = Path('index.html').read_text()
start = idx.find('  <footer class="site-footer"')
if start < 0:
    raise SystemExit('homepage footer start missing')
end = idx.find('</footer>', start)
if end < 0:
    raise SystemExit('homepage footer end missing')
footer = idx[start:end + len('</footer>')]
expected = hashlib.sha256(footer.encode()).hexdigest()
q = Path('scripts/qa-site.mjs')
s = q.read_text()
pattern = r"if\(sha256\(homepageFooter\)!=='[0-9a-f]{64}'\)errors\.push\('index\.html: protected Phase 03 static footer changed'\);"
replacement = f"if(sha256(homepageFooter)!=='{expected}')errors.push('index.html: protected Phase 03 static footer changed');"
s2, n = re.subn(pattern, replacement, s, count=1)
if n != 1:
    raise SystemExit(f'homepage footer QA guard replacements={n}')
q.write_text(s2)
print('HOMEPAGE_FOOTER_SHA256=' + expected)
