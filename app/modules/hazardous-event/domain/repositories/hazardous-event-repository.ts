import type { HazardousEvent } from "../entities/hazardous-event";

export interface HazardousEventPagination {
	totalItems: number;
	itemsOnThisPage: number;
	page: number;
	pageSize: number;
	extraParams: Record<string, string[]>;
}

export interface ListHazardousEventsResult {
	items: HazardousEvent[];
	pagination: HazardousEventPagination;
}

export type HazardousEventWriteData = Partial<
	Omit<
		HazardousEvent,
		| "id"
		| "createdAt"
		| "updatedAt"
		| "causeHazardousEventIds"
		| "effectHazardousEventIds"
	>
>;

export interface HazardousEventRepositoryPort {
	create(data: HazardousEventWriteData): Promise<HazardousEvent | null>;
	findById(id: string): Promise<HazardousEvent | null>;
	updateById(
		id: string,
		data: HazardousEventWriteData,
	): Promise<HazardousEvent | null>;
	deleteById(id: string): Promise<HazardousEvent | null>;
	findByCountryAccountsId(countryAccountsId: string): Promise<HazardousEvent[]>;
}
