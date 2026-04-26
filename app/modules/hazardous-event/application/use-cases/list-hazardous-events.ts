import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface ListHazardousEventsInput {
	countryAccountsId: string;
	page: number;
	pageSize: number;
	search?: string;
	sortField?:
		| "approvalStatus"
		| "nationalSpecification"
		| "specificHazard"
		| "recordOriginator"
		| "id"
		| "startDate"
		| "updatedAt";
	sortOrder?: 1 | -1;
}

function compareNullableStrings(a: string | null, b: string | null): number {
	return (a || "").localeCompare(b || "");
}

function compareNullableDates(a: Date | null, b: Date | null): number {
	const aTime = a instanceof Date ? a.getTime() : -Infinity;
	const bTime = b instanceof Date ? b.getTime() : -Infinity;
	return aTime - bTime;
}

export class ListHazardousEventsUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(input: ListHazardousEventsInput) {
		const page = Math.max(1, input.page || 1);
		const pageSize = Math.max(1, input.pageSize || 10);
		const search = (input.search || "").trim().toLowerCase();
		const sortField = input.sortField || "updatedAt";
		const sortOrder: 1 | -1 = input.sortOrder === 1 ? 1 : -1;

		const data = await this.hazardousEventRepository.findByCountryAccountsId(
			input.countryAccountsId,
		);

		const filtered = search
			? data.filter((row) => {
					return [
						row.id,
						row.description || "",
						row.recordOriginator || "",
						row.dataSource || "",
					].some((value) => value.toLowerCase().includes(search));
				})
			: data;

		const sorted = [...filtered].sort((a, b) => {
			let result = 0;
			switch (sortField) {
				case "approvalStatus":
					result = compareNullableStrings(a.approvalStatus, b.approvalStatus);
					break;
				case "nationalSpecification":
					result = compareNullableStrings(
						a.nationalSpecification,
						b.nationalSpecification,
					);
					break;
				case "specificHazard":
					result = compareNullableStrings(
						a.hipHazardId || a.hipClusterId || a.hipTypeId,
						b.hipHazardId || b.hipClusterId || b.hipTypeId,
					);
					break;
				case "recordOriginator":
					result = compareNullableStrings(a.recordOriginator, b.recordOriginator);
					break;
				case "id":
					result = compareNullableStrings(a.id, b.id);
					break;
				case "startDate":
					result = compareNullableDates(a.startDate, b.startDate);
					break;
				case "updatedAt":
				default:
					result = compareNullableDates(a.updatedAt, b.updatedAt);
					break;
			}

			if (result === 0) {
				return compareNullableDates(a.updatedAt, b.updatedAt) * -1;
			}

			return result * sortOrder;
		});

		const totalItems = sorted.length;
		const offset = (page - 1) * pageSize;
		const items = sorted.slice(offset, offset + pageSize);

		return {
			data: {
				items,
				pagination: {
					totalItems,
					itemsOnThisPage: items.length,
					page,
					pageSize,
					extraParams: {},
				},
			},
			filters: {
				search: input.search || "",
				sortField,
				sortOrder,
			},
		};
	}
}
