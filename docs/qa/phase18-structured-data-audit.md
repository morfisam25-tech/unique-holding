# Phase 18 — Structured Data Audit

Structured data is deliberately conservative. No schema is used to settle unresolved legal/group relationships or imply inventory, pricing, availability, launch status, ratings, ownership, producer status or social identity.

|ROUTE|@TYPE|@ID|CLAIM-BEARING PROPERTIES|VISIBLE SOURCE|SAFE?|FORBIDDEN PROPERTIES PRESENT?|JSON PARSE RESULT|
|---|---|---|---|---|---|---|---|
|index.html|Organization|https://www.uniqueholding.com.tr/#organization|name, url|Public Unique Holding group brand name and canonical site identity. No legalName or legal-entity relationship encoded.|YES|NO|PASS|
|index.html|WebSite|https://www.uniqueholding.com.tr/#website|url, name, inLanguage, publisher|Public site identity and canonical domain.|YES|NO|PASS|
|index.html|WebPage|https://www.uniqueholding.com.tr/#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|corporate.html|AboutPage|https://www.uniqueholding.com.tr/corporate.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|energy.html|WebPage|https://www.uniqueholding.com.tr/energy.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|products.html|CollectionPage|https://www.uniqueholding.com.tr/products.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|urea-46.html|WebPage|https://www.uniqueholding.com.tr/urea-46.html#webpage|url, name, description, inLanguage, isPartOf, publisher, mainEntity|Visible page title/body subject and canonical route.|YES|NO|PASS|
|urea-46.html|Product|https://www.uniqueholding.com.tr/urea-46.html#product|name, description, url, category, additionalProperty|Exact visible product identity, lead description, category and published reference table on the same route.|YES|NO|PASS|
|caustic-soda-solid.html|WebPage|https://www.uniqueholding.com.tr/caustic-soda-solid.html#webpage|url, name, description, inLanguage, isPartOf, publisher, mainEntity|Visible page title/body subject and canonical route.|YES|NO|PASS|
|caustic-soda-solid.html|Product|https://www.uniqueholding.com.tr/caustic-soda-solid.html#product|name, description, url, category, additionalProperty|Exact visible product identity, lead description, category and published reference table on the same route.|YES|NO|PASS|
|sodium-sulphate-anhydrous.html|WebPage|https://www.uniqueholding.com.tr/sodium-sulphate-anhydrous.html#webpage|url, name, description, inLanguage, isPartOf, publisher, mainEntity|Visible page title/body subject and canonical route.|YES|NO|PASS|
|sodium-sulphate-anhydrous.html|Product|https://www.uniqueholding.com.tr/sodium-sulphate-anhydrous.html#product|name, description, url, category, additionalProperty|Exact visible product identity, lead description, category and published reference table on the same route.|YES|NO|PASS|
|sales.html|WebPage|https://www.uniqueholding.com.tr/sales.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|technology.html|WebPage|https://www.uniqueholding.com.tr/technology.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|evidence-axis.html|WebPage|https://www.uniqueholding.com.tr/evidence-axis.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|ventures.html|WebPage|https://www.uniqueholding.com.tr/ventures.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|contact.html|ContactPage|https://www.uniqueholding.com.tr/contact.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|privacy.html|WebPage|https://www.uniqueholding.com.tr/privacy.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|
|legal.html|WebPage|https://www.uniqueholding.com.tr/legal.html#webpage|url, name, description, inLanguage, isPartOf, publisher|Visible page title/body subject and canonical route.|YES|NO|PASS|

## Boundaries

- Organization entity: `https://www.uniqueholding.com.tr/#organization`; properties limited to `name` and `url` beyond identifiers/type.
- WebSite entity: `https://www.uniqueholding.com.tr/#website`; no SearchAction.
- WebPage IDs use each canonical plus `#webpage`.
- Core Product IDs use each canonical plus `#product`. No Offer, price, availability, seller, manufacturer, brand, SKU, MPN, GTIN, review or rating data.
- No `sameAs`, `legalName`, tax/VAT identifiers, founder, employee count, parentOrganization or subOrganization.
- Evidence Axis: WebPage only; approved visible wording remains “a specialist venture within the Unique Holding portfolio.”
- YEKI HAST: no standalone structured-data entity.
