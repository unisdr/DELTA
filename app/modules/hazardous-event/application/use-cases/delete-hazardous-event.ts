import type { HazardousEventActionResult } from "~/modules/hazardous-event/application/action-result";
import { HazardousEventDomainError } from "~/modules/hazardous-event/domain/errors";
import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

export class DeleteHazardousEventUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(id: string): Promise<HazardousEventActionResult> {
		if (!id) {
			return { ok: false, error: "Hazardous event id is required" };
		}

		try {
			const deleted = await this.hazardousEventRepository.deleteById(id);

			if (!deleted) {
				return { ok: false, error: "Unable to delete hazardous event" };
			}

			return {
				ok: true,
				intent: "delete",
				id: deleted.id,
			};
		} catch (err) {
			if (err instanceof HazardousEventDomainError) {
				return { ok: false, error: err.message };
			}
			throw err;
		}
	}
}
