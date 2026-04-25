import type { HazardousEventActionResult } from "~/modules/hazardous-event/application/action-result";
import { HazardousEventDomainError } from "~/modules/hazardous-event/domain/errors";
import type {
	HazardousEventRepositoryPort,
	HazardousEventWriteData,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface UpdateHazardousEventInput {
	id: string;
	countryAccountsId: string;
	data: HazardousEventWriteData;
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

		if (!input.countryAccountsId) {
			return { ok: false, error: "Country account is required" };
		}

		try {
			const updated = await this.hazardousEventRepository.updateById(
				input.id,
				input.countryAccountsId,
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
