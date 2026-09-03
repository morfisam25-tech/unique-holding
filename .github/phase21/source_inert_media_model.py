from __future__ import annotations


def classify_source_inert_media(*,
    baseline_logical_source: bool,
    candidate_logical_source: bool,
    responsible_source_changed: bool,
    candidate_added_media_declaration: bool,
    candidate_only_host: bool,
    candidate_only_resource_class: bool,
    baseline_effective_suppressed: bool,
    candidate_effective_suppressed: bool,
    baseline_suppression_stable: bool,
    candidate_suppression_stable: bool,
    affected_region_visual_regression: bool,
    geometry_regression: bool,
    intended_media_disappears: bool,
    cls_regression: bool,
    deterministic_graph_regression: bool,
    full_page_visual_covered_separately: bool,
    unrelated_outside_region_raster_delta: bool = False,
) -> dict:
    checks = {
        'sharedLogicalAsset': bool(baseline_logical_source and candidate_logical_source),
        'responsibleSourceDeclarationsUnchanged': not responsible_source_changed,
        'noCandidateAddedMediaDeclaration': not candidate_added_media_declaration,
        'noCandidateOnlyHostOrResourceClass': not candidate_only_host and not candidate_only_resource_class,
        'effectiveComputedMediaSuppressedBothSides': bool(baseline_effective_suppressed and candidate_effective_suppressed),
        'suppressionStableAtRequiredLifecycleCheckpoints': bool(baseline_suppression_stable and candidate_suppression_stable),
        'affectedRegionNoMaterialVisualRegression': not affected_region_visual_regression,
        'affectedElementGeometryUnchanged': not geometry_regression,
        'intendedRouteMediaPreserved': not intended_media_disappears,
        'clsDoesNotRegress': not cls_regression,
        'deterministicProductGraphStrict': not deterministic_graph_regression,
        'fullPageVisualCoveredSeparately': bool(full_page_visual_covered_separately),
    }
    source_inert = all(checks.values())

    if source_inert:
        return {
            'status': 'PASS',
            'classification': 'SOURCE-INERT ASSET — NO CANDIDATE-INTRODUCED PERFORMANCE REGRESSION',
            'reason': 'source-declared logical asset is not effective route media; affected-region, geometry, CLS and deterministic graph remain strict',
            'checks': checks,
            'outsideRegionRasterDeltaIgnoredForMediaSpecificAdjudication': bool(unrelated_outside_region_raster_delta),
        }

    real_regression_reasons = []
    if responsible_source_changed:
        real_regression_reasons.append('responsible media source changed')
    if candidate_added_media_declaration:
        real_regression_reasons.append('candidate-added media declaration')
    if candidate_only_host or candidate_only_resource_class:
        real_regression_reasons.append('candidate-only host/resource class')
    if baseline_effective_suppressed and not candidate_effective_suppressed:
        real_regression_reasons.append('candidate removed effective suppression')
    if affected_region_visual_regression:
        real_regression_reasons.append('affected media region regressed')
    if geometry_regression:
        real_regression_reasons.append('affected element geometry regressed')
    if intended_media_disappears:
        real_regression_reasons.append('intended route media disappeared')
    if cls_regression:
        real_regression_reasons.append('CLS regressed')
    if deterministic_graph_regression:
        real_regression_reasons.append('deterministic request/transfer graph regressed')

    if real_regression_reasons:
        return {
            'status': 'FAIL',
            'classification': 'REAL PERFORMANCE REGRESSION',
            'reason': '; '.join(real_regression_reasons),
            'checks': checks,
        }

    return {
        'status': 'FAIL',
        'classification': 'SOURCE-INERT NOT ESTABLISHED',
        'reason': 'one or more required SOURCE-INERT conditions are not proven',
        'checks': checks,
    }
