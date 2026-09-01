# Phase 17 — Site data-flow inventory

Generated from actual clean-context Chromium testing against the Phase 17 candidate. This is a technical QA inventory, not legal advice.

## Aggregate result

- 32 CLEAN-CONTEXT CASES — 16 routes × 1440×900 and 390×844
- COOKIES OBSERVED: 0
- LOCALSTORAGE KEYS: 0
- SESSIONSTORAGE KEYS: 0
- INDEXEDDB DATABASES: 0
- SERVICE WORKERS: 0
- ANALYTICS / ADVERTISING REQUESTS: 0
- XHR / FETCH / BEACON: 0
- REMOTE FONTS: 0
- REMOTE SCRIPTS: 0
- REMOTE MEDIA: 0
- THIRD-PARTY IFRAMES / EMBEDS: 0

## Cookie / storage inventory

No cookie or browser-storage item was observed in the 32 reviewed clean-context cases. No durable “never” claim is made.

## Route inventory

| Route | Cookies | localStorage | sessionStorage | IndexedDB | Service worker | Third-party hosts | External resource types | Forms / handoff | XHR/fetch/beacon |
|---|---:|---:|---:|---:|---:|---|---|---|---:|
| `index.html` | 0 | 0 | 0 | 0 | 0 | images.unsplash.com | image | None | 0 |
| `corporate.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `energy.html` | 0 | 0 | 0 | 0 | 0 | images.unsplash.com | image | None | 0 |
| `products.html` | 0 | 0 | 0 | 0 | 0 | images.unsplash.com | image | None | 0 |
| `product.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `urea-46.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `caustic-soda-solid.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `sodium-sulphate-anhydrous.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `sales.html` | 0 | 0 | 0 | 0 | 0 | images.unsplash.com | image | RFQ browser / mailto handoff | 0 |
| `technology.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `evidence-axis.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `ventures.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `contact.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `privacy.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `legal.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |
| `404.html` | 0 | 0 | 0 | 0 | 0 | None | None | None | 0 |

## Third-party request inventory

Observed external hostnames: `images.unsplash.com`.

- image — `images.unsplash.com` — https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&ixlib=rb-4.1.0&q=72&w=1800
- image — `images.unsplash.com` — https://images.unsplash.com/photo-1784911542546-7891c4d7abba?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=60&w=2000
- image — `images.unsplash.com` — https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&ixlib=rb-4.1.0&q=72&w=1800
- image — `images.unsplash.com` — https://images.unsplash.com/photo-1778403393892-5334f4561b59?auto=format&fit=crop&ixlib=rb-4.1.0&q=70&w=1200

## RFQ boundary

`sales.html` contains the `rfq-builder` form. The form has no server submission action. Its current inline script prevents form submission, structures the entered requirement/contact fields into a `mailto:sales@uniqueholding.com.tr` draft and does not contain XMLHttpRequest, fetch or sendBeacon submission logic. Actual transmission occurs only if the visitor continues through their email application. Information actually sent can then become business correspondence outside the static page.

## Review trigger

If a future audit observes a cookie, browser-storage tracking mechanism, analytics/advertising request or other non-essential tracking technology, cookie/choice architecture must be reviewed before treating this inventory as current.
