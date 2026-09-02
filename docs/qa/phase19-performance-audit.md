# Phase 19 — Performance Audit

Baseline: `8d2811298c668865f5438f86337c9d8f9d959c80`

## Method

- Representative routes measured at 1440×900 and 390×844.
- Two cold local-browser runs per route; medians are used for structural before/after comparison.
- Timing values are observations only; no statistical speedup claim is made from local synthetic timing.
- Performance budget is baseline-derived: no request/third-party increase, no material transfer regression, and no material CLS regression.

## Before / after

| Route | Viewport | Requests | Transfer | Image | Third-party | CLS | FCP obs. | LCP obs. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| contact.html | 390×844 | 9 → 9 | 79,148 → 81,803 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 100 → 124 ms | 100 → 124 ms |
| contact.html | 1440×900 | 9 → 9 | 79,148 → 81,803 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 124 → 116 ms | 124 → 116 ms |
| corporate.html | 390×844 | 8 → 8 | 82,260 → 84,915 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 112 → 112 ms | 112 → 112 ms |
| corporate.html | 1440×900 | 8 → 8 | 82,260 → 84,915 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 124 → 126 ms | 124 → 126 ms |
| energy.html | 390×844 | 11 → 11 | 194,413 → 197,063 B | 113,839 → 113,834 B | 1 → 1 | 0.00000 → 0.00000 | 96 → 116 ms | 186 → 180 ms |
| energy.html | 1440×900 | 11 → 11 | 261,102 → 263,757 B | 180,528 → 180,528 B | 1 → 1 | 0.00000 → 0.00000 | 148 → 126 ms | 226 → 208 ms |
| evidence-axis.html | 390×844 | 9 → 9 | 77,994 → 80,649 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 110 → 118 ms | 110 → 118 ms |
| evidence-axis.html | 1440×900 | 9 → 9 | 77,994 → 80,649 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 138 → 120 ms | 138 → 120 ms |
| index.html | 390×844 | 12 → 11 | 547,903 → 337,022 B | 456,487 → 243,170 B | 2 → 1 | 0.02283 → 0.02283 | 156 → 130 ms | 224 → 232 ms |
| index.html | 1440×900 | 12 → 11 | 547,898 → 337,022 B | 456,482 → 243,170 B | 2 → 1 | 0.13289 → 0.13289 | 510 → 174 ms | 2810 → 2126 ms |
| products.html | 390×844 | 11 → 11 | 206,331 → 208,987 B | 80,679 → 80,680 B | 1 → 1 | 0.00000 → 0.00000 | 122 → 134 ms | 172 → 184 ms |
| products.html | 1440×900 | 11 → 11 | 273,025 → 275,680 B | 147,373 → 147,373 B | 1 → 1 | 0.00000 → 0.00000 | 148 → 158 ms | 246 → 238 ms |
| sales.html | 390×844 | 10 → 10 | 160,554 → 163,208 B | 80,680 → 80,679 B | 1 → 1 | 0.00000 → 0.00000 | 122 → 114 ms | 190 → 192 ms |
| sales.html | 1440×900 | 10 → 10 | 227,248 → 229,903 B | 147,374 → 147,374 B | 1 → 1 | 0.00000 → 0.00000 | 230 → 178 ms | 272 → 254 ms |
| technology.html | 390×844 | 14 → 14 | 89,670 → 92,325 B | 7,113 → 7,113 B | 0 → 0 | 0.00000 → 0.00000 | 122 → 126 ms | 122 → 126 ms |
| technology.html | 1440×900 | 15 → 15 | 91,179 → 93,834 B | 8,622 → 8,622 B | 0 → 0 | 0.00000 → 0.00000 | 182 → 190 ms | 182 → 190 ms |
| ventures.html | 390×844 | 9 → 9 | 77,668 → 80,323 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 110 → 114 ms | 110 → 114 ms |
| ventures.html | 1440×900 | 9 → 9 | 77,668 → 80,323 B | 601 → 601 B | 0 → 0 | 0.00000 → 0.00000 | 124 → 150 ms | 124 → 150 ms |

## Evidence-backed changes

- Preserved the locked Phase 02 CSS `@import` architecture exactly. The attempted import-flattening optimization was rejected by the existing architecture guard and is not part of the Phase 19 product candidate.
- Removed the homepage Unsplash image preload that duplicated the protected film poster request for the same photograph. The protected poster itself remains unchanged.
- Removed redundant `dns-prefetch` for Unsplash while retaining the stronger `preconnect` used by the first-view poster.
- No remote image was copied into the repository.

## Budget result

- `index.html` 1440×900: requests -1; transfer -38.5%; third-party -1; CLS +0.00000.
- `index.html` 390×844: requests -1; transfer -38.5%; third-party -1; CLS +0.00000.
- `corporate.html` 1440×900: requests +0; transfer +3.2%; third-party +0; CLS +0.00000.
- `corporate.html` 390×844: requests +0; transfer +3.2%; third-party +0; CLS +0.00000.
- `energy.html` 1440×900: requests +0; transfer +1.0%; third-party +0; CLS +0.00000.
- `energy.html` 390×844: requests +0; transfer +1.4%; third-party +0; CLS +0.00000.
- `products.html` 1440×900: requests +0; transfer +1.0%; third-party +0; CLS +0.00000.
- `products.html` 390×844: requests +0; transfer +1.3%; third-party +0; CLS +0.00000.
- `sales.html` 1440×900: requests +0; transfer +1.2%; third-party +0; CLS +0.00000.
- `sales.html` 390×844: requests +0; transfer +1.7%; third-party +0; CLS +0.00000.
- `technology.html` 1440×900: requests +0; transfer +2.9%; third-party +0; CLS +0.00000.
- `technology.html` 390×844: requests +0; transfer +3.0%; third-party +0; CLS +0.00000.
- `evidence-axis.html` 1440×900: requests +0; transfer +3.4%; third-party +0; CLS +0.00000.
- `evidence-axis.html` 390×844: requests +0; transfer +3.4%; third-party +0; CLS +0.00000.
- `ventures.html` 1440×900: requests +0; transfer +3.4%; third-party +0; CLS +0.00000.
- `ventures.html` 390×844: requests +0; transfer +3.4%; third-party +0; CLS +0.00000.
- `contact.html` 1440×900: requests +0; transfer +3.4%; third-party +0; CLS +0.00000.
- `contact.html` 390×844: requests +0; transfer +3.4%; third-party +0; CLS +0.00000.

## Film performance finding

`PHASE19-FILM-PERFORMANCE-001`: the protected film poster remains a fixed Unsplash `w=2000` request on mobile. Baseline local transfer was about 227 KB for that poster at 390×844. Correcting the poster width would modify protected hero/player markup, so Phase 19 reports the issue and does not change it. The 43.8 MB local MP4 is protected and was not recompressed. Python local static serving returned the MP4 with HTTP 200 rather than proving production range behavior, so production video-bandwidth/range performance is not asserted.

## Limits

- Local timing is noisy and not a substitute for production RUM.
- HTTPS/custom-domain release blocker remains open, so no production transport conclusion is claimed.

## PERFORMANCE MEASUREMENT MODEL

Phase 19 performance acceptance separates the **product source graph** from the **browser runtime graph**. A URL that appears only in a candidate browser sample is not source-added unless the candidate source graph actually introduces the URL/declaration, host, logical asset, or responsible request rule.

**Layer A — deterministic product graph.** Candidate-source-added local or external resources, new declarations (`src`, `srcset`, `poster`, preload, CSS `url()`, `image-set()`, or attributable JS URL rules), new hosts/resource classes, deterministic duplicate requests, repeatable deterministic frequency increases, new JS/CSS/font dependencies, unexplained deterministic transfer growth, and CLS regressions remain strict failures.

**Layer B — stochastic third-party image response.** Exact runtime image URLs are retained and also mapped to a logical asset. For Unsplash the logical identity is `images.unsplash.com + photo identifier`. Runtime-only or intermittent variants may be adjudicated only when the logical asset exists in both source graphs, candidate source adds no declaration/host/class for the asset, deterministic route resources remain clean, the logical image still loads, and CLS/visual/functional gates remain clean. Exact small-sample occurrence equality is not required.

**Source removal / optimization.** A declaration present in baseline source and intentionally removed from candidate source is recorded separately from stochastic runtime disappearance. The homepage `w=1800` preload removal is the canonical Phase 19 example.

**Exact URL vs logical asset.** Query variants such as `w=1200`, `w=1800`, and `w=3000` remain visible as exact evidence. Logical grouping never authorizes a candidate-source-added large variant or preload.

**Source-diff authority.** Source graphs record the exact external URL, logical asset, source file, source line and declaration type for route-relevant HTML/CSS/JS dependency closure. Runtime-only observations are not classified as candidate-added resources without source evidence.

**One-sided regression rule.** The gate asks whether Phase 19 introduced a regression. Candidate-source additions, deterministic increases, unexplained deterministic bytes, or CLS regression fail. Pre-existing stochastic third-party behavior does not fail merely because a small sample reproduces with a different occurrence count.

### PERF-QA-MEASUREMENT-001 — CONTACT MOBILE

Classification: **STRUCTURAL SAME-RUN REQUEST GRAPH**  
Disposition: **NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED**

### PERF-QA-MEASUREMENT-002 — SALES DESKTOP

Classification: **PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST**  
Disposition: **NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED**

### PERF-QA-MEASUREMENT-003 — PRODUCTS MOBILE

Classification: **PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST**  
Disposition: **NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED**

Case: `products.html / 390×844`. The pre-existing `w=3000` Unsplash variant was observed 1 time(s) in five baseline cold runs and 0 time(s) in five candidate cold runs. The intended `w=1200` responsive image occurred 5/5 baseline and 5/5 candidate. Candidate-added URLs, hosts and resource classes were all zero.

### Final generic adjudication summary

Unresolved performance failures: **0**.

## FINAL GENERIC PERFORMANCE EVIDENCE

The final Phase 19 performance architecture is the authoritative source-vs-runtime generic model. It does **not** execute route-specific stochastic diagnostics during final acceptance. Historical PERF-QA measurement records remain documented evidence only; they are not runtime bypass files and are not hard dependencies of this documentation pipeline.

Final generic model: **Phase 19 source-vs-runtime two-layer performance acceptance**.
Final unresolved performance failures: **0**.
Final acceptance errors: **0**.

### PERF-QA-MEASUREMENT-001 — CONTACT MOBILE

Classification: **STRUCTURAL SAME-RUN REQUEST GRAPH**.  
Disposition: **NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED**.
Prior five-run request counts: baseline `[9, 9, 9, 9, 9]`, candidate `[9, 9, 9, 9, 9]`. Prior third-party counts: baseline `[0, 0, 0, 0, 0]`, candidate `[0, 0, 0, 0, 0]`.
This was prior diagnostic evidence. The final Phase 19 architecture no longer executes or requires `contact.html-390x844-performance-diagnostic.json`; the generic source-vs-runtime model is authoritative.

### PERF-QA-MEASUREMENT-002 — SALES DESKTOP

Classification: **PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST**.  
Disposition: **NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED**.
Logical asset: `unsplash:images.unsplash.com:photo-1778403393892-5334f4561b59`. Exact retained evidence variant: `https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=70&w=3000`. Aggregated observed occurrences: baseline **2**, candidate **1**, across **10** cold runs per side. Candidate-added URLs/hosts/classes: **0/0/0**.
This record is retained evidence, not a runtime bypass file. No legacy Sales diagnostic JSON is required by documentation.

### PERF-QA-MEASUREMENT-003 — PRODUCTS MOBILE

Classification: **PRE-EXISTING STOCHASTIC THIRD-PARTY IMAGE REQUEST**.  
Disposition: **NO CANDIDATE-INTRODUCED REGRESSION ESTABLISHED**.
Logical asset: `unsplash:images.unsplash.com:photo-1778403393892-5334f4561b59`. The pre-existing `w=3000` variant was observed **1 / 5** baseline and **0 / 5** candidate; the intended responsive image was observed **5 / 5** baseline and **5 / 5** candidate. Candidate-added URLs/hosts/classes: **0/0/0**.
This record is retained evidence, not a runtime bypass file. No legacy Products diagnostic JSON is required by documentation.

### Final classifier / source-graph fixtures

Classifier fixtures retained in packet: **6 / 6 PASS**, failures **0**.
Source-graph fixtures retained in packet: **2 / 2 PASS**, failures **0**.
These fixture summaries corroborate classifier/documentation wiring; final acceptance authority remains `reports/acceptance.json` plus `reports/performance-adjudication.json`.
