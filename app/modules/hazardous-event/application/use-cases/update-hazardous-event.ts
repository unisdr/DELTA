import type {
	HazardousEventActionResult,
	HazardousEventFieldErrors,
} from "~/modules/hazardous-event/application/action-result";
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

function validateRequiredFields(
	input: UpdateHazardousEventInput,
): HazardousEventFieldErrors {
	const errors: HazardousEventFieldErrors = {};

	if (!input.id) errors.id = "Hazardous event id is required";
	if (!input.countryAccountsId)
		errors.countryAccountsId = "Country account is required";
	if (!input.data.nationalSpecification?.trim()) {
		errors.nationalSpecification = "National Specification is required";
	}
	if (!input.data.recordOriginator?.trim()) {
		errors.recordOriginator = "Record originator is required";
	}
	if (!input.data.startDate?.trim())
		errors.startDate = "Start date is required";
	if (!input.data.hazardousEventStatus) {
		errors.hazardousEventStatus = "Hazardous event status is required";
	}
	if (
		!input.data.hipHazardId &&
		!input.data.hipClusterId &&
		!input.data.hipTypeId
	) {
		errors.hazardClassification =
			"At least one hazard classification value is required";
	}

	return errors;
}

export class UpdateHazardousEventUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(
		input: UpdateHazardousEventInput,
	): Promise<HazardousEventActionResult> {
		const validationErrors = validateRequiredFields(input);
		if (Object.keys(validationErrors).length > 0) {
			return {
				ok: false,
				error: "Please fix the highlighted fields.",
				fieldErrors: validationErrors,
			};
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
