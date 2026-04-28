import type { Geometry } from "geojson";

export type GeometryType = "POINT" | "LINESTRING" | "POLYGON" | "MULTIPOLYGON";

export type SpatialTool = "point" | "polygon" | "add-area" | "edit" | null;

export interface GeometryItem {
	id: string;
	geojson: Geometry;
	geometryType: GeometryType;
	name?: string;
	isPrimary: boolean;
}
