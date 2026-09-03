# Phase 20 — Customer-eye visual review

Reviewed product tree: `30a289aaf26cb1944baf76a5d9f53b98cc6e54dd`  
Reviewed commit: `b247b536eda5b1f48ada5b6a09c657b324d289f1`  
Scroll-primed visual run: GitHub Actions `33702362825`  
Visual baseline artifact: `9874164518` (`phase20-visual-baseline`)  
Artifact digest: `sha256:1d2a5cfb086b76ab278f9d5d5fe0ff6eef8b2f9936288658d2e36bf4e511fbce`

## Verdict

**PHASE 20 PRODUCT CHANGE: NONE REQUIRED.**

The approved visual direction remains coherent across the required desktop, tablet and mobile matrix. The customer-eye review found no BLOCKER, MAJOR, MODERATE or MINOR customer-facing visual defect that justifies a product change. No aesthetic preference was promoted into a code change.

## Required matrix manually inspected

The rendered screenshots were inspected as actual visual compositions, not approved from DOM/axe results alone.

- Primary routes — `index`, `energy`, `products`, `sales`, `technology`, `contact`: 1920×1080, 1440×900, 768×1024, 390×844, 360×800 — **30/30 visually reviewed**.
- `corporate`: all five required viewports — **5/5 visually reviewed**.
- `evidence-axis` + `ventures`: 390×844 and 360×800 — **4/4 visually reviewed**.
- Core details — `urea-46`, `caustic-soda-solid`, `sodium-sulphate-anhydrous`: 1440×900 and 390×844 — **6/6 visually reviewed**.
- `privacy` + `legal`: 1440×900, 390×844, 360×800 — **6/6 visually reviewed**.
- `404`: 1440×900 and 390×844 — **2/2 visually reviewed**.

Total required matrix: **53/53 visually reviewed**.

## Customer-eye findings by route group

### Homepage

First-screen film composition, subsequent hierarchy, route transitions, proof/sample sections, commercial CTA area and footer remain visually coherent across all five viewports. Desktop framing is strong; tablet and mobile retain the approved portrait film treatment. The scroll-primed capture confirmed that the trade and technology imagery renders correctly at tablet width and that earlier blank offscreen areas were capture-paint artifacts, not product defects.

### Energy & Trade

Hero crop, section transitions, commercial hierarchy, product-family rows, direct-product routes, infrastructure section and orange closing band remain balanced. Tablet-specific layout remains coherent and does not create a dead column or card collision.

### Products

Hero hierarchy, core-product cards, inquiry-family density, family tables, specification boundary, CTA and footer remain contained and readable. The long catalog remains intentionally dense but is visually structured; no horizontal document overflow or broken tablet stack was observed.

### Industrial Sales / RFQ

Hero CTAs, process strip, RFQ form, direct-sales panel, review sections and boundary copy remain visually consistent. At 390px the form stays within the viewport. Long native single-line input content scrolls inside its control as expected; the technical-requirement textarea wraps correctly. This is control behavior, not document overflow.

### Technology & Intelligence

The long hero headline remains balanced at 360/390px without clipping. Operating-area cards, Evidence Axis panel, venture-stage panels, advisory/distribution sections and footer remain coherent at tablet and mobile widths.

### Contact

Hero hierarchy, route cards, industrial/corporate/Evidence Axis destinations, office block, verified destinations and footer remain visually consistent. Address/contact metadata remains subordinate rather than reading as primary CTA text.

### Corporate

The corporate hero, operating-world list, timeline, operating-company context, Istanbul block, identity/work table, CTA band and footer remain balanced across all five viewports. No tablet-only alignment defect was observed.

### Evidence Axis

Mobile hero, specialist-venture label, sample CTA, operating-principle sections, public-sample panel, portfolio relationship and specialist-source CTA remain visually coherent. The relationship remains visually subordinate to product identity and does not imply fake traction.

### Ventures

Mobile hero, status-led portfolio cards, Evidence Axis status, YEKI HAST development-stage presentation, stage framework and status links remain visually coherent. YEKI HAST continues to read as development-stage rather than operating traction.

### Core product details

All three core-product routes preserve product hierarchy, published-reference status, specification tables, commercial-boundary notes and Industrial Sales CTAs without mobile clipping. Long product names wrap naturally.

### Privacy / Legal

Long-form legal copy, correspondence blocks, external-destination sections, current-contact panels and review-boundary sections wrap cleanly at 390/360px. No legal text is visually obscured or squeezed into an unreadable measure.

### 404

The error hierarchy, route choices and footer remain balanced on desktop and mobile.

## Phase 19 visual-regression review

The Phase 19 accessibility corrections were inspected explicitly:

1. Footer secondary text colors — **PASS**; readable but still clearly secondary.
2. Homepage trade/proof/routes metadata — **PASS**; orange/gray hierarchy remains controlled and does not compete with CTAs.
3. Corporate metadata — **PASS**; subordinate hierarchy remains consistent.
4. Energy metadata — **PASS**; small orange labels remain legible and disciplined.
5. Products section numbers / route labels — **PASS**; no accidental CTA-like prominence.
6. Sales boundary copy — **PASS**; readable on its light surface without becoming visually dominant.
7. Technology route-card labels — **PASS**; consistent with the system.
8. Evidence Axis boundary/sample copy — **PASS**; legible and coherent with the specialist-venture hierarchy.
9. Ventures route-card labels — **PASS**; stage metadata stays subordinate.
10. Contact metadata/address/direct labels — **PASS**; readable without taking primary hierarchy.
11. Legal labels and external-link copy — **PASS**; labels remain readable and consistent with the legal surface.
12. Privacy correspondence wrapping — **PASS**; no clipping, collision or awkward edge contact at both mobile widths.

No compliant Phase 19 color was reverted for aesthetic preference.

## Interaction-state visual review

- Desktop navigation — **PASS**.
- Compact/mobile navigation open state — **PASS**; hierarchy and close control are clear.
- Escape close + focus restoration — **PASS** functionally.
- Skip-link focus state — **PASS**; intentionally overlays the header when invoked and remains clearly visible.
- Main CTA focus ring — **PASS**.
- RFQ long-input mobile state — **PASS**.
- Protected film controls — **PASS visually**; no film implementation change authorized.
- External-destination treatment — **PASS** in the long-form privacy/legal visual review; final automation separately rechecks keyboard focus visibility on the Privacy external destination.

## Severity table

| Severity | Count | Disposition |
|---|---:|---|
| BLOCKER | 0 | None |
| MAJOR | 0 | None |
| MODERATE | 0 | None |
| MINOR | 0 | None requiring product correction |
| OBSERVATION | 4 | Retained below; non-defects |

## Observations retained without product change

### OBSERVATION 01 — protected portrait film framing

At tablet/mobile portrait sizes the approved 16:9 film is presented within a taller black hero field. This is visually deliberate in the locked implementation and prior real-device approval is carried forward. It is not changed in Phase 20.

### OBSERVATION 02 — offscreen screenshot paint behavior

The first non-primed full-page capture could show some offscreen remote imagery as blank. A second run scrolled through the document before capture; the imagery rendered correctly. This was a headless full-page capture artifact, not a website layout defect.

### OBSERVATION 03 — skip-link overlay

When invoked, the skip link overlays the top-left header area. It remains fully readable, high contrast and keyboard-usable. This is expected accessible skip-link behavior and does not warrant a visual rewrite.

### OBSERVATION 04 — native single-line RFQ input scrolling

Very long values in single-line inputs remain single-line and scroll within the control; the page itself does not overflow. Textarea content wraps. No correction is required.

## Locked carried findings

- `PHASE19-FILM-PERFORMANCE-001` — **OPEN FOR REVIEW**. The protected `w=2000` poster remains unchanged.
- `RELEASE-BLOCKER-HTTPS-001` — **OPEN**.
- `MOBILE FILM — REAL DEVICE PASS` — **PRIOR APPROVAL CARRIED FORWARD**; no new real-device test is claimed.

## Product correction decision

No product file is authorized for modification on the evidence above. Phase 20 should finalize as a **NO-CHANGE** review against the exact Phase 19 product commit and tree.
