import type { HazardousEventActionResult } from "~/modules/hazardous-event/application/action-result";
import { HazardousEventDomainError } from "~/modules/hazardous-event/domain/errors";
import type {
	HazardousEventRepositoryPort,
	HazardousEventWriteData,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface CreateHazardousEventInput extends HazardousEventWriteData {
	countryAccountsId: string;
	recordOriginator: string;
	startDate: string;
	endDate: string;
}

function validateRequiredFields(
	input: CreateHazardousEventInput,
): string | null {
	if (!input.countryAccountsId) return "Country account is required";
	if (!input.recordOriginator?.trim()) return "Record originator is required";
	if (!input.startDate?.trim()) return "Start date is required";
	if (!input.endDate?.trim()) return "End date is required";
	if (!input.hipHazardId && !input.hipClusterId && !input.hipTypeId) {
		return "At least one hazard classification value is required";
	}
	return null;
}

export class CreateHazardousEventUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(
		input: CreateHazardousEventInput,
	): Promise<HazardousEventActionResult> {
		const validationError = validateRequiredFields(input);
		if (validationError) {
			return {
				ok: false,
				error: validationError,
			};
		}

		try {
			const created = await this.hazardousEventRepository.create({
				...input,
				recordOriginator: input.recordOriginator.trim(),
				hazardousEventStatus: input.hazardousEventStatus || null,
				approvalStatus: input.approvalStatus || "draft",
			});

			if (!created) {
				return {
					ok: false,
					error: "Unable to create hazardous event",
				};
			}

			return {
				ok: true,
				intent: "create",
				id: created.id,
			};
		} catch (err) {
			if (err instanceof HazardousEventDomainError) {
				return { ok: false, error: err.message };
			}
			throw err;
		}
	}
}
