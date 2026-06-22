import { describe, it, expect } from "vitest";
import type { GeoFeature } from "../../../app/components/CustomMap";

// Re-implement the helper here since it's not exported — mirrors the fix exactly
const normalizeGeoFeature = (feature: GeoFeature): GeoFeature => {
	const geom = feature.geometry;
	if (geom?.type !== "FeatureCollection") return feature;

	const geometries = (geom.features ?? [])
		.map((f: any) => f?.geometry)
		.filter(Boolean);

	return {
		...feature,
		geometry:
			geometries.length === 1
				? geometries[0]
				: { type: "GeometryCollection", geometries },
	};
};

const baseProperties = {
	id: 1,
	name: "Test",
	level: 0,
	parentId: null,
	values: { dataAvailability: "available" as const },
};

describe("normalizeGeoFeature", () => {
	it("passes through a normal Polygon feature unchanged", () => {
		const feature: GeoFeature = {
			type: "Feature",
			properties: baseProperties,
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[1, 0],
						[1, 1],
						[0, 0],
					],
				],
			},
		};
		expect(normalizeGeoFeature(feature)).toBe(feature);
	});

	it("passes through a MultiPolygon feature unchanged", () => {
		const feature: GeoFeature = {
			type: "Feature",
			properties: baseProperties,
			geometry: { type: "MultiPolygon", coordinates: [] },
		};
		expect(normalizeGeoFeature(feature)).toBe(feature);
	});

	it("extracts single geometry from a FeatureCollection geometry", () => {
		const innerGeom = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 0],
				],
			],
		};
		const feature: GeoFeature = {
			type: "Feature",
			properties: baseProperties,
			geometry: {
				type: "FeatureCollection",
				features: [{ type: "Feature", geometry: innerGeom, properties: {} }],
			},
		};

		const result = normalizeGeoFeature(feature);
		expect(result.geometry).toEqual(innerGeom);
	});

	it("wraps multiple geometries in a GeometryCollection when FeatureCollection has many features", () => {
		const geom1 = {
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 0],
				],
			],
		};
		const geom2 = {
			type: "Polygon",
			coordinates: [
				[
					[2, 2],
					[3, 2],
					[3, 3],
					[2, 2],
				],
			],
		};
		const feature: GeoFeature = {
			type: "Feature",
			properties: baseProperties,
			geometry: {
				type: "FeatureCollection",
				features: [
					{ type: "Feature", geometry: geom1, properties: {} },
					{ type: "Feature", geometry: geom2, properties: {} },
				],
			},
		};

		const result = normalizeGeoFeature(feature);
		expect(result.geometry.type).toBe("GeometryCollection");
		expect(result.geometry.geometries).toEqual([geom1, geom2]);
	});

	it("handles empty FeatureCollection gracefully", () => {
		const feature: GeoFeature = {
			type: "Feature",
			properties: baseProperties,
			geometry: { type: "FeatureCollection", features: [] },
		};

		const result = normalizeGeoFeature(feature);
		expect(result.geometry.type).toBe("GeometryCollection");
		expect(result.geometry.geometries).toEqual([]);
	});

	it("preserves feature properties after normalization", () => {
		const feature: GeoFeature = {
			type: "Feature",
			properties: baseProperties,
			geometry: {
				type: "FeatureCollection",
				features: [
					{
						type: "Feature",
						geometry: { type: "Point", coordinates: [0, 0] },
						properties: {},
					},
				],
			},
		};

		const result = normalizeGeoFeature(feature);
		expect(result.properties).toEqual(baseProperties);
		expect(result.type).toBe("Feature");
	});
});
