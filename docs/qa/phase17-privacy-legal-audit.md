# Phase 17 — Privacy / Legal factual audit

Internal QA record. This document is not legal advice and is not presented as a formal KVKK Article 10 notice.

Reviewed product baseline: `b4cc37d001164dca6fc034caf997507b64f2eefe`
Review date: 1 September 2026

## Official KVKK references consulted

1. Kişisel Verileri Koruma Kurumu — Aydınlatma Yükümlülüğü: https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-
2. Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ: https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig
3. Çerez Uygulamaları Hakkında Rehber: https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber
4. Kurul decision summary 2022/1358 on cookie information / consent: https://www.kvkk.gov.tr/Icerik/7595/2022-1358
5. Kurul decision summary 2024/1361 on non-essential analytics cookies: https://www.kvkk.gov.tr/Icerik/8884/2024-1361
6. Kurul decision summary 2020/71 on identifying controller / processor roles: https://www.kvkk.gov.tr/Icerik/6874/2020-71

Article 10 / the Tebliğ require a formal information notice to identify, among other elements, the controller and any representative, purposes, recipient categories/purposes, collection method/legal reason and Article 11 rights. The current approved repository evidence does not establish all of those legal determinations for every website/contact activity. The public page therefore remains a factual `Website Privacy & Cookies Notice` rather than a document titled `KVKK Aydınlatma Metni`.

## Required legal-review records

- `LEGAL-PRIVACY-001 — FORMAL DATA-CONTROLLER IDENTITY / ARTICLE 10 NOTICE — STATUS: LEGAL REVIEW REQUIRED`
- `LEGAL-PRIVACY-002 — TURKISH FORMAL NOTICE — STATUS: LEGAL REVIEW REQUIRED`
- Specific legal basis by processing activity — `LEGAL REVIEW REQUIRED`
- Recipient categories / international-transfer architecture — `LEGAL REVIEW REQUIRED`
- Business-correspondence retention rules — `LEGAL REVIEW REQUIRED`
- Formal Article 11 request procedure — `LEGAL REVIEW REQUIRED`
- VERBIS registration / exemption status — `LEGAL REVIEW REQUIRED / NOT PUBLISHED`

## Public-statement decisions

| PUBLIC STATEMENT | CURRENT TECHNICAL / FACTUAL SOURCE | LEGAL SOURCE IF APPLICABLE | SUPPORTED? | LEGAL REVIEW REQUIRED? | PUBLIC WORDING DECISION |
|---|---|---|---|---|---|
| Site has no account-registration flow | Current 16-route source/browser audit | — | YES | NO | State narrowly. |
| Site has no general server-backed contact form | Current routes; Contact uses mailto/tel; Sales RFQ has local form with mailto handoff | — | YES | NO | Distinguish static website from later correspondence. |
| RFQ fields are structured in-browser and prepared into mailto | `sales.html` inline RFQ code + browser audit | — | YES | NO | Preserve Phase 11 handoff truthfully. |
| No cookies observed in reviewed flows | Phase 17 clean-context browser instrumentation | KVKK cookie guidance used for banner decision | YES, time-bounded | NO | Say no cookies were observed; do not say “no cookies ever”. |
| No localStorage/sessionStorage/IndexedDB/service worker observed | Phase 17 browser instrumentation | — | YES, time-bounded | NO | State reviewed implementation result. |
| No analytics/advertising/XHR/fetch/beacon observed | Phase 17 request instrumentation | KVKK cookie guidance / decisions | YES, time-bounded | NO | State reviewed implementation result. |
| External image requests remain | Phase 17 request inventory | — | YES | NO | Identify exact host and route classes; do not preserve vague historical wording. |
| Hosting/network delivery can expose ordinary request metadata | Basic HTTP delivery behavior; browser request audit | — | YES at high level | YES for provider roles/retention/location/transfers | Keep provider-neutral and do not invent log details. |
| Email/phone correspondence can contain personal data chosen by sender | Published mailto/tel flows and RFQ fields | — | YES | YES for formal legal-basis/recipient/retention determinations | Describe categories and business purposes narrowly. |
| Operating company is sole website data controller | NOT established by approved repository evidence | Article 10; 2020/71 controller-role decision | NO | YES | Do not publish as settled fact. |
| Specific KVKK legal basis | NOT legally reviewed/source-locked | Article 10 / Tebliğ | NO | YES | Do not select one. |
| Recipient / transfer categories | Operational architecture not fully source-locked for legal publication | Article 10 / Tebliğ | NO | YES | Do not claim never share / never transfer. |
| Fixed correspondence retention period | No approved retention schedule in repository | — | NO | YES | Do not invent a period. |
| Article 11 rights exist | Official KVKK framework | Article 10 / Article 11 framework | YES | YES for formal request procedure | Refer accurately without inventing deadline/procedure. |
| Turkish authoritative notice exists | No legally reviewed Turkish notice in current public site | — | NO | YES | Do not machine-generate one. |
| Website information is a binding commercial offer | Current commercial architecture says opposite | — | NO | NO | Preserve non-binding reference boundary. |
| Evidence Axis relationship | Phase 12/14/15 locked wording | — | YES | NO new legal conclusion | Preserve exact approved relationship wording. |
| YEKI HAST operating-service status | Phase 15 evidence says development-stage only | — | NO | NO | Preserve `DEVELOPMENT-STAGE DIGITAL PRODUCT`. |

## Cookie-banner decision

No banner is added if final candidate instrumentation continues to show no cookie, browser-storage, analytics/advertising or similar tracking mechanism. If the final candidate detects any such mechanism, the build must stop and report `PRIVACY-COOKIE-001` for reviewer decision rather than silently adding a banner.
