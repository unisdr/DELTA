export type CountQuery = (sqlText: string) => Promise<number>;

export interface SpatialValidationMetrics {
	expectedObservations: number;
	actualObservations: number;
	observationsWithGeomLink: number;
	observationsWithDivisionLink: number;
	observationsWithAnyLink: number;
	observationsWithNoLinks: number;
	observationAssociationMismatches: number;
	observationTimeOrNoteNonNull: number;
	geomSourceCount: number;
	geomTargetCount: number;
	geomMissingInTarget: number;
	geomExtraInTarget: number;
	geomContentOrAssociationMismatches: number;
	divisionSourceDistinctPairs: number;
	divisionTargetCount: number;
	divisionMissingInTarget: number;
	divisionExtraInTarget: number;
	divisionContentOrAssociationMismatches: number;
	divisionLowestIdMismatches: number;
}

const SPATIAL_VALIDATION_QUERIES = {
	expectedObservations:
		"SELECT count(*)::int as c FROM (SELECT hazardous_event_id FROM public.hazardous_event_geom UNION SELECT hazardous_event_id FROM public.hazardous_event_division) src",
	actualObservations:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation",
	observationsWithGeomLink:
		"SELECT count(*)::int as c FROM (SELECT DISTINCT hazardous_event_spatial_observation_id FROM public.hazardous_event_spatial_observation_geom) src",
	observationsWithDivisionLink:
		"SELECT count(*)::int as c FROM (SELECT DISTINCT hazardous_event_spatial_observation_id FROM public.hazardous_event_spatial_observation_division) src",
	observationsWithAnyLink:
		"SELECT count(*)::int as c FROM (SELECT hazardous_event_spatial_observation_id FROM public.hazardous_event_spatial_observation_geom UNION SELECT hazardous_event_spatial_observation_id FROM public.hazardous_event_spatial_observation_division) src",
	observationsWithNoLinks:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation o LEFT JOIN (SELECT hazardous_event_spatial_observation_id FROM public.hazardous_event_spatial_observation_geom UNION SELECT hazardous_event_spatial_observation_id FROM public.hazardous_event_spatial_observation_division) linked ON linked.hazardous_event_spatial_observation_id = o.id WHERE linked.hazardous_event_spatial_observation_id IS NULL",
	observationAssociationMismatches:
		"SELECT count(*)::int as c FROM (SELECT hazardous_event_id, md5('delta:hazardous-event:initial-spatial-observation:' || hazardous_event_id::text)::uuid AS observation_id FROM (SELECT hazardous_event_id FROM public.hazardous_event_geom UNION SELECT hazardous_event_id FROM public.hazardous_event_division) ev) src LEFT JOIN public.hazardous_event_spatial_observation o ON o.id = src.observation_id WHERE o.id IS NULL OR o.hazardous_event_id IS DISTINCT FROM src.hazardous_event_id",
	observationTimeOrNoteNonNull:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation WHERE observation_time IS NOT NULL OR note IS NOT NULL",
	geomSourceCount:
		"SELECT count(*)::int as c FROM public.hazardous_event_geom",
	geomTargetCount:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation_geom",
	geomMissingInTarget:
		"SELECT count(*)::int as c FROM public.hazardous_event_geom g LEFT JOIN public.hazardous_event_spatial_observation_geom ng ON ng.id = g.id WHERE ng.id IS NULL",
	geomExtraInTarget:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation_geom ng LEFT JOIN public.hazardous_event_geom g ON g.id = ng.id WHERE g.id IS NULL",
	geomContentOrAssociationMismatches:
		"SELECT count(*)::int as c FROM public.hazardous_event_geom g JOIN (SELECT hazardous_event_id, md5('delta:hazardous-event:initial-spatial-observation:' || hazardous_event_id::text)::uuid AS observation_id FROM (SELECT hazardous_event_id FROM public.hazardous_event_geom UNION SELECT hazardous_event_id FROM public.hazardous_event_division) ev) m ON m.hazardous_event_id = g.hazardous_event_id JOIN public.hazardous_event_spatial_observation_geom ng ON ng.id = g.id WHERE ng.hazardous_event_spatial_observation_id IS DISTINCT FROM m.observation_id OR ng.title IS DISTINCT FROM g.title OR ST_AsEWKB(ng.geom) IS DISTINCT FROM ST_AsEWKB(g.geom)",
	divisionSourceDistinctPairs:
		"SELECT count(*)::int as c FROM (SELECT DISTINCT ON (hazardous_event_id, division_id) id, hazardous_event_id, division_id FROM public.hazardous_event_division ORDER BY hazardous_event_id, division_id, id) src",
	divisionTargetCount:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation_division",
	divisionMissingInTarget:
		"SELECT count(*)::int as c FROM (SELECT DISTINCT ON (hazardous_event_id, division_id) id, hazardous_event_id, division_id FROM public.hazardous_event_division ORDER BY hazardous_event_id, division_id, id) d LEFT JOIN public.hazardous_event_spatial_observation_division nd ON nd.id = d.id WHERE nd.id IS NULL",
	divisionExtraInTarget:
		"SELECT count(*)::int as c FROM public.hazardous_event_spatial_observation_division nd LEFT JOIN (SELECT DISTINCT ON (hazardous_event_id, division_id) id, hazardous_event_id, division_id FROM public.hazardous_event_division ORDER BY hazardous_event_id, division_id, id) d ON d.id = nd.id WHERE d.id IS NULL",
	divisionContentOrAssociationMismatches:
		"SELECT count(*)::int as c FROM (SELECT DISTINCT ON (hazardous_event_id, division_id) id, hazardous_event_id, division_id FROM public.hazardous_event_division ORDER BY hazardous_event_id, division_id, id) d JOIN (SELECT hazardous_event_id, md5('delta:hazardous-event:initial-spatial-observation:' || hazardous_event_id::text)::uuid AS observation_id FROM (SELECT hazardous_event_id FROM public.hazardous_event_geom UNION SELECT hazardous_event_id FROM public.hazardous_event_division) ev) m ON m.hazardous_event_id = d.hazardous_event_id JOIN public.hazardous_event_spatial_observation_division nd ON nd.id = d.id WHERE nd.hazardous_event_spatial_observation_id IS DISTINCT FROM m.observation_id OR nd.division_id IS DISTINCT FROM d.division_id",
	divisionLowestIdMismatches:
		"SELECT count(*)::int as c FROM (SELECT DISTINCT ON (hazardous_event_id, division_id) hazardous_event_id, division_id, id AS expected_id FROM public.hazardous_event_division ORDER BY hazardous_event_id, division_id, id) x JOIN (SELECT hazardous_event_id, md5('delta:hazardous-event:initial-spatial-observation:' || hazardous_event_id::text)::uuid AS observation_id FROM (SELECT hazardous_event_id FROM public.hazardous_event_geom UNION SELECT hazardous_event_id FROM public.hazardous_event_division) ev) m ON m.hazardous_event_id = x.hazardous_event_id LEFT JOIN public.hazardous_event_spatial_observation_division nd ON nd.hazardous_event_spatial_observation_id = m.observation_id AND nd.division_id = x.division_id WHERE nd.id IS DISTINCT FROM x.expected_id",
} as const;

export async function gatherSpatialValidationMetrics(
	getCount: CountQuery,
): Promise<SpatialValidationMetrics> {
	return {
		expectedObservations: await getCount(
			SPATIAL_VALIDATION_QUERIES.expectedObservations,
		),
		actualObservations: await getCount(
			SPATIAL_VALIDATION_QUERIES.actualObservations,
		),
		observationsWithGeomLink: await getCount(
			SPATIAL_VALIDATION_QUERIES.observationsWithGeomLink,
		),
		observationsWithDivisionLink: await getCount(
			SPATIAL_VALIDATION_QUERIES.observationsWithDivisionLink,
		),
		observationsWithAnyLink: await getCount(
			SPATIAL_VALIDATION_QUERIES.observationsWithAnyLink,
		),
		observationsWithNoLinks: await getCount(
			SPATIAL_VALIDATION_QUERIES.observationsWithNoLinks,
		),
		observationAssociationMismatches: await getCount(
			SPATIAL_VALIDATION_QUERIES.observationAssociationMismatches,
		),
		observationTimeOrNoteNonNull: await getCount(
			SPATIAL_VALIDATION_QUERIES.observationTimeOrNoteNonNull,
		),
		geomSourceCount: await getCount(SPATIAL_VALIDATION_QUERIES.geomSourceCount),
		geomTargetCount: await getCount(SPATIAL_VALIDATION_QUERIES.geomTargetCount),
		geomMissingInTarget: await getCount(
			SPATIAL_VALIDATION_QUERIES.geomMissingInTarget,
		),
		geomExtraInTarget: await getCount(
			SPATIAL_VALIDATION_QUERIES.geomExtraInTarget,
		),
		geomContentOrAssociationMismatches: await getCount(
			SPATIAL_VALIDATION_QUERIES.geomContentOrAssociationMismatches,
		),
		divisionSourceDistinctPairs: await getCount(
			SPATIAL_VALIDATION_QUERIES.divisionSourceDistinctPairs,
		),
		divisionTargetCount: await getCount(
			SPATIAL_VALIDATION_QUERIES.divisionTargetCount,
		),
		divisionMissingInTarget: await getCount(
			SPATIAL_VALIDATION_QUERIES.divisionMissingInTarget,
		),
		divisionExtraInTarget: await getCount(
			SPATIAL_VALIDATION_QUERIES.divisionExtraInTarget,
		),
		divisionContentOrAssociationMismatches: await getCount(
			SPATIAL_VALIDATION_QUERIES.divisionContentOrAssociationMismatches,
		),
		divisionLowestIdMismatches: await getCount(
			SPATIAL_VALIDATION_QUERIES.divisionLowestIdMismatches,
		),
	};
}

export function evaluateSpatialValidation(metrics: SpatialValidationMetrics): {
	passed: boolean;
	actualSummary: string;
	failureReasons: string[];
} {
	const failureReasons: string[] = [];

	if (metrics.expectedObservations !== metrics.actualObservations) {
		failureReasons.push("observation count mismatch");
	}
	if (metrics.observationsWithAnyLink !== metrics.actualObservations) {
		failureReasons.push("one or more observations have no geometry/division link");
	}
	if (metrics.observationsWithNoLinks !== 0) {
		failureReasons.push("explicit no-link observation count is non-zero");
	}
	if (metrics.observationAssociationMismatches !== 0) {
		failureReasons.push("observation to hazardous_event association mismatch");
	}
	if (metrics.observationTimeOrNoteNonNull !== 0) {
		failureReasons.push("observation_time or note unexpectedly non-null");
	}
	if (metrics.geomSourceCount !== metrics.geomTargetCount) {
		failureReasons.push("geometry row count mismatch");
	}
	if (metrics.geomMissingInTarget !== 0 || metrics.geomExtraInTarget !== 0) {
		failureReasons.push("geometry row membership differs from source baseline");
	}
	if (metrics.geomContentOrAssociationMismatches !== 0) {
		failureReasons.push("geometry EWKB/title/association mismatch");
	}
	if (metrics.divisionSourceDistinctPairs !== metrics.divisionTargetCount) {
		failureReasons.push("division distinct pair count mismatch");
	}
	if (metrics.divisionMissingInTarget !== 0 || metrics.divisionExtraInTarget !== 0) {
		failureReasons.push("division link membership differs from source baseline");
	}
	if (metrics.divisionContentOrAssociationMismatches !== 0) {
		failureReasons.push("division association/content mismatch");
	}
	if (metrics.divisionLowestIdMismatches !== 0) {
		failureReasons.push("duplicate-merge lowest-id rule mismatch");
	}

	const actualSummary =
		`expected_observations=${metrics.expectedObservations}, ` +
		`actual_observations=${metrics.actualObservations}, ` +
		`with_geom_link=${metrics.observationsWithGeomLink}, ` +
		`with_division_link=${metrics.observationsWithDivisionLink}, ` +
		`with_any_link=${metrics.observationsWithAnyLink}, ` +
		`no_links=${metrics.observationsWithNoLinks}, ` +
		`geom_source=${metrics.geomSourceCount}, geom_target=${metrics.geomTargetCount}, ` +
		`division_source_distinct=${metrics.divisionSourceDistinctPairs}, division_target=${metrics.divisionTargetCount}, ` +
		`geom_mismatch=${metrics.geomContentOrAssociationMismatches}, division_mismatch=${metrics.divisionContentOrAssociationMismatches}`;

	return {
		passed: failureReasons.length === 0,
		actualSummary,
		failureReasons,
	};
}

export { SPATIAL_VALIDATION_QUERIES };
