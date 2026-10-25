import { describe, expect, it } from "vitest";
import {
	SPATIAL_VALIDATION_QUERIES,
	evaluateSpatialValidation,
} from "../../../scripts/db_migration_validation/spatialValidation";

function baseMetrics() {
	return {
		expectedObservations: 184,
		actualObservations: 184,
		observationsWithGeomLink: 75,
		observationsWithDivisionLink: 116,
		observationsWithAnyLink: 184,
		observationsWithNoLinks: 0,
		observationAssociationMismatches: 0,
		observationTimeOrNoteNonNull: 0,
		geomSourceCount: 81,
		geomTargetCount: 81,
		geomMissingInTarget: 0,
		geomExtraInTarget: 0,
		geomContentOrAssociationMismatches: 0,
		divisionSourceDistinctPairs: 197,
		divisionTargetCount: 197,
		divisionMissingInTarget: 0,
		divisionExtraInTarget: 0,
		divisionContentOrAssociationMismatches: 0,
		divisionLowestIdMismatches: 0,
	};
}

describe("spatialValidation query definitions", () => {
	it("does not read nonexistent geometry/area columns from observation table (regression for false negative)", () => {
		const queries = Object.values(SPATIAL_VALIDATION_QUERIES).join("\n");

		expect(queries).not.toContain(
			"FROM public.hazardous_event_spatial_observation WHERE geometry IS NOT NULL OR area IS NOT NULL OR geom IS NOT NULL",
		);
		expect(queries).toContain("hazardous_event_spatial_observation_geom");
		expect(queries).toContain("hazardous_event_spatial_observation_division");
	});
});

describe("evaluateSpatialValidation", () => {
	it("passes when spatial links and baseline comparisons match", () => {
		const result = evaluateSpatialValidation(baseMetrics());
		expect(result.passed).toBe(true);
		expect(result.failureReasons).toEqual([]);
	});

	it("fails when observations are missing geometry/division links", () => {
		const result = evaluateSpatialValidation({
			...baseMetrics(),
			observationsWithAnyLink: 182,
			observationsWithNoLinks: 2,
		});

		expect(result.passed).toBe(false);
		expect(result.failureReasons).toContain(
			"one or more observations have no geometry/division link",
		);
		expect(result.failureReasons).toContain(
			"explicit no-link observation count is non-zero",
		);
	});

	it("fails when geometry or division associations diverge from source baseline", () => {
		const result = evaluateSpatialValidation({
			...baseMetrics(),
			geomContentOrAssociationMismatches: 1,
			divisionContentOrAssociationMismatches: 1,
		});

		expect(result.passed).toBe(false);
		expect(result.failureReasons).toContain(
			"geometry EWKB/title/association mismatch",
		);
		expect(result.failureReasons).toContain("division association/content mismatch");
	});
});
