# Phase 19 — Accessibility Audit

Engineering target: practical WCAG 2.2 AA behavior. This is not a certification or public compliance claim.

## Automated axe result

- Contexts: 32 / 32
- Critical: 0
- Serious: 0
- Moderate: 0
- Minor: 0

Baseline serious violations were color-contrast findings across all 32 contexts; the two baseline moderate findings were the nested complementary landmark on the homepage Evidence Axis sample. Both defect classes were corrected narrowly.

## Per-context matrix

| Route | Viewport | Critical | Serious | Moderate | Minor | Main/H1 | Keyboard | Alt/intrinsic |
|---|---:|---:|---:|---:|---:|---|---|---|
| index.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| index.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| corporate.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| corporate.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| energy.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| energy.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| products.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| products.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| product.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| product.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| urea-46.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| urea-46.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| caustic-soda-solid.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| caustic-soda-solid.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| sodium-sulphate-anhydrous.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| sodium-sulphate-anhydrous.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| sales.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| sales.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| technology.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| technology.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| evidence-axis.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| evidence-axis.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| ventures.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| ventures.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| contact.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| contact.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| privacy.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| privacy.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| legal.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| legal.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| 404.html | 1440×900 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |
| 404.html | 390×844 | 0 | 0 | 0 | 0 | PASS | PASS | PASS |

## Keyboard / focus

- 32 keyboard contexts traversed. Hidden-focus findings: 0; zero-size focus findings: 0.
- Skip link is the first keyboard focus on every route and compact navigation open/Escape/focus restoration is covered by the Phase 19 regression suite.
- Existing visible focus treatments were preserved; no global brand-color replacement was made.

## Moderate / minor findings

- None in the final 32-context axe run.

## Locked film-control note

- Film controls below ~44px are reported rather than modified when protected: 8 measured control(s). Film implementation hashes remain locked.

## Other regression coverage

- 200% effective reflow: 9 cases, 0 failures.
- Text spacing: 7 cases, 0 failures.
- Forced colors: 5 cases, 0 failures.
- Compact-nav keyboard: 16 cases, 0 failures.
- RFQ labels, keyboard access, long-input mailto generation, reset behavior and mobile layout passed browser regression.

## Fix-only targeted diagnostic

Targeted diagnostic run `33644495235` measured the remaining Phase 19 serious contrast nodes before the final fix-only corrections. The remaining failures were limited to five root-cause families: homepage Evidence Axis sample copy (4.29:1 on `#f2eee5`), dark Technology route-card metadata (2.8:1 on `#0e1214`), Evidence Axis sample boundary copy (4.36:1 on `#f0ece4`), dark Ventures route-card metadata (2.8:1 on `#0e1214`), and Legal light-panel labels (1.68:1 on `#ebe6dd`). Corrections were selector-local and did not replace the global orange palette.

The homepage film H1 `#hero-title` was measured at 1×1 px, absolutely positioned, `white-space: nowrap`, `overflow: hidden`, and clipped with `clip: rect(0,0,0,0)`. It is intentionally visually-hidden semantic text, not visible copy. The text-spacing harness therefore excludes only elements meeting that visually-hidden geometry/style classification rather than making the H1 visible.

The Privacy text-spacing overflow was a real grid intrinsic-sizing defect in `#correspondence .legal-split`: under the exact spacing override, the 348 px grid scrolled to 415 px and its children rendered at about 414.9 px because `min-width:auto` plus the slash-separated `product/grade/quantity/destination/timing` token created an expanded min-content width. The narrow fix sets the two correspondence cards to `min-width:0` and permits wrapping in their paragraphs with `overflow-wrap:anywhere`; page-level overflow hiding was not used.
