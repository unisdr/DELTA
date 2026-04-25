import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface ListHazardousEventsInput {
	countryAccountsId: string;
	page: number;
	pageSize: number;
	search?: string;
}

export class ListHazardousEventsUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(input: ListHazardousEventsInput) {
		const page = Math.max(1, input.page || 1);
		const pageSize = Math.max(1, input.pageSize || 10);
		const search = (input.search || "").trim().toLowerCase();

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

		const totalItems = filtered.length;
		const offset = (page - 1) * pageSize;
		const items = filtered.slice(offset, offset + pageSize);

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
			},
		};
	}
}
