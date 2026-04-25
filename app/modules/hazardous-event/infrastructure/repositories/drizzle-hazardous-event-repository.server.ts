import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";
import type { Dr } from "~/modules/hazardous-event/infrastructure/db/client.server";

export class DrizzleHazardousEventRepository implements HazardousEventRepositoryPort {
	private db: Dr;

	constructor(db: Dr) {
		this.db = db;
	}
}
