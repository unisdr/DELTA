import type { DisasterEventActionResult } from "~/modules/disaster-event/application/action-result";
import { DisasterEventDomainError } from "~/modules/disaster-event/domain/errors";
import type { DisasterEventWriteModel } from "~/modules/disaster-event/domain/entities/disaster-event";
import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";

interface UpdateDisasterEventInput {
	id: string;
	countryAccountsId: string;
	data: Partial<DisasterEventWriteModel>;
}

export class UpdateDisasterEventUseCase {
	constructor(
		private readonly disasterEventRepository: DisasterEventRepositoryPort,
	) {}

	async execute(
		input: UpdateDisasterEventInput,
	): Promise<DisasterEventActionResult> {
		if (!input.id) {
			return { ok: false, error: "Disaster event id is required" };
		}
		if (!input.countryAccountsId) {
			return { ok: false, error: "Country account is required" };
		}

		try {
			const updated = await this.disasterEventRepository.updateById(
				input.id,
				input.countryAccountsId,
				input.data,
			);
			if (!updated) {
				return { ok: false, error: "Unable to update disaster event" };
			}

			return {
				ok: true,
				intent: "update",
				id: updated.id,
			};
		} catch (err) {
			if (err instanceof DisasterEventDomainError) {
				return { ok: false, error: err.message };
			}
			throw err;
		}
	}
}
