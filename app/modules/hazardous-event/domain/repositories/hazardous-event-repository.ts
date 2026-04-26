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

export type HazardousEventGeometryType =
	| "POINT"
	| "LINESTRING"
	| "POLYGON"
	| "MULTIPOLYGON";

export interface HazardousEventGeometryWriteData {
	hazardousEventId: string;
	geojson: string;
	geometryType: HazardousEventGeometryType;
	name?: string | null;
	source?: string | null;
	isPrimary?: boolean;
	validFrom?: Date | null;
	validTo?: Date | null;
	createdBy?: string | null;
}

export interface HazardousEventGeometryRecord {
	id: string;
	hazardousEventId: string;
	geometryType: HazardousEventGeometryType;
	geometryGeoJson: string;
	name: string | null;
	source: string | null;
	isPrimary: boolean;
	validFrom: Date | null;
	validTo: Date | null;
	createdAt: Date | null;
	createdBy: string | null;
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
	setCauseHazardousEventIds(
		effectHazardousEventId: string,
		causeHazardousEventIds: string[],
	): Promise<void>;
	getCauseHazardousEventIds(effectHazardousEventId: string): Promise<string[]>;
	addGeometry(
		data: HazardousEventGeometryWriteData,
	): Promise<HazardousEventGeometryRecord | null>;
	listGeometriesByHazardousEventId(
		hazardousEventId: string,
	): Promise<HazardousEventGeometryRecord[]>;
	getPrimaryGeometryByHazardousEventId(
		hazardousEventId: string,
	): Promise<HazardousEventGeometryRecord | null>;
	deleteGeometriesByHazardousEventId(hazardousEventId: string): Promise<void>;
}
