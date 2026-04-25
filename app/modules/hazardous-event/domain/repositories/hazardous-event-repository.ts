import type {
	HazardousEvent,
	HazardousEventListItem,
} from "../entities/hazardous-event";

export interface HazardousEventPagination {
	totalItems: number;
	itemsOnThisPage: number;
	page: number;
	pageSize: number;
	extraParams: Record<string, string[]>;
}

export interface ListHazardousEventsResult {
	items: HazardousEventListItem[];
	pagination: HazardousEventPagination;
}

export type HazardousEventWriteData = Partial<
	Omit<HazardousEvent, "id" | "createdAt" | "updatedAt" | "attachments">
>;

export interface HazardousEventRepositoryPort {
	create(data: HazardousEventWriteData): Promise<HazardousEvent | null>;
	findById(
		id: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null>;
	updateById(
		id: string,
		countryAccountsId: string,
		data: HazardousEventWriteData,
	): Promise<HazardousEvent | null>;
	deleteById(
		id: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null>;
	findByCountryAccountsId(countryAccountsId: string): Promise<HazardousEvent[]>;
}
