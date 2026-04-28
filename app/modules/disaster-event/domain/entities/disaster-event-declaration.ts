import type { DisasterEvent } from "./disaster-event";

export interface DisasterEventDeclaration {
	id: string;
	disasterEvent: DisasterEvent | null;
	declarationDate: Date | null;
	description: string | null;
}
