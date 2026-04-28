import type { DisasterEvent } from "./disaster-event";

export interface DisasterEventAssessment {
	id: string;
	disasterEvent: DisasterEvent | null;
	assessmentTypeId: string | null;
	assessmentDate: Date | null;
	description: string | null;
}
