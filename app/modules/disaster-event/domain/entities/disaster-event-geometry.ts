import type { DisasterEvent } from "./disaster-event";

export interface DisasterEventGeometry {
	id: string;
	disasterEvent: DisasterEvent | null;
	geomGeoJson: string | null;
}
