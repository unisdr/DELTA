export class DisasterEventDomainError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DisasterEventDomainError";
	}
}
