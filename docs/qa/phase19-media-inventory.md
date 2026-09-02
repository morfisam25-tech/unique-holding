# Phase 19 — Media Inventory

No third-party image was localized. Provenance classes: `LOCAL-CONTROLLED`, `REMOTE-UNSPLASH-EXISTING`, `PROTECTED-FILM`.

| Asset / URL | Kind | Routes observed | Natural | Max rendered observed | Fold | Loading | Provenance | Action |
|---|---|---|---:|---:|---|---|---|---|
| `http://127.0.0.1:8000/assets/media/unique-holding-film-720p.mp4` | video | index.html | 1280×720 | 1440×900 | above | default | PROTECTED-FILM | KEEP LOCKED — no Phase 19 film modification |
| `http://127.0.0.1:8000/assets/phase04/film-still-intelligence.webp` | img | index.html | 0×0 | 726×1235 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase04/film-still-logistics.webp` | img | index.html | 800×450 | 726×728 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase08/film-still-physical-trade.webp` | img | energy.html | 960×540 | 1440×648 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase08/operations-context.webp` | img | energy.html | 0×0 | 406×514 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase13/content-distribution-system.svg` | img | technology.html | 1600×900 | 687×352 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase13/digital-product-development.svg` | img | technology.html | 1600×900 | 687×352 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase13/evidence-axis-system.svg` | img | technology.html | 1600×900 | 687×352 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase13/technology-hero-system.svg` | img | technology.html | 2400×1350 | 1440×750 | above | default | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |
| `http://127.0.0.1:8000/assets/phase13/venture-systems.svg` | img | technology.html | 1600×900 | 687×352 | below | lazy | LOCAL-CONTROLLED | KEEP — local asset appropriately controlled |

## Remote Unsplash audit

- CSS background variants remain `w=1800 q=72` desktop and `w=1200 q=70` at ≤900px, with CDN format negotiation (`auto=format`).
- Energy, Products and Industrial Sales each observed one bounded remote background request per tested first view.
- Homepage duplicate preload was removed; the protected film poster remains the only first-view photograph request for that source.
- Existing Unsplash host was retained; no provenance or redistribution claim was manufactured.

## Loading decisions

- LCP/first-view media: EAGER/BACKGROUND as already designed; no blanket lazy loading.
- Below-fold `<img>` assets already using `loading="lazy"` remain lazy.
- Technology hero SVG remains eager/high-priority because it is above fold.
- Protected film remains `preload="metadata"`; reduced-motion gate remains unchanged.
