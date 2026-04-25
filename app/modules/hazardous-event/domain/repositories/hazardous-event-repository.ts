import { HazardousEvent } from "../entities/hazardous-event";

export interface HazardousEventRepositoryPort {
	create(
		data: Partial<Omit<HazardousEvent, "id" | "createdAt" | "updatedAt">>,
	): Promise<HazardousEvent | null>;
	findById(id: string): Promise<HazardousEvent | null>;
	updateById(
		id: string,
		data: Partial<Omit<HazardousEvent, "id" | "createdAt" | "updatedAt">>,
	): Promise<HazardousEvent | null>;
	deleteById(id: string): Promise<HazardousEvent | null>;
	findByCountryAccountsId(countryAccountsId: string): Promise<HazardousEvent[]>;
}
