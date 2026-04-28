export interface HazardousEventGeometry {
	id: string;
	hazardousEventId: string | null;
	geometryGeoJson: string | null;
	geometryType: "POINT" | "LINESTRING" | "POLYGON" | "MULTIPOLYGON" | null;
	name: string | null;
	isPrimary: boolean;
	validFrom: Date | null;
	validTo: Date | null;
	createdAt: Date | null;
	createdBy: string | null;
}
