# Unique Holding

Corporate website source for Unique Holding.

## Website structure
- Home: `index.html`
- Corporate: `corporate.html`
- Energy & Petrochemicals: `energy.html`
- Products: `products.html`
- Group Ventures: `ventures.html`
- Contact: `contact.html`
- Branded not-found route: `404.html`

## Front-end
The site is a static multi-page implementation using shared CSS and minimal JavaScript:
- `assets/site.css` — global design system, navigation and footer
- `assets/home.css` — homepage composition
- `assets/pages.css` — internal-page layouts
- `assets/responsive.css` — responsive rules
- `assets/site.js` — navigation, scroll state and progressive reveal behavior

## Media gate
The repository currently retains `assets/hero-approved.jpg` and `assets/operations.mp4` from the earlier website workstream. Their file integrity and dimensions have been inspected, but their final visual quality/provenance has not yet been re-verified in the current review session.

Treat both assets as provisional until visual confirmation before merge. The redesign deliberately keeps media integration modular so verified company photography and footage can be replaced without changing the information architecture.

The current operations asset is portrait-format media, so the homepage layout preserves a portrait frame instead of forcing it into a full-width crop.

## Public pages / SEO
The branch includes `robots.txt`, `sitemap.xml`, canonical metadata, Open Graph metadata, accessible skip links, keyboard-safe navigation behavior and basic Organization structured data using published corporate contact information.

## Deployment
`main` remains the production source of truth. The `assistant-redesign` branch is an isolated redesign workstream and should not be merged or deployed until visual review and the media gate are complete.

Vercel, DNS and domain settings are outside this repository workstream and are not modified by the redesign.
