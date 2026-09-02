from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("phase18_builder", HERE / "build_phase18.py")
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)

# Preserve approved Phase 12/14/15/16 title/description locks where the
# existing wording is already unique, accurate and Phase 18 compliant.
mod.ROUTES["technology.html"]["description"] = "Technology and intelligence at Unique Holding: Evidence Axis, development-stage digital products, venture systems and content/distribution capabilities alongside active industrial operations."
mod.ROUTES["evidence-axis.html"]["title"] = "Evidence Axis | Competitive Intelligence Venture | Unique Holding"
mod.ROUTES["evidence-axis.html"]["description"] = "Evidence Axis is a specialist venture within the Unique Holding portfolio. Explore its competitive-intelligence focus, public research sample and specialist website."
mod.ROUTES["ventures.html"]["title"] = "Venture Development | Unique Holding"
mod.ROUTES["ventures.html"]["description"] = "Venture development at Unique Holding: Evidence Axis as a specialist operating venture and YEKI HAST as a development-stage digital product under active build."
mod.ROUTES["contact.html"]["title"] = "Contact & Business Routing | Unique Holding"
mod.ROUTES["contact.html"]["description"] = "Contact Unique Holding through the correct business route for industrial sales, corporate communication, Evidence Axis specialist inquiries, technology or venture context, and the Istanbul office."

# Same meaning as the first-pass wording, without an apostrophe HTML entity so
# the intentionally small source parser can compare it without ambiguity.
mod.ROUTES["energy.html"]["description"] = "Energy & Global Trade at Unique Holding covers industrial trading in petrochemicals and chemicals, including import, domestic supply, export and re-export."


def safe_social_cards() -> list[dict]:
    """Render social cards with a hard title safe zone before the chevrons."""
    out = []
    social_dir = mod.ROOT / "assets/social"
    social_dir.mkdir(parents=True, exist_ok=True)
    sans_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    sans = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

    # Orange chevron center-line begins at x=930 with an 18px stroke, so its
    # visual left edge is approximately x=921. Require >=50px between that edge
    # and the title's rendered bounding box. This catches the overlap found by
    # direct native/reduced image review of the first candidate.
    chevron_safe_left = 921
    min_title_gap = 50

    for rel, meta in mod.SOCIAL.items():
        img = Image.new("RGB", (1200, 630), "#080a0b")
        draw = ImageDraw.Draw(img)
        draw.rectangle((0, 0, 1200, 18), fill="#ee6a24")
        draw.rectangle((84, 96, 100, 534), fill="#ee6a24")
        draw.line((930, 118, 1005, 193, 930, 268), fill="#ee6a24", width=18, joint="curve")
        draw.line((1000, 118, 1075, 193, 1000, 268), fill="#f2eee6", width=18, joint="curve")

        brand_font = mod.load_font(sans_bold, 27)
        draw.text((142, 94), "UNIQUE HOLDING", font=brand_font, fill="#f2eee6")

        # 720px maximum title measure + 40px minimum font size keeps every
        # title clearly legible while reserving a stable right-side graphic zone.
        title_font = mod.fit_font(draw, meta["title"], sans_bold, 72, 40, 720)
        title_xy = (142, 245)
        title_box = draw.textbbox(title_xy, meta["title"], font=title_font)
        title_right = title_box[2]
        title_gap = chevron_safe_left - title_right
        if title_gap < min_title_gap:
            raise RuntimeError(
                f"{rel}: title safe-zone failure; right={title_right}, "
                f"chevronLeft={chevron_safe_left}, gap={title_gap}, required={min_title_gap}"
            )
        draw.text(title_xy, meta["title"], font=title_font, fill="#f2eee6")

        subtitle_font = mod.fit_font(draw, meta["subtitle"], sans, 28, 20, 880)
        draw.text((144, 354), meta["subtitle"], font=subtitle_font, fill="#aeb5b7")
        draw.rectangle((142, 475, 424, 479), fill="#ee6a24")
        draw.text((142, 505), "uniqueholding.com.tr", font=mod.load_font(sans, 22), fill="#d7d2ca")

        dest = mod.ROOT / rel
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
            "titleRight": title_right,
            "chevronSafeLeft": chevron_safe_left,
            "titleSafeGap": title_gap,
            "requiredTitleSafeGap": min_title_gap,
        })
    return out


def main():
    if set(mod.ROUTES) != {p.name for p in mod.ROOT.glob("*.html")}:
        raise RuntimeError("Public HTML route set drifted from 16-route Phase 18 scope")

    body_hashes = {}
    for route, cfg in mod.ROUTES.items():
        before, after, _ = mod.transform_html(route, cfg)
        body_hashes[route] = {"before": before, "after": after}

    social_records = safe_social_cards()
    mod.write_qa_script()
    mod.write_audits(body_hashes, social_records)

    social_audit = mod.ROOT / "docs/qa/phase18-social-assets.md"
    with social_audit.open("a", encoding="utf-8") as fh:
        fh.write("\n## Title / chevron safe-zone QA\n\n")
        fh.write("Automated layout rule: rendered title right edge must remain at least 50px left of the chevron visual edge (x=921).\n\n")
        for record in social_records:
            fh.write(
                f"- `{record['file']}`: titleRight={record['titleRight']}px; "
                f"chevronLeft={record['chevronSafeLeft']}px; "
                f"gap={record['titleSafeGap']}px — PASS\n"
            )

    expected_robots = "User-agent: *\nAllow: /\n\nSitemap: https://www.uniqueholding.com.tr/sitemap.xml"
    actual_robots = (mod.ROOT / "robots.txt").read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    if actual_robots != expected_robots.strip():
        raise RuntimeError(f"robots.txt semantic baseline differs: {actual_robots!r}")

    sitemap = (mod.ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    if urls != mod.SITEMAP_EXPECTED:
        raise RuntimeError(f"sitemap.xml baseline differs from expected 14 canonical routes: {urls}")

    min_gap = min(r["titleSafeGap"] for r in social_records)
    print(json.dumps({
        "routes": len(mod.ROUTES),
        "indexable": len(mod.INDEXABLE),
        "socialAssets": len(social_records),
        "socialTitleMinSafeGap": min_gap,
        "socialTitleRequiredSafeGap": 50,
        "bodyHashesUnchanged": all(v["before"] == v["after"] for v in body_hashes.values()),
        "robotsChanged": False,
        "sitemapChanged": False,
    }, indent=2))


if __name__ == "__main__":
    main()
