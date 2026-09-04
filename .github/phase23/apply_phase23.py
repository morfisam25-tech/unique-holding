from pathlib import Path
import hashlib
import re

MOBILE = '+90 539 380 91 97'
EMAIL = 'farahmand@uniqueholding.com.tr'
HTMLS = sorted(Path('.').glob('*.html'))

# Contact page: minimally replace personal-email CTAs with existing public/internal routes.
p = Path('contact.html')
s = p.read_text()
replacements = {
    '<article class="contact-route-card" data-contact-route="corporate"><div class="contact-route-meta"><span>EMAIL</span><b>CORPORATE COMMUNICATION</b></div><h3>Group or business inquiry</h3><p>For corporate communication and general business matters involving Unique Holding.</p><a class="button-link" href="mailto:farahmand@uniqueholding.com.tr?subject=Corporate%20Inquiry%20%E2%80%94%20Unique%20Holding">Email Corporate Communication</a></article>':
    '<article class="contact-route-card" data-contact-route="corporate"><div class="contact-route-meta"><span>PUBLIC ROUTE</span><b>CORPORATE COMMUNICATION</b></div><h3>Group or business inquiry</h3><p>For corporate communication and general business matters involving Unique Holding.</p><a class="button-link" href="#istanbul-office">View Public Office Contact</a></article>',
    '<article class="contact-route-card" data-contact-route="technology-venture"><div class="contact-route-meta"><span>EMAIL</span><b>TECHNOLOGY / VENTURE</b></div><h3>Technology or portfolio context</h3><p>For Technology &amp; Intelligence, venture-development or portfolio-context inquiries that belong at group level.</p><a class="button-link" href="mailto:farahmand@uniqueholding.com.tr?subject=Technology%20%2F%20Venture%20Inquiry%20%E2%80%94%20Unique%20Holding">Email Technology / Venture Inquiry</a></article>':
    '<article class="contact-route-card" data-contact-route="technology-venture"><div class="contact-route-meta"><span>INTERNAL ROUTE</span><b>TECHNOLOGY / VENTURE</b></div><h3>Technology or portfolio context</h3><p>For Technology &amp; Intelligence, venture-development or portfolio-context inquiries that belong at group level.</p><a class="button-link" href="#corporate-communication">View Technology / Portfolio Routes</a></article>',
    '<section class="subsite-section alt contact-section" id="corporate-communication"><div class="section-cap"><span class="num">04 / Corporate Communication</span><h2>Use the group contact for corporate and venture context.</h2><p>No separate Technology or Ventures inbox is published. Both use the established corporate communication route.</p></div>':
    '<section class="subsite-section alt contact-section" id="corporate-communication"><div class="section-cap"><span class="num">04 / Corporate Communication</span><h2>Use the public routes that match the context.</h2><p>No separate Technology or Ventures inbox is published. Corporate matters use the public office contact; technology and portfolio context remain available through their dedicated pages.</p></div>',
    '<a class="text-link" href="mailto:farahmand@uniqueholding.com.tr?subject=Corporate%20Inquiry%20%E2%80%94%20Unique%20Holding">farahmand@uniqueholding.com.tr</a>':
    '<a class="text-link" href="#istanbul-office">View Public Office Contact</a>',
    '<p>Technology, venture-development and portfolio questions route through the same established corporate email with a distinct subject.</p><a class="text-link" href="mailto:farahmand@uniqueholding.com.tr?subject=Technology%20%2F%20Venture%20Inquiry%20%E2%80%94%20Unique%20Holding">Email Technology / Venture Inquiry</a>':
    '<p>Technology, venture-development and portfolio questions can continue through the relevant public context page.</p><a class="text-link" href="technology.html">Open Technology Context</a>',
    'The approved public office and direct-contact details are presented without additional department or availability claims.':
    'The approved public office and sales-contact details are presented without additional department or availability claims.'
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit('contact expected source block missing: ' + old[:90])
    s = s.replace(old, new, 1)
p.write_text(s)

# Homepage: replace only the first below-film physical-markets still.
p = Path('index.html')
s = p.read_text()
old_img = '<img src="assets/phase04/film-still-logistics.webp" width="800" height="450" loading="lazy" decoding="async" alt="Illustrative corporate-film still showing logistics and supply-chain activity">'
new_img = '<img src="assets/phase08/film-still-physical-trade.webp" width="960" height="540" loading="lazy" decoding="async" alt="Illustrative still showing physical trade and logistics handling activity">'
if s.count(old_img) != 1:
    raise SystemExit(f'homepage target image count expected 1, got {s.count(old_img)}')
s = s.replace(old_img, new_img, 1)
p.write_text(s)

# Remove personal phone/email anchors from every public HTML route, including global footers.
phone_anchor = re.compile(r'<a\b[^>]*href=["\']tel:\+905393809197["\'][^>]*>[\s\S]*?</a>', re.I)
email_anchor = re.compile(r'<a\b[^>]*href=["\']mailto:farahmand@uniqueholding\.com\.tr(?:\?[^"\']*)?["\'][^>]*>[\s\S]*?</a>', re.I)
for p in HTMLS:
    s = p.read_text()
    s = phone_anchor.sub('', s)
    s = email_anchor.sub('', s)
    p.write_text(s)

# Update the repository QA harness only where previous phases encoded now-superseded public contact/image expectations.
q = Path('scripts/qa-site.mjs')
s = q.read_text()
# Homepage expected assets/dimensions now use the already-approved sharper Phase 08 internal still.
s = s.replace("'assets/phase04/film-still-logistics.webp','assets/phase04/film-still-intelligence.webp'", "'assets/phase08/film-still-physical-trade.webp','assets/phase04/film-still-intelligence.webp'")
s = s.replace("['assets/phase04/film-still-logistics.webp',800,450]", "['assets/phase08/film-still-physical-trade.webp',960,540]")
# Previously-approved personal contact tokens are intentionally superseded by Phase 23.
s = s.replace(",'+90 539 380 91 97'", "")
s = s.replace(",'farahmand@uniqueholding.com.tr'", "")
s = s.replace("'farahmand@uniqueholding.com.tr',", "")
s = s.replace("['sales@uniqueholding.com.tr','farahmand@uniqueholding.com.tr']", "['sales@uniqueholding.com.tr']")
s = s.replace("if(!main.includes('tel:+902127272222')||!main.includes('tel:+905393809197'))errors.push('contact.html: normalized tel routes missing');", "if(!main.includes('tel:+902127272222'))errors.push('contact.html: approved office tel route missing');")
s = s.replace("for(const token of ['subject=Corporate%20Inquiry%20%E2%80%94%20Unique%20Holding','subject=Technology%20%2F%20Venture%20Inquiry%20%E2%80%94%20Unique%20Holding','subject=Industrial%20Sales%20Inquiry%20%E2%80%94%20Unique%20Holding'])", "for(const token of ['subject=Industrial%20Sales%20Inquiry%20%E2%80%94%20Unique%20Holding'])")
s = s.replace("if(!privacyMain.includes('farahmand@uniqueholding.com.tr')||!privacyMain.includes('+90 212 727 22 22'))errors.push('privacy.html: current privacy contact point missing');", "if(!privacyMain.includes('+90 212 727 22 22'))errors.push('privacy.html: current public office contact point missing');")

# Re-lock the two authorized shared-footer slices after public contact sanitization.
corp = Path('corporate.html').read_text()
m = re.search(r'<footer class=["\']site-footer["\'][\s\S]*?</footer>', corp, re.I)
if not m:
    raise SystemExit('corporate footer missing')
corp_footer_hash = hashlib.sha256(m.group(0).encode()).hexdigest()
s = s.replace('fb78cdce26ad95e93209faaec99e957f7fd2f882d3e5a6a83ecd781db170045a', corp_footer_hash)
idx = Path('index.html').read_text()
m = re.search(r'<footer class=["\']site-footer["\'][\s\S]*?</footer>', idx, re.I)
if not m:
    raise SystemExit('homepage footer missing')
home_footer_hash = hashlib.sha256(m.group(0).encode()).hexdigest()
s = s.replace('5a19b25f3e134903731910b7f57ec4f9d066039e7fbbfed77ccb162c52ccd486', home_footer_hash)
q.write_text(s)

# Hard public-product gates.
for p in HTMLS:
    txt = p.read_text()
    for forbidden in (MOBILE, EMAIL, 'tel:+905393809197', 'mailto:farahmand@uniqueholding.com.tr'):
        if forbidden.lower() in txt.lower():
            raise SystemExit(f'forbidden public contact remains in {p}: {forbidden}')
idx = Path('index.html').read_text()
if 'assets/phase08/film-still-physical-trade.webp' not in idx:
    raise SystemExit('replacement image missing from homepage')
if 'assets/phase04/film-still-logistics.webp' in idx:
    raise SystemExit('old blurry trade still remains referenced on homepage')
if not Path('assets/phase08/film-still-physical-trade.webp').exists():
    raise SystemExit('replacement local asset missing')
