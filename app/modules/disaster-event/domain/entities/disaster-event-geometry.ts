export interface DisasterEventGeometry {
	id: string;
	disasterEventId: string | null;
	geomGeoJson: string | null;
	geometryType: "POINT" | "LINESTRING" | "POLYGON" | "MULTIPOLYGON" | null;
	name: string | null;
	isPrimary: boolean;
	createdAt: Date | null;
	updatedAt: Date | null;
}
