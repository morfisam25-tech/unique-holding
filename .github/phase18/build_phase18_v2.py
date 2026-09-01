from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

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


def main():
    if set(mod.ROUTES) != {p.name for p in mod.ROOT.glob("*.html")}:
        raise RuntimeError("Public HTML route set drifted from 16-route Phase 18 scope")

    body_hashes = {}
    for route, cfg in mod.ROUTES.items():
        before, after, _ = mod.transform_html(route, cfg)
        body_hashes[route] = {"before": before, "after": after}

    social_records = mod.social_cards()
    mod.write_qa_script()
    mod.write_audits(body_hashes, social_records)

    expected_robots = "User-agent: *\nAllow: /\n\nSitemap: https://www.uniqueholding.com.tr/sitemap.xml"
    actual_robots = (mod.ROOT / "robots.txt").read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    if actual_robots != expected_robots.strip():
        raise RuntimeError(f"robots.txt semantic baseline differs: {actual_robots!r}")

    sitemap = (mod.ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    if urls != mod.SITEMAP_EXPECTED:
        raise RuntimeError(f"sitemap.xml baseline differs from expected 14 canonical routes: {urls}")

    print(json.dumps({
        "routes": len(mod.ROUTES),
        "indexable": len(mod.INDEXABLE),
        "socialAssets": len(social_records),
        "bodyHashesUnchanged": all(v["before"] == v["after"] for v in body_hashes.values()),
        "robotsChanged": False,
        "sitemapChanged": False,
    }, indent=2))


if __name__ == "__main__":
    main()
