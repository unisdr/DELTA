import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface ListHazardousEventsInput {
	countryAccountsId: string;
	page: number;
	pageSize: number;
	search?: string;
	sortField?:
		| "workflowStatus"
		| "nationalSpecification"
		| "specificHazard"
		| "recordOriginator"
		| "id"
		| "startDate"
		| "updatedAt";
	sortOrder?: 1 | -1;
	// HIP hierarchy filters
	hazardTypeId?: string;
	hazardClusterId?: string;
	hazardId?: string;
	// Lookup data for hierarchical filtering
	hipClusters?: Array<{ id: string; typeId: string }>;
	hipHazards?: Array<{ id: string; clusterId: string }>;
	// Advanced filters
	recordOriginatorFilter?: string;
	hazardousEventStatus?: string;
	workflowStatusFilter?: string;
	startDateFrom?: Date;
	startDateTo?: Date;
	createdByUserId?: string;
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

		const searchFiltered = search
			? data.filter((row) => {
					return [
						row.id,
						row.description || "",
						row.recordOriginator || "",
						row.dataSource || "",
					].some((value) => value.toLowerCase().includes(search));
				})
			: data;

		// HIP hierarchy filters
		const hipClusters = input.hipClusters || [];
		const hipHazards = input.hipHazards || [];

		let filtered = searchFiltered;
		if (input.hazardId) {
			filtered = filtered.filter((e) => e.hipHazardId === input.hazardId);
		} else if (input.hazardClusterId) {
			const clusterHazardIds = new Set(
				hipHazards
					.filter((h) => h.clusterId === input.hazardClusterId)
					.map((h) => h.id),
			);
			filtered = filtered.filter(
				(e) =>
					e.hipClusterId === input.hazardClusterId ||
					(e.hipHazardId != null && clusterHazardIds.has(e.hipHazardId)),
			);
		} else if (input.hazardTypeId) {
			const typeClusterIds = new Set(
				hipClusters
					.filter((c) => c.typeId === input.hazardTypeId)
					.map((c) => c.id),
			);
			const typeHazardIds = new Set(
				hipHazards
					.filter((h) => typeClusterIds.has(h.clusterId))
					.map((h) => h.id),
			);
			filtered = filtered.filter(
				(e) =>
					e.hipTypeId === input.hazardTypeId ||
					(e.hipClusterId != null && typeClusterIds.has(e.hipClusterId)) ||
					(e.hipHazardId != null && typeHazardIds.has(e.hipHazardId)),
			);
		}

		if (input.recordOriginatorFilter) {
			const term = input.recordOriginatorFilter.trim().toLowerCase();
			filtered = filtered.filter((e) =>
				(e.recordOriginator || "").toLowerCase().includes(term),
			);
		}
		if (input.hazardousEventStatus) {
			filtered = filtered.filter(
				(e) => e.hazardousEventStatus === input.hazardousEventStatus,
			);
		}
		if (input.workflowStatusFilter) {
			filtered = filtered.filter(
				(e) => e.workflowStatus === input.workflowStatusFilter,
			);
		}
		if (input.startDateFrom) {
			const from = input.startDateFrom;
			filtered = filtered.filter(
				(e) => e.startDate != null && e.startDate >= from,
			);
		}
		if (input.startDateTo) {
			const to = input.startDateTo;
			filtered = filtered.filter(
				(e) => e.startDate != null && e.startDate <= to,
			);
		}
		if (input.createdByUserId) {
			filtered = filtered.filter(
				(e) => e.createdByUserId === input.createdByUserId,
			);
		}

		const sorted = [...filtered].sort((a, b) => {
			let result = 0;
			switch (sortField) {
				case "workflowStatus":
					result = compareNullableStrings(a.workflowStatus, b.workflowStatus);
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
					result = compareNullableStrings(
						a.recordOriginator,
						b.recordOriginator,
					);
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
				hazardTypeId: input.hazardTypeId || "",
				hazardClusterId: input.hazardClusterId || "",
				hazardId: input.hazardId || "",
				recordOriginatorFilter: input.recordOriginatorFilter || "",
				hazardousEventStatus: input.hazardousEventStatus || "",
				workflowStatusFilter: input.workflowStatusFilter || "",
				startDateFrom: input.startDateFrom ?? null,
				startDateTo: input.startDateTo ?? null,
				myRecords: !!input.createdByUserId,
			},
		};
	}
}
