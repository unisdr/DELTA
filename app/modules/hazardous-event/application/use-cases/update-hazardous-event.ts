import type { HazardousEventActionResult } from "~/modules/hazardous-event/application/action-result";
import { HazardousEventDomainError } from "~/modules/hazardous-event/domain/errors";
import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface UpdateHazardousEventInput {
	id: string;
	data: Partial<HazardousEventWriteModel>;
}

export class UpdateHazardousEventUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(
		input: UpdateHazardousEventInput,
	): Promise<HazardousEventActionResult> {
		if (!input.id) {
			return { ok: false, error: "Hazardous event id is required" };
		}

		try {
			const updated = await this.hazardousEventRepository.updateById(
				input.id,
				input.data,
			);

			if (!updated) {
				return { ok: false, error: "Unable to update hazardous event" };
			}

			return {
				ok: true,
				intent: "update",
				id: updated.id,
			};
		} catch (err) {
			if (err instanceof HazardousEventDomainError) {
				return { ok: false, error: err.message };
			}
			throw err;
		}
	}
}
