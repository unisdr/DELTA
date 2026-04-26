import type {
	HazardousEventActionResult,
	HazardousEventFieldErrors,
} from "../action-result";
import { HazardousEventDomainError } from "~/modules/hazardous-event/domain/errors";
import type {
	HazardousEventRepositoryPort,
	HazardousEventWriteData,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface CreateHazardousEventInput extends Omit<
	HazardousEventWriteData,
	"startDate" | "endDate"
> {
	countryAccountsId: string;
	recordOriginator: string;
	startDate: string;
	endDate?: string | null;
}

function stringToDate(value: string | null | undefined): Date | null {
	if (!value?.trim()) {
		return null;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validateRequiredFields(
	input: CreateHazardousEventInput,
): HazardousEventFieldErrors {
	const errors: HazardousEventFieldErrors = {};

	if (!input.countryAccountsId)
		errors.countryAccountsId = "Country account is required";
	if (!input.nationalSpecification?.trim()) {
		errors.nationalSpecification = "National Specification is required";
	}
	if (!input.recordOriginator?.trim()) {
		errors.recordOriginator = "Record originator is required";
	}
	if (!input.startDate?.trim()) errors.startDate = "Start date is required";
	if (!input.hazardousEventStatus) {
		errors.hazardousEventStatus = "Hazardous event status is required";
	}
	if (!input.hipHazardId) {
		errors.hazardClassification = "Specific hazard is required";
	}

	return errors;
}

export class CreateHazardousEventUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(
		input: CreateHazardousEventInput,
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
			const created = await this.hazardousEventRepository.create({
				...input,
				startDate: stringToDate(input.startDate),
				endDate: stringToDate(input.endDate as string | null),
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
