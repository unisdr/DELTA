import type { DisasterEventActionResult } from "~/modules/disaster-event/application/action-result";
import { DisasterEventDomainError } from "~/modules/disaster-event/domain/errors";
import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";

interface DeleteDisasterEventInput {
	id: string;
	countryAccountsId: string;
}

export class DeleteDisasterEventUseCase {
	constructor(
		private readonly disasterEventRepository: DisasterEventRepositoryPort,
	) {}

	async execute(
		input: DeleteDisasterEventInput,
	): Promise<DisasterEventActionResult> {
		if (!input.id) {
			return { ok: false, error: "Disaster event id is required" };
		}
		if (!input.countryAccountsId) {
			return { ok: false, error: "Country account is required" };
		}

		try {
			const deleted = await this.disasterEventRepository.deleteById(
				input.id,
				input.countryAccountsId,
			);
			if (!deleted) {
				return { ok: false, error: "Unable to delete disaster event" };
			}

			return {
				ok: true,
				intent: "delete",
				id: deleted.id,
			};
		} catch (err) {
			if (err instanceof DisasterEventDomainError) {
				return { ok: false, error: err.message };
			}
			throw err;
		}
	}
}
