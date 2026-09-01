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
