import type { DisasterEventActionResult } from "~/modules/disaster-event/application/action-result";
import { DisasterEventDomainError } from "~/modules/disaster-event/domain/errors";
import type { DisasterEventWriteModel } from "~/modules/disaster-event/domain/entities/disaster-event";
import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";

interface CreateDisasterEventInput extends DisasterEventWriteModel {}

function validateRequiredFields(
	input: CreateDisasterEventInput,
): string | null {
	if (!input.countryAccountsId) return "Country account is required";
	if (!input.nameNational?.trim()) return "National name is required";
	if (!input.nationalDisasterId?.trim())
		return "National disaster ID is required";
	if (!input.recordingInstitution?.trim()) {
		return "Recording institution is required";
	}
	return null;
}

export class CreateDisasterEventUseCase {
	constructor(
		private readonly disasterEventRepository: DisasterEventRepositoryPort,
	) {}

	async execute(
		input: CreateDisasterEventInput,
	): Promise<DisasterEventActionResult> {
		const validationError = validateRequiredFields(input);
		if (validationError) {
			return { ok: false, error: validationError };
		}

		try {
			const created = await this.disasterEventRepository.create({
				...input,
				approvalStatus: input.approvalStatus || "draft",
				nameNational: input.nameNational.trim(),
				nationalDisasterId: input.nationalDisasterId.trim(),
				recordingInstitution: input.recordingInstitution.trim(),
			});

			if (!created) {
				return { ok: false, error: "Unable to create disaster event" };
			}

			return {
				ok: true,
				intent: "create",
				id: created.id,
			};
		} catch (err) {
			if (err instanceof DisasterEventDomainError) {
				return { ok: false, error: err.message };
			}
			throw err;
		}
	}
}
