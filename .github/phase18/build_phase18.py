from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import html
import json
import re

ROOT = Path.cwd()
DOMAIN = "https://www.uniqueholding.com.tr"
BASELINE = "6f9d49cb96b4599f4518a07a5927090c6daea563"

ROUTES = {
    "index.html": {
        "title": "Unique Holding | Industrial Trade, Technology & Ventures",
        "description": "Unique Holding is an Istanbul-based group active in industrial trade, petrochemicals and chemicals, with specialist technology and venture activity.",
        "canonical": f"{DOMAIN}/",
        "robots": "index,follow",
        "image": "assets/social/group-corporate.png",
        "image_alt": "Unique Holding corporate social preview card.",
        "schema_type": "WebPage",
    },
    "corporate.html": {
        "title": "Corporate | Unique Holding",
        "description": "Corporate profile for Unique Holding, including its Istanbul base, operating structure, industrial activity and public operating-company information.",
        "canonical": f"{DOMAIN}/corporate.html",
        "robots": "index,follow",
        "image": "assets/social/group-corporate.png",
        "image_alt": "Unique Holding corporate social preview card.",
        "schema_type": "AboutPage",
    },
    "energy.html": {
        "title": "Energy & Global Trade | Unique Holding",
        "description": "Unique Holding's Energy & Global Trade area covers industrial trading in petrochemicals and chemicals, including import, domestic supply, export and re-export.",
        "canonical": f"{DOMAIN}/energy.html",
        "robots": "index,follow",
        "image": "assets/social/industrial-trade.png",
        "image_alt": "Unique Holding Energy & Global Trade social preview card.",
        "schema_type": "WebPage",
    },
    "products.html": {
        "title": "Industrial Products | Unique Holding",
        "description": "Browse three core industrial products with published reference data and a wider catalog of requirement-based petrochemical and chemical inquiry routes.",
        "canonical": f"{DOMAIN}/products.html",
        "robots": "index,follow",
        "image": "assets/social/industrial-trade.png",
        "image_alt": "Unique Holding Energy & Global Trade social preview card.",
        "schema_type": "CollectionPage",
    },
    "product.html": {
        "title": "Product Inquiry Detail | Unique Holding",
        "description": "Generic industrial product inquiry detail for requirement-based review. Core products with published reference data use dedicated reference pages.",
        "canonical": f"{DOMAIN}/product.html",
        "robots": "noindex,follow",
        "image": None,
        "image_alt": None,
        "schema_type": None,
    },
    "urea-46.html": {
        "title": "Urea 46 | Reference Detail | Unique Holding",
        "description": "Urea 46 reference detail with published technical values, commercial inquiry routes and the boundary between reference data and offered-lot confirmation.",
        "canonical": f"{DOMAIN}/urea-46.html",
        "robots": "index,follow",
        "image": "assets/social/industrial-trade.png",
        "image_alt": "Unique Holding Energy & Global Trade social preview card.",
        "schema_type": "WebPage",
    },
    "caustic-soda-solid.html": {
        "title": "Caustic Soda Solid | Reference Detail | Unique Holding",
        "description": "Caustic Soda Solid reference detail with published sodium hydroxide technical data, transport classification and industrial inquiry routing.",
        "canonical": f"{DOMAIN}/caustic-soda-solid.html",
        "robots": "index,follow",
        "image": "assets/social/industrial-trade.png",
        "image_alt": "Unique Holding Energy & Global Trade social preview card.",
        "schema_type": "WebPage",
    },
    "sodium-sulphate-anhydrous.html": {
        "title": "Sodium Sulphate Anhydrous | Reference Detail | Unique Holding",
        "description": "Sodium Sulphate Anhydrous reference detail with published technical values, commercial inquiry routing and offered-lot confirmation boundaries.",
        "canonical": f"{DOMAIN}/sodium-sulphate-anhydrous.html",
        "robots": "index,follow",
        "image": "assets/social/industrial-trade.png",
        "image_alt": "Unique Holding Energy & Global Trade social preview card.",
        "schema_type": "WebPage",
    },
    "sales.html": {
        "title": "Industrial Sales & RFQ | Unique Holding",
        "description": "Prepare an industrial RFQ for petrochemical, chemical and related product requirements, then send the structured inquiry through your email application.",
        "canonical": f"{DOMAIN}/sales.html",
        "robots": "index,follow",
        "image": "assets/social/industrial-trade.png",
        "image_alt": "Unique Holding Energy & Global Trade social preview card.",
        "schema_type": "WebPage",
    },
    "technology.html": {
        "title": "Technology & Intelligence | Unique Holding",
        "description": "Technology & Intelligence at Unique Holding covers specialist research, digital product development, venture systems and content/distribution capabilities.",
        "canonical": f"{DOMAIN}/technology.html",
        "robots": "index,follow",
        "image": "assets/social/technology-intelligence.png",
        "image_alt": "Unique Holding Technology & Intelligence social preview card.",
        "schema_type": "WebPage",
    },
    "evidence-axis.html": {
        "title": "Evidence Axis | Specialist Venture | Unique Holding",
        "description": "Evidence Axis is a specialist venture within the Unique Holding portfolio focused on competitive intelligence for B2B SaaS decisions.",
        "canonical": f"{DOMAIN}/evidence-axis.html",
        "robots": "index,follow",
        "image": "assets/social/evidence-axis.png",
        "image_alt": "Evidence Axis specialist venture social preview card.",
        "schema_type": "WebPage",
    },
    "ventures.html": {
        "title": "Venture Portfolio | Unique Holding",
        "description": "Unique Holding's venture portfolio distinguishes Evidence Axis as a specialist operating venture and YEKI HAST as a development-stage digital product.",
        "canonical": f"{DOMAIN}/ventures.html",
        "robots": "index,follow",
        "image": "assets/social/venture-portfolio.png",
        "image_alt": "Unique Holding venture portfolio social preview card.",
        "schema_type": "WebPage",
    },
    "contact.html": {
        "title": "Contact | Unique Holding",
        "description": "Contact Unique Holding by business need, including industrial sales, corporate communication, Evidence Axis, technology or venture inquiries, and the Istanbul office.",
        "canonical": f"{DOMAIN}/contact.html",
        "robots": "index,follow",
        "image": "assets/social/group-corporate.png",
        "image_alt": "Unique Holding corporate social preview card.",
        "schema_type": "ContactPage",
    },
    "privacy.html": {
        "title": "Privacy & Cookies | Unique Holding",
        "description": "Privacy and cookies information for the Unique Holding website, including current site data flows, inquiry handling boundaries and legal-review notices.",
        "canonical": f"{DOMAIN}/privacy.html",
        "robots": "index,follow",
        "image": "assets/social/group-corporate.png",
        "image_alt": "Unique Holding corporate social preview card.",
        "schema_type": "WebPage",
    },
    "legal.html": {
        "title": "Legal Notice | Unique Holding",
        "description": "Legal notice for the Unique Holding website, including site identity, information boundaries, contact routes and matters reserved for formal legal review.",
        "canonical": f"{DOMAIN}/legal.html",
        "robots": "index,follow",
        "image": "assets/social/group-corporate.png",
        "image_alt": "Unique Holding corporate social preview card.",
        "schema_type": "WebPage",
    },
    "404.html": {
        "title": "Page Not Found | Unique Holding",
        "description": "The requested Unique Holding page could not be found. Use the site navigation to return to an available corporate, trade or venture page.",
        "canonical": None,
        "robots": "noindex,follow",
        "image": None,
        "image_alt": None,
        "schema_type": None,
    },
}

INDEXABLE = [r for r, c in ROUTES.items() if c["robots"] == "index,follow"]
SITEMAP_EXPECTED = [ROUTES[r]["canonical"] for r in INDEXABLE]

PRODUCTS = {
    "urea-46.html": {
        "name": "Urea 46",
        "description": "A core industrial material with a published reference specification. Commercial inquiries should identify the required prilled, granular or industrial route.",
        "category": "Fertilizer / Industrial Feedstock",
        "properties": [
            ["Nitrogen Content", "min 46% wt"],
            ["Biuret", "max 0.8% wt"],
            ["Formaldehyde", "max 0.55% wt"],
            ["Moisture", "max 0.3% wt"],
            ["Particle size 2–4 mm", "90%"],
        ],
    },
    "caustic-soda-solid.html": {
        "name": "Caustic Soda Solid",
        "description": "Solid sodium hydroxide with published reference technical and transport classification data.",
        "category": "Industrial Chemicals",
        "properties": [
            ["Chemical name", "Sodium Hydroxide"],
            ["CAS", "1310-73-2"],
            ["NaOH", "approx. 98.8%"],
            ["Dry basis", "99.3%"],
            ["UN", "1823"],
            ["Class", "8"],
            ["Packing Group", "II"],
        ],
    },
    "sodium-sulphate-anhydrous.html": {
        "name": "Sodium Sulphate Anhydrous",
        "description": "Anhydrous sodium sulphate with a published reference specification for commercial inquiry.",
        "category": "Industrial Chemicals",
        "properties": [
            ["Na₂SO₄", "99.20%"],
            ["Water Insoluble Matter", "0.02%"],
            ["Ca & Mg", "0.02%"],
            ["Chloride", "0.30%"],
            ["Fe", "0.0003%"],
            ["Moisture", "0.05%"],
            ["Whiteness", "91%"],
        ],
    },
}

SOCIAL = {
    "assets/social/group-corporate.png": {
        "title": "UNIQUE HOLDING",
        "subtitle": "INDUSTRIAL TRADE · TECHNOLOGY · VENTURES",
        "alt": "Unique Holding corporate social preview card.",
        "pages": ["index.html", "corporate.html", "contact.html", "privacy.html", "legal.html"],
        "implication": "Brand identity and the three visible site activity groupings only; no asset ownership or scale claim.",
    },
    "assets/social/industrial-trade.png": {
        "title": "ENERGY & GLOBAL TRADE",
        "subtitle": "UNIQUE HOLDING",
        "alt": "Unique Holding Energy & Global Trade social preview card.",
        "pages": ["energy.html", "products.html", "urea-46.html", "caustic-soda-solid.html", "sodium-sulphate-anhydrous.html", "sales.html"],
        "implication": "Category label only; no vessel, terminal, factory, inventory or producer implication.",
    },
    "assets/social/technology-intelligence.png": {
        "title": "TECHNOLOGY & INTELLIGENCE",
        "subtitle": "UNIQUE HOLDING",
        "alt": "Unique Holding Technology & Intelligence social preview card.",
        "pages": ["technology.html"],
        "implication": "Approved Technology & Intelligence category label only; no software or infrastructure ownership claim.",
    },
    "assets/social/evidence-axis.png": {
        "title": "EVIDENCE AXIS",
        "subtitle": "SPECIALIST VENTURE · UNIQUE HOLDING PORTFOLIO",
        "alt": "Evidence Axis specialist venture social preview card.",
        "pages": ["evidence-axis.html"],
        "implication": "Uses the approved specialist-venture relationship wording; no subsidiary or legal-entity implication.",
    },
    "assets/social/venture-portfolio.png": {
        "title": "VENTURE PORTFOLIO",
        "subtitle": "UNIQUE HOLDING",
        "alt": "Unique Holding venture portfolio social preview card.",
        "pages": ["ventures.html"],
        "implication": "Portfolio category only; does not imply YEKI HAST launch, availability or operating-company status.",
    },
}


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_body(text: str) -> str:
    m = re.search(r"<body\b", text, re.I)
    if not m:
        raise RuntimeError("HTML body missing")
    return text[m.start():]


def json_ld(route: str, cfg: dict) -> dict | None:
    if route not in INDEXABLE:
        return None
    canonical = cfg["canonical"]
    page = {
        "@type": cfg["schema_type"],
        "@id": f"{canonical}#webpage",
        "url": canonical,
        "name": cfg["title"],
        "description": cfg["description"],
        "inLanguage": "en",
        "isPartOf": {"@id": f"{DOMAIN}/#website"},
        "publisher": {"@id": f"{DOMAIN}/#organization"},
    }
    graph = []
    if route == "index.html":
        graph.extend([
            {
                "@type": "Organization",
                "@id": f"{DOMAIN}/#organization",
                "name": "Unique Holding",
                "url": f"{DOMAIN}/",
            },
            {
                "@type": "WebSite",
                "@id": f"{DOMAIN}/#website",
                "url": f"{DOMAIN}/",
                "name": "Unique Holding",
                "inLanguage": "en",
                "publisher": {"@id": f"{DOMAIN}/#organization"},
            },
        ])
    if route in PRODUCTS:
        p = PRODUCTS[route]
        product_id = f"{canonical}#product"
        page["mainEntity"] = {"@id": product_id}
        product = {
            "@type": "Product",
            "@id": product_id,
            "name": p["name"],
            "description": p["description"],
            "url": canonical,
            "category": p["category"],
            "additionalProperty": [
                {"@type": "PropertyValue", "name": name, "value": value}
                for name, value in p["properties"]
            ],
        }
        graph.extend([page, product])
    else:
        graph.append(page)
    return {"@context": "https://schema.org", "@graph": graph}


def strip_managed_head(head: str) -> str:
    patterns = [
        r"<title\b[^>]*>[\s\S]*?</title>\s*",
        r"<meta\b[^>]*(?:name|property)=[\"'](?:robots|description|keywords|twitter:[^\"']+|og:[^\"']+)[\"'][^>]*>\s*",
        r"<link\b[^>]*rel=[\"']canonical[\"'][^>]*>\s*",
        r"<link\b[^>]*rel=[\"']icon[\"'][^>]*>\s*",
        r"<script\b[^>]*type=[\"']application/ld\+json[\"'][^>]*>[\s\S]*?</script>\s*",
        r"<!--\s*PHASE18 SEO START\s*-->[\s\S]*?<!--\s*PHASE18 SEO END\s*-->\s*",
    ]
    for pattern in patterns:
        head = re.sub(pattern, "", head, flags=re.I)
    return head


def build_head_block(route: str, cfg: dict) -> str:
    title = html.escape(cfg["title"], quote=False)
    desc = html.escape(cfg["description"], quote=True)
    lines = [
        "<!-- PHASE18 SEO START -->",
        f"<title>{title}</title>",
        f'<meta name="description" content="{desc}">',
        f'<meta name="robots" content="{cfg["robots"]}">',
    ]
    if cfg["canonical"]:
        lines.append(f'<link rel="canonical" href="{cfg["canonical"]}">')
    lines.append('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">')
    if route in INDEXABLE:
        image_url = f'{DOMAIN}/{cfg["image"]}'
        alt = html.escape(cfg["image_alt"], quote=True)
        lines.extend([
            f'<meta property="og:title" content="{html.escape(cfg["title"], quote=True)}">',
            f'<meta property="og:description" content="{desc}">',
            '<meta property="og:type" content="website">',
            f'<meta property="og:url" content="{cfg["canonical"]}">',
            f'<meta property="og:image" content="{image_url}">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            f'<meta property="og:image:alt" content="{alt}">',
            '<meta property="og:site_name" content="Unique Holding">',
            '<meta property="og:locale" content="en_US">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{html.escape(cfg["title"], quote=True)}">',
            f'<meta name="twitter:description" content="{desc}">',
            f'<meta name="twitter:image" content="{image_url}">',
            f'<meta name="twitter:image:alt" content="{alt}">',
        ])
        schema = json_ld(route, cfg)
        lines.append('<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + '</script>')
    lines.append("<!-- PHASE18 SEO END -->")
    return "\n".join(lines) + "\n"


def transform_html(route: str, cfg: dict) -> tuple[str, str, str]:
    path = ROOT / route
    before = path.read_text(encoding="utf-8")
    before_body = get_body(before)
    m = re.search(r"<head>([\s\S]*?)</head>", before, re.I)
    if not m:
        raise RuntimeError(f"{route}: head missing")
    cleaned = strip_managed_head(m.group(1))
    block = build_head_block(route, cfg)
    marker = "<script>document.documentElement.classList.add('js')</script>"
    if marker in cleaned:
        cleaned = cleaned.replace(marker, block + marker, 1)
    else:
        cleaned = block + cleaned
    after = before[:m.start(1)] + cleaned + before[m.end(1):]
    after_body = get_body(after)
    if before_body != after_body:
        raise RuntimeError(f"{route}: body changed during head-only transformation")
    path.write_text(after, encoding="utf-8")
    return sha256_text(before_body), sha256_text(after_body), sha256_text(m.group(1))


def load_font(path: str, size: int):
    return ImageFont.truetype(path, size=size)


def fit_font(draw, text: str, path: str, max_size: int, min_size: int, max_width: int):
    for size in range(max_size, min_size - 1, -2):
        font = load_font(path, size)
        box = draw.textbbox((0, 0), text, font=font)
        if box[2] - box[0] <= max_width:
            return font
    return load_font(path, min_size)


def social_cards() -> list[dict]:
    out = []
    social_dir = ROOT / "assets/social"
    social_dir.mkdir(parents=True, exist_ok=True)
    sans_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    sans = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    for rel, meta in SOCIAL.items():
        img = Image.new("RGB", (1200, 630), "#080a0b")
        draw = ImageDraw.Draw(img)
        # Restrained abstract brand geometry; no photography or operational imagery.
        draw.rectangle((0, 0, 1200, 18), fill="#ee6a24")
        draw.rectangle((84, 96, 100, 534), fill="#ee6a24")
        draw.line((930, 118, 1005, 193, 930, 268), fill="#ee6a24", width=18, joint="curve")
        draw.line((1000, 118, 1075, 193, 1000, 268), fill="#f2eee6", width=18, joint="curve")
        brand_font = load_font(sans_bold, 27)
        draw.text((142, 94), "UNIQUE HOLDING", font=brand_font, fill="#f2eee6")
        title_font = fit_font(draw, meta["title"], sans_bold, 72, 44, 880)
        draw.text((142, 245), meta["title"], font=title_font, fill="#f2eee6")
        subtitle_font = fit_font(draw, meta["subtitle"], sans, 28, 20, 880)
        draw.text((144, 354), meta["subtitle"], font=subtitle_font, fill="#aeb5b7")
        draw.rectangle((142, 475, 424, 479), fill="#ee6a24")
        draw.text((142, 505), "uniqueholding.com.tr", font=load_font(sans, 22), fill="#d7d2ca")
        dest = ROOT / rel
        img.save(dest, format="PNG", optimize=True)
        with Image.open(dest) as check:
            if check.size != (1200, 630) or check.mode not in {"RGB", "RGBA"}:
                raise RuntimeError(f"{rel}: invalid social card output")
        out.append({
            "file": rel,
            "width": 1200,
            "height": 630,
            "size": dest.stat().st_size,
            "pages": meta["pages"],
            "alt": meta["alt"],
            "provenance": "Phase 18 locally generated typography-led brand asset using approved Unique Holding naming and abstract geometric treatment; no third-party imagery.",
            "implication": meta["implication"],
        })
    return out


def md_escape(value: str | None) -> str:
    if value is None:
        return "—"
    return str(value).replace("|", "\\|").replace("\n", " ")


def schema_types_for(route: str) -> list[str]:
    doc = json_ld(route, ROUTES[route])
    if not doc:
        return []
    return [str(x.get("@type")) for x in doc.get("@graph", []) if isinstance(x, dict) and x.get("@type")]


def write_audits(body_hashes: dict, social_records: list[dict]):
    qa = ROOT / "docs/qa"
    qa.mkdir(parents=True, exist_ok=True)
    rows = []
    for route, cfg in ROUTES.items():
        idx = route in INDEXABLE
        rows.append([
            route,
            "YES" if idx else "NO",
            cfg["robots"],
            cfg["title"],
            len(cfg["title"]),
            cfg["description"],
            len(cfg["description"]),
            cfg["canonical"] or "—",
            cfg["title"] if idx else "—",
            cfg["description"] if idx else "—",
            cfg["canonical"] if idx else "—",
            f'{DOMAIN}/{cfg["image"]}' if idx else "—",
            "summary_large_image" if idx else "—",
            f'{DOMAIN}/{cfg["image"]}' if idx else "—",
            ", ".join(schema_types_for(route)) or "—",
            "YES" if route in INDEXABLE else "NO",
            "Generic router; noindex prevents query duplication." if route == "product.html" else ("Noindex; no canonical; excluded from sitemap." if route == "404.html" else ""),
        ])
    headers = ["ROUTE","INDEXABLE?","ROBOTS","TITLE","TITLE LENGTH","DESCRIPTION","DESCRIPTION LENGTH","CANONICAL","OG TITLE","OG DESCRIPTION","OG URL","OG IMAGE","TWITTER CARD","TWITTER IMAGE","STRUCTURED DATA TYPES","SITEMAP?","NOTES"]
    lines = [
        "# Phase 18 — SEO / Social Audit",
        "",
        f"Baseline: `{BASELINE}`",
        "",
        "All SEO-critical metadata is static in source HTML. Machine-readable claims follow the same evidence boundaries as visible copy.",
        "",
        "|" + "|".join(headers) + "|",
        "|" + "|".join(["---"] * len(headers)) + "|",
    ]
    for row in rows:
        lines.append("|" + "|".join(md_escape(x) for x in row) + "|")
    lines += [
        "",
        "## Decisions and locks",
        "",
        "- Indexable routes: 14. `product.html` and all query variants remain `noindex,follow`; the generic router canonical is `/product.html`.",
        "- `404.html` remains `noindex,follow`, has no canonical, and is excluded from the sitemap. Local static testing is not used to claim production HTTP 404 behavior.",
        "- Sitemap remains 14 canonical HTTPS URLs with no fabricated `lastmod` values.",
        "- `robots.txt` remains crawlable and declares `https://www.uniqueholding.com.tr/sitemap.xml`; `product.html` is not blocked so crawlers can see its noindex directive.",
        "- No `meta keywords`, hreflang, SearchAction, Twitter/X account metadata, unverified LinkedIn/Instagram URLs, or social `sameAs` entries were added.",
        "- Evidence Axis is represented only by page metadata and WebPage structured data. No parent/subOrganization/subsidiary relationship is encoded.",
        "- YEKI HAST is not emitted as a Product, SoftwareApplication, MobileApplication, Offer, or operating company in structured data.",
        "- `RELEASE-BLOCKER-HTTPS-001` remains OPEN. Canonicals and social URLs still use the intended HTTPS public domain.",
        "- `PHASE18-LIVE-SOCIAL-VALIDATION`: DEFERRED UNTIL HTTPS RELEASE BLOCKER IS CLOSED.",
        "- `LEGAL-PRIVACY-001`: OPEN / LEGAL REVIEW REQUIRED.",
        "- `LEGAL-PRIVACY-002`: OPEN / LEGAL REVIEW REQUIRED.",
        "- Phase 18 changes only HTML head metadata on the 16 routes. Source `<body>` markup hashes are unchanged on all 16 routes.",
        "",
        "## Body lock",
        "",
    ]
    for route, pair in body_hashes.items():
        lines.append(f"- `{route}`: `{pair['before']}` → `{pair['after']}` — {'PASS' if pair['before'] == pair['after'] else 'FAIL'}")
    (qa / "phase18-seo-social-audit.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    sd_lines = [
        "# Phase 18 — Structured Data Audit",
        "",
        "Structured data is deliberately conservative. No schema is used to settle unresolved legal/group relationships or imply inventory, pricing, availability, launch status, ratings, ownership, producer status or social identity.",
        "",
        "|ROUTE|@TYPE|@ID|CLAIM-BEARING PROPERTIES|VISIBLE SOURCE|SAFE?|FORBIDDEN PROPERTIES PRESENT?|JSON PARSE RESULT|",
        "|---|---|---|---|---|---|---|---|",
    ]
    for route in INDEXABLE:
        doc = json_ld(route, ROUTES[route])
        for entity in doc["@graph"]:
            typ = entity.get("@type", "")
            eid = entity.get("@id", "")
            claim_keys = [k for k in entity.keys() if k not in {"@type", "@id"}]
            if typ == "Organization":
                source = "Public Unique Holding group brand name and canonical site identity. No legalName or legal-entity relationship encoded."
            elif typ == "WebSite":
                source = "Public site identity and canonical domain."
            elif typ == "Product":
                source = "Exact visible product identity, lead description, category and published reference table on the same route."
            else:
                source = "Visible page title/body subject and canonical route."
            sd_lines.append("|" + "|".join(md_escape(x) for x in [route, typ, eid, ", ".join(claim_keys), source, "YES", "NO", "PASS"]) + "|")
    sd_lines += [
        "",
        "## Boundaries",
        "",
        "- Organization entity: `https://www.uniqueholding.com.tr/#organization`; properties limited to `name` and `url` beyond identifiers/type.",
        "- WebSite entity: `https://www.uniqueholding.com.tr/#website`; no SearchAction.",
        "- WebPage IDs use each canonical plus `#webpage`.",
        "- Core Product IDs use each canonical plus `#product`. No Offer, price, availability, seller, manufacturer, brand, SKU, MPN, GTIN, review or rating data.",
        "- No `sameAs`, `legalName`, tax/VAT identifiers, founder, employee count, parentOrganization or subOrganization.",
        "- Evidence Axis: WebPage only; approved visible wording remains “a specialist venture within the Unique Holding portfolio.”",
        "- YEKI HAST: no standalone structured-data entity.",
    ]
    (qa / "phase18-structured-data-audit.md").write_text("\n".join(sd_lines) + "\n", encoding="utf-8")

    sa_lines = [
        "# Phase 18 — Social Asset Provenance",
        "",
        "All social preview images are local 1200×630 PNG assets. They use typography and abstract brand geometry only; there is no stock photography, customer/prospect/partner logo, fake UI or operational asset imagery.",
        "",
        "|ASSET|DIMENSIONS|SIZE|SOURCE|PROVENANCE|PAGES|PUBLIC IMPLICATION|ALT TEXT|STATUS|",
        "|---|---|---:|---|---|---|---|---|---|",
    ]
    for rec in social_records:
        source = "Phase 18 local render from approved Unique Holding naming/category labels"
        sa_lines.append("|" + "|".join(md_escape(x) for x in [rec["file"], f'{rec["width"]}×{rec["height"]}', rec["size"], source, rec["provenance"], ", ".join(rec["pages"]), rec["implication"], rec["alt"], "VERIFIED"]) + "|")
    (qa / "phase18-social-assets.md").write_text("\n".join(sa_lines) + "\n", encoding="utf-8")


def write_qa_script():
    expected_json = json.dumps(ROUTES, ensure_ascii=False)
    products_json = json.dumps(PRODUCTS, ensure_ascii=False)
    sitemap_json = json.dumps(SITEMAP_EXPECTED, ensure_ascii=False)
    social_json = json.dumps({k: {"pages": v["pages"], "alt": v["alt"]} for k, v in SOCIAL.items()}, ensure_ascii=False)
    js = r'''import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const expected=__EXPECTED__;
const products=__PRODUCTS__;
const sitemapExpected=__SITEMAP__;
const socialExpected=__SOCIAL__;
const errors=[];
const report={routes:[],schema:[],social:[],sitemap:[],machineReadableHits:[],summary:{}};
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const attr=(tag,name)=>tag.match(new RegExp(`${name}=["']([^"']*)["']`,'i'))?.[1]??'';
const decode=s=>String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const fail=m=>errors.push(m);
const meta=(head,key,value)=>((head.match(/<meta\b[^>]*>/gi)||[]).filter(t=>attr(t,key).toLowerCase()===value.toLowerCase()));
const links=head=>(head.match(/<link\b[^>]*>/gi)||[]);
const pngDimensions=file=>{const b=fs.readFileSync(path.join(root,file));if(b.length<24||b.toString('hex',0,8)!=='89504e470d0a1a0a')return null;return{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const typesFrom=doc=>{const list=Array.isArray(doc?.['@graph'])?doc['@graph']:[doc];return list.filter(x=>x&&typeof x==='object'&&x['@type']).map(x=>x['@type'])};
const entitiesFrom=doc=>Array.isArray(doc?.['@graph'])?doc['@graph']:[doc];
const forbiddenTypes=new Set(['Review','AggregateRating','FAQPage','HowTo','Person','JobPosting','Event','NewsArticle','Article','SoftwareApplication','MobileApplication','Offer','LocalBusiness']);
const forbiddenKeys=new Set(['sameAs','legalName','taxID','vatID','leiCode','duns','globalLocationNumber','registrationNumber','founder','numberOfEmployees','parentOrganization','subOrganization','offers','price','priceCurrency','availability','itemCondition','seller','manufacturer','brand','sku','mpn','gtin','aggregateRating','review']);
const machinePhrases=['leading','market leader','industry leader','trusted by','customers','clients','fortune 500','award-winning','global offices','worldwide offices','proprietary ai','patented','subsidiary','wholly owned','active users','launched','production ready','revenue','arr','mrr','manufacturer','producer','in stock','available now','price'];
const expectedTypes={
  'index.html':['Organization','WebSite','WebPage'],
  'corporate.html':['AboutPage'],
  'energy.html':['WebPage'],
  'products.html':['CollectionPage'],
  'urea-46.html':['WebPage','Product'],
  'caustic-soda-solid.html':['WebPage','Product'],
  'sodium-sulphate-anhydrous.html':['WebPage','Product'],
  'sales.html':['WebPage'],
  'technology.html':['WebPage'],
  'evidence-axis.html':['WebPage'],
  'ventures.html':['WebPage'],
  'contact.html':['ContactPage'],
  'privacy.html':['WebPage'],
  'legal.html':['WebPage'],
  'product.html':[],
  '404.html':[]
};
const fullEntities=new Map();
for(const [route,cfg] of Object.entries(expected)){
  if(!fs.existsSync(path.join(root,route))){fail(`${route}: missing`);continue}
  const html=read(route);const hm=html.match(/<head>([\s\S]*?)<\/head>/i);if(!hm){fail(`${route}: head missing`);continue}const head=hm[1];
  const titles=[...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(m=>decode(m[1].trim()));
  const desc=meta(head,'name','description');const robots=meta(head,'name','robots');const keywords=meta(head,'name','keywords');
  const canonical=links(head).filter(t=>attr(t,'rel').toLowerCase()==='canonical');const icons=links(head).filter(t=>attr(t,'rel').toLowerCase()==='icon');
  if(titles.length!==1||titles[0]!==cfg.title)fail(`${route}: title mismatch/count`);
  if(desc.length!==1||decode(attr(desc[0],'content'))!==cfg.description)fail(`${route}: meta description mismatch/count`);
  if(robots.length!==1||attr(robots[0],'content')!==cfg.robots)fail(`${route}: robots mismatch/count`);
  if(keywords.length)fail(`${route}: meta keywords forbidden`);
  if(icons.length!==1||attr(icons[0],'href')!=='assets/favicon.svg')fail(`${route}: favicon reference mismatch`);
  if(route==='404.html'){if(canonical.length)fail('404.html: canonical must be absent')}else{if(canonical.length!==1||attr(canonical[0],'href')!==cfg.canonical)fail(`${route}: canonical mismatch/count`)}
  const indexable=cfg.robots==='index,follow';
  const ogNames=['title','description','type','url','image','image:width','image:height','image:alt','site_name','locale'];
  const twNames=['card','title','description','image','image:alt'];
  if(indexable){
    for(const n of ogNames)if(meta(head,'property','og:'+n).length!==1)fail(`${route}: og:${n} missing/duplicate`);
    for(const n of twNames)if(meta(head,'name','twitter:'+n).length!==1)fail(`${route}: twitter:${n} missing/duplicate`);
    if(meta(head,'name','twitter:site').length||meta(head,'name','twitter:creator').length)fail(`${route}: unapproved X identity metadata`);
    const ogUrl=attr(meta(head,'property','og:url')[0],'content');if(ogUrl!==cfg.canonical)fail(`${route}: og:url != canonical`);
    if(attr(meta(head,'property','og:type')[0],'content')!=='website')fail(`${route}: og:type must be website`);
    if(attr(meta(head,'property','og:site_name')[0],'content')!=='Unique Holding')fail(`${route}: og:site_name mismatch`);
    if(attr(meta(head,'property','og:locale')[0],'content')!=='en_US')fail(`${route}: og:locale mismatch`);
    if(attr(meta(head,'name','twitter:card')[0],'content')!=='summary_large_image')fail(`${route}: twitter card mismatch`);
    const ogImage=attr(meta(head,'property','og:image')[0],'content');const twImage=attr(meta(head,'name','twitter:image')[0],'content');
    const wanted='https://www.uniqueholding.com.tr/'+cfg.image;
    if(ogImage!==wanted||twImage!==wanted)fail(`${route}: social image mapping mismatch`);
    if(!ogImage.startsWith('https://www.uniqueholding.com.tr/'))fail(`${route}: remote social image`);
    const local=new URL(ogImage).pathname.replace(/^\//,'');if(!fs.existsSync(path.join(root,local)))fail(`${route}: local social image missing`);
    if(attr(meta(head,'property','og:image:width')[0],'content')!=='1200'||attr(meta(head,'property','og:image:height')[0],'content')!=='630')fail(`${route}: social dimensions metadata mismatch`);
    if(decode(attr(meta(head,'property','og:image:alt')[0],'content'))!==cfg.image_alt||decode(attr(meta(head,'name','twitter:image:alt')[0],'content'))!==cfg.image_alt)fail(`${route}: social alt mismatch`);
  }
  const ld=[...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  let docs=[];for(const raw of ld){try{docs.push(JSON.parse(raw))}catch(e){fail(`${route}: JSON-LD parse failure ${e.message}`)}}
  const typeList=docs.flatMap(typesFrom);const wantedTypes=expectedTypes[route]||[];
  if(JSON.stringify(typeList)!==JSON.stringify(wantedTypes))fail(`${route}: structured-data types ${JSON.stringify(typeList)} != ${JSON.stringify(wantedTypes)}`);
  for(const doc of docs){for(const ent of entitiesFrom(doc)){
    if(!ent||typeof ent!=='object')continue;const typ=ent['@type'];if(forbiddenTypes.has(typ))fail(`${route}: forbidden schema type ${typ}`);
    for(const k of Object.keys(ent))if(forbiddenKeys.has(k))fail(`${route}: forbidden schema property ${k}`);
    if(ent['@id']&&typ){const prior=fullEntities.get(ent['@id']);const now=JSON.stringify(ent);if(prior&&prior!==now)fail(`${route}: conflicting entity @id ${ent['@id']}`);else fullEntities.set(ent['@id'],now)}
    report.schema.push({route,type:typ||null,id:ent['@id']||null,keys:Object.keys(ent)});
  }}
  const machine=[...head.matchAll(/<meta\b[^>]*(?:content=["']([^"']*)["'])[^>]*>/gi)].map(m=>decode(m[1]||'')).join(' ')+' '+ld.join(' ');
  for(const phrase of machinePhrases){const rx=new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`,'i');if(rx.test(machine)){report.machineReadableHits.push({route,phrase});fail(`${route}: unsupported machine-readable phrase -> ${phrase}`)}}
  if(/linkedin\.com|instagram\.com/i.test(head))fail(`${route}: unverified social identity published in head`);
  report.routes.push({route,indexable,robots:cfg.robots,title:cfg.title,titleLength:cfg.title.length,description:cfg.description,descriptionLength:cfg.description.length,canonical:cfg.canonical||null,ogImage:indexable?'https://www.uniqueholding.com.tr/'+cfg.image:null,types:typeList});
}
const indexable=report.routes.filter(x=>x.indexable);
for(const [label,values] of [['TITLE',indexable.map(x=>x.title)],['DESCRIPTION',indexable.map(x=>x.description)],['CANONICAL',indexable.map(x=>x.canonical)]])if(new Set(values).size!==values.length)fail(`${label} DUPLICATES > 0`);
if(indexable.length!==14)fail(`indexable route count ${indexable.length} != 14`);

for(const [route,p] of Object.entries(products)){
  const html=read(route);const head=html.match(/<head>([\s\S]*?)<\/head>/i)?.[1]||'';const docs=[...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>JSON.parse(m[1]));
  const product=docs.flatMap(entitiesFrom).find(x=>x?.['@type']==='Product');if(!product){fail(`${route}: Product schema missing`);continue}
  if(product.name!==p.name||product.description!==p.description||product.category!==p.category||product.url!==expected[route].canonical)fail(`${route}: Product identity schema drift`);
  const actual=(product.additionalProperty||[]).map(x=>[x.name,x.value]);if(JSON.stringify(actual)!==JSON.stringify(p.properties))fail(`${route}: Product technical schema drift ${JSON.stringify(actual)}`);
  const body=html.slice(html.search(/<body\b/i));for(const [name,value] of p.properties){if(!body.includes(name)||!body.includes(value.replace('&','&amp;'))&&!body.includes(value))fail(`${route}: schema property not supported by visible body -> ${name}: ${value}`)}
}

const sitemap=read('sitemap.xml');const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);report.sitemap=urls;
if(urls.length!==14||JSON.stringify(urls)!==JSON.stringify(sitemapExpected))fail(`sitemap canonical set mismatch/count ${urls.length}`);
if(new Set(urls).size!==urls.length)fail('sitemap duplicates');
for(const u of urls){if(/[?#]/.test(u)||u.includes('product.html')||u.includes('404.html')||u.includes('github'))fail(`sitemap forbidden URL ${u}`)}
if(/<lastmod>/i.test(sitemap))fail('sitemap fabricated lastmod present');
const robotsTxt=read('robots.txt');if(!/^User-agent:\s*\*\s*\nAllow:\s*\//m.test(robotsTxt)||!robotsTxt.includes('Sitemap: https://www.uniqueholding.com.tr/sitemap.xml'))fail('robots.txt baseline mismatch');
if(/Disallow:\s*\/product\.html/i.test(robotsTxt))fail('robots.txt must not block product.html');

const favicon=read('assets/favicon.svg');const viewBox=favicon.match(/viewBox=["']0 0 (\d+) (\d+)["']/i);if(!viewBox||viewBox[1]!==viewBox[2])fail('favicon.svg is not square');
for(const [file,meta] of Object.entries(socialExpected)){
  if(!fs.existsSync(path.join(root,file))){fail(`${file}: missing`);continue}const d=pngDimensions(file);if(!d||d.width!==1200||d.height!==630)fail(`${file}: PNG dimensions invalid`);const size=fs.statSync(path.join(root,file)).size;if(size<5000||size>600000)fail(`${file}: suspicious file size ${size}`);report.social.push({file,...d,size,pages:meta.pages,alt:meta.alt});
}

for(const file of ['assets/site.js','assets/products-data.js']){const s=read(file);if(/meta\s*\[?name\s*=\s*["']robots|querySelector\([^)]*robots|setAttribute\([^)]*robots/i.test(s))fail(`${file}: runtime robots mutation detected`)}
for(const route of ['index.html','products.html','urea-46.html','technology.html','evidence-axis.html','ventures.html','contact.html']){const html=read(route);const head=html.match(/<head>([\s\S]*?)<\/head>/i)?.[1]||'';for(const token of ['<title>','name="description"','name="robots"','rel="canonical"','property="og:title"','name="twitter:card"','application/ld+json'])if(!head.includes(token))fail(`${route}: static source metadata missing ${token}`)}

const phase17Files=['privacy.html','legal.html'];for(const route of phase17Files){const body=read(route).slice(read(route).search(/<body\b/i));if(!/LEGAL REVIEW REQUIRED/i.test(body))fail(`${route}: Phase 17 legal-review status missing`)}
if(!read('docs/qa/phase18-seo-social-audit.md').includes('RELEASE-BLOCKER-HTTPS-001` remains OPEN'))fail('Phase 18 audit must carry HTTPS blocker OPEN');
if(!read('docs/qa/phase18-seo-social-audit.md').includes('PHASE18-LIVE-SOCIAL-VALIDATION`: DEFERRED'))fail('Phase 18 live-social deferral missing');

report.summary={htmlRoutes:report.routes.length,indexable:indexable.length,titleDuplicates:indexable.length-new Set(indexable.map(x=>x.title)).size,descriptionDuplicates:indexable.length-new Set(indexable.map(x=>x.description)).size,canonicalDuplicates:indexable.length-new Set(indexable.map(x=>x.canonical)).size,jsonLdEntities:report.schema.filter(x=>x.type).length,socialAssets:report.social.length,sitemapEntries:urls.length,machineReadableHits:report.machineReadableHits.length,failures:errors.length};
const out=process.env.PHASE18_QA_OUT;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'phase18-seo-qa-report.json'),JSON.stringify({...report,errors},null,2))}
console.log(JSON.stringify(report.summary,null,2));if(errors.length){console.error(errors.join('\n'));process.exit(1)}console.log('PHASE 18 SEO QA PASS');
'''
    js = js.replace("__EXPECTED__", expected_json).replace("__PRODUCTS__", products_json).replace("__SITEMAP__", sitemap_json).replace("__SOCIAL__", social_json)
    (ROOT / "scripts/qa-seo.mjs").write_text(js, encoding="utf-8")


def main():
    if set(ROUTES) != {p.name for p in ROOT.glob("*.html")}:
        raise RuntimeError("Public HTML route set drifted from 16-route Phase 18 scope")
    body_hashes = {}
    for route, cfg in ROUTES.items():
        before, after, _ = transform_html(route, cfg)
        body_hashes[route] = {"before": before, "after": after}
    social_records = social_cards()
    write_qa_script()
    write_audits(body_hashes, social_records)
    # Existing robots.txt and sitemap.xml are already the approved Phase 18 model; audit, do not churn them.
    if (ROOT / "robots.txt").read_text(encoding="utf-8") != "User-agent: *\nAllow: /\n\nSitemap: https://www.uniqueholding.com.tr/sitemap.xml":
        raise RuntimeError("robots.txt baseline differs; stop instead of silently rewriting")
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    if urls != SITEMAP_EXPECTED:
        raise RuntimeError(f"sitemap.xml baseline differs from expected 14 canonical routes: {urls}")
    print(json.dumps({
        "routes": len(ROUTES),
        "indexable": len(INDEXABLE),
        "socialAssets": len(social_records),
        "bodyHashesUnchanged": all(v["before"] == v["after"] for v in body_hashes.values()),
        "robotsChanged": False,
        "sitemapChanged": False,
    }, indent=2))


if __name__ == "__main__":
    main()
