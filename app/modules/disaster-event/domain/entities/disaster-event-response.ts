import type { DisasterEvent } from "./disaster-event";

export interface DisasterEventResponse {
	id: string;
	disasterEvent: DisasterEvent | null;
	responseTypeId: string | null;
	responseDate: Date | null;
	description: string | null;
}
