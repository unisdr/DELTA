export interface DisasterEventGeometry {
	id: string;
	disasterEventId: string | null;
	geomGeoJson: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}
