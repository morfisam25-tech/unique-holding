from pathlib import Path
import os
root=Path.cwd()
perf=root/'docs/qa/phase19-performance-audit.md'
s=perf.read_text(encoding='utf-8')
s=s.replace('- Flattened the three CSS `@import` dependencies already loaded by `assets/site.css` into the same cascade layers. This removes three render-blocking request dependencies without deleting the source CSS files or changing selector content.','- Preserved the locked Phase 02 CSS `@import` architecture exactly. The attempted import-flattening optimization was rejected by the existing architecture guard and is not part of the Phase 19 product candidate.')
s=s.replace('- Removed the homepage Unsplash image preload that duplicated the protected film poster request for the same photograph. The protected poster itself remains unchanged.','- Removed the homepage Unsplash image preload that duplicated the protected film poster request for the same photograph. The protected poster itself remains unchanged.')
perf.write_text(s,encoding='utf-8')

acc=root/'docs/qa/phase19-accessibility-audit.md'
a=acc.read_text(encoding='utf-8')
a += '''\n## Fix-only targeted diagnostic\n\nTargeted diagnostic run `33644495235` measured the remaining Phase 19 serious contrast nodes before the final fix-only corrections. The remaining failures were limited to five root-cause families: homepage Evidence Axis sample copy (4.29:1 on `#f2eee5`), dark Technology route-card metadata (2.8:1 on `#0e1214`), Evidence Axis sample boundary copy (4.36:1 on `#f0ece4`), dark Ventures route-card metadata (2.8:1 on `#0e1214`), and Legal light-panel labels (1.68:1 on `#ebe6dd`). Corrections were selector-local and did not replace the global orange palette.\n\nThe homepage film H1 `#hero-title` was measured at 1×1 px, absolutely positioned, `white-space: nowrap`, `overflow: hidden`, and clipped with `clip: rect(0,0,0,0)`. It is intentionally visually-hidden semantic text, not visible copy. The text-spacing harness therefore excludes only elements meeting that visually-hidden geometry/style classification rather than making the H1 visible.\n\nThe Privacy text-spacing overflow was a real grid intrinsic-sizing defect in `#correspondence .legal-split`: under the exact spacing override, the 348 px grid scrolled to 415 px and its children rendered at about 414.9 px because `min-width:auto` plus the slash-separated `product/grade/quantity/destination/timing` token created an expanded min-content width. The narrow fix sets the two correspondence cards to `min-width:0` and permits wrapping in their paragraphs with `overflow-wrap:anywhere`; page-level overflow hiding was not used.\n'''
acc.write_text(a,encoding='utf-8')
print('Phase 19 audit documents postprocessed for fix-only evidence and locked Phase 02 architecture.')
