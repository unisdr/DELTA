import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import {
	hazardousEventById,
	hazardousEventCreate,
	hazardousEventDelete,
	hazardousEventIdByImportIdAndCountryAccountsId,
} from "~/backend.server/models/event";
import type {
	HazardousEvent,
	HazardousEventWriteModel,
} from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type {
	HazardousEventRepositoryPort,
	ListHazardousEventsQuery,
	ListHazardousEventsResult,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";
import type { Dr } from "~/modules/hazardous-event/infrastructure/db/client.server";
import { hazardousEventTable } from "~/modules/hazardous-event/infrastructure/db/schema";

function mapToEntity(item: any): HazardousEvent {
	return {
		id: item.id,
		countryAccountsId: item.countryAccountsId,
		status: item.status ?? null,
		hipHazardId: item.hipHazardId ?? null,
		hipClusterId: item.hipClusterId ?? null,
		hipTypeId: item.hipTypeId ?? null,
		startDate: item.startDate || "",
		endDate: item.endDate || "",
		nationalSpecification: item.nationalSpecification ?? null,
		description: item.description ?? null,
		chainsExplanation: item.chainsExplanation ?? null,
		magnitude: item.magnitude ?? null,
		spatialFootprint: item.spatialFootprint ?? null,
		attachments: item.attachments ?? null,
		recordOriginator: item.recordOriginator || "",
		dataSource: item.dataSource ?? null,
		hazardousEventStatus: item.hazardousEventStatus ?? null,
		approvalStatus: item.approvalStatus || "draft",
		apiImportId: item.apiImportId ?? null,
		parentId: item.parent?.id ?? null,
		createdAt: item.createdAt ?? null,
		updatedAt: item.updatedAt ?? null,
	};
}

function buildCreatePayload(data: HazardousEventWriteModel): any {
	return {
		countryAccountsId: data.countryAccountsId,
		hipHazardId: data.hipHazardId ?? null,
		hipClusterId: data.hipClusterId ?? null,
		hipTypeId: data.hipTypeId ?? null,
		startDate: data.startDate,
		endDate: data.endDate,
		nationalSpecification: data.nationalSpecification ?? null,
		description: data.description ?? null,
		chainsExplanation: data.chainsExplanation ?? null,
		magnitude: data.magnitude ?? null,
		spatialFootprint: data.spatialFootprint ?? null,
		attachments: data.attachments ?? null,
		recordOriginator: data.recordOriginator,
		dataSource: data.dataSource ?? null,
		hazardousEventStatus: data.hazardousEventStatus ?? null,
		approvalStatus: data.approvalStatus ?? "draft",
		apiImportId: data.apiImportId ?? null,
		parent: data.parentId || "",
		tempAction: "",
		tempValidatorUserIds: "",
		createdByUserId: data.createdByUserId || "",
		updatedByUserId: data.updatedByUserId || data.createdByUserId || "",
		submittedByUserId: null,
		validatedByUserId: null,
		publishedByUserId: null,
	};
}

export class DrizzleHazardousEventRepository implements HazardousEventRepositoryPort {
	private db: Dr;

	constructor(db: Dr) {
		this.db = db;
	}

	async create(data: HazardousEventWriteModel): Promise<HazardousEvent | null> {
		let createdId: string | null = null;
		await this.db.transaction(async (tx) => {
			const result = await hazardousEventCreate(tx, buildCreatePayload(data));
			if (result.ok && result.id) {
				createdId = String(result.id);
			}
		});

		if (!createdId) {
			return null;
		}

		return this.findById(createdId, data.countryAccountsId);
	}

	async findById(
		id: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null> {
		try {
			const event = await hazardousEventById(id, countryAccountsId);
			if (!event) {
				return null;
			}
			return mapToEntity(event);
		} catch {
			return null;
		}
	}

	async findByImportId(
		apiImportId: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null> {
		let id: string | null = null;
		await this.db.transaction(async (tx) => {
			const found = await hazardousEventIdByImportIdAndCountryAccountsId(
				tx,
				apiImportId,
				countryAccountsId,
			);
			id = found ? String(found) : null;
		});

		if (!id) {
			return null;
		}
		return this.findById(id, countryAccountsId);
	}

	async updateById(
		id: string,
		countryAccountsId: string,
		data: Partial<HazardousEventWriteModel>,
	): Promise<HazardousEvent | null> {
		const setData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if ("hipHazardId" in data) setData.hipHazardId = data.hipHazardId ?? null;
		if ("hipClusterId" in data)
			setData.hipClusterId = data.hipClusterId ?? null;
		if ("hipTypeId" in data) setData.hipTypeId = data.hipTypeId ?? null;
		if ("startDate" in data) setData.startDate = data.startDate;
		if ("endDate" in data) setData.endDate = data.endDate;
		if ("nationalSpecification" in data)
			setData.nationalSpecification = data.nationalSpecification ?? null;
		if ("description" in data) setData.description = data.description ?? null;
		if ("chainsExplanation" in data)
			setData.chainsExplanation = data.chainsExplanation ?? null;
		if ("magnitude" in data) setData.magnitude = data.magnitude ?? null;
		if ("spatialFootprint" in data)
			setData.spatialFootprint = data.spatialFootprint ?? null;
		if ("attachments" in data) setData.attachments = data.attachments ?? null;
		if ("recordOriginator" in data)
			setData.recordOriginator = data.recordOriginator ?? "";
		if ("dataSource" in data) setData.dataSource = data.dataSource ?? null;
		if ("hazardousEventStatus" in data)
			setData.hazardousEventStatus = data.hazardousEventStatus ?? null;
		if ("approvalStatus" in data) setData.approvalStatus = data.approvalStatus;
		if ("apiImportId" in data) setData.apiImportId = data.apiImportId ?? null;

		if (Object.keys(setData).length === 1) {
			return this.findById(id, countryAccountsId);
		}

		const rows = await this.db
			.update(hazardousEventTable)
			.set(setData)
			.where(
				and(
					eq(hazardousEventTable.id, id),
					eq(hazardousEventTable.countryAccountsId, countryAccountsId),
				),
			)
			.returning({ id: hazardousEventTable.id });

		if (!rows[0]?.id) {
			return null;
		}

		return this.findById(id, countryAccountsId);
	}

	async deleteById(
		id: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null> {
		const existing = await this.findById(id, countryAccountsId);
		if (!existing) {
			return null;
		}

		const deleted = await hazardousEventDelete(id, countryAccountsId);
		if (!deleted.ok) {
			return null;
		}
		return existing;
	}

	async listByCountryAccountsId(
		args: ListHazardousEventsQuery,
	): Promise<ListHazardousEventsResult> {
		const search = (args.search || "").trim();
		const page = Math.max(1, args.pagination.page || 1);
		const pageSize = Math.max(1, args.pagination.pageSize || 20);
		const offset = (page - 1) * pageSize;

		const conditions: any[] = [
			eq(hazardousEventTable.countryAccountsId, args.countryAccountsId),
		];

		if (args.hipHazardId)
			conditions.push(eq(hazardousEventTable.hipHazardId, args.hipHazardId));
		if (args.hipClusterId)
			conditions.push(eq(hazardousEventTable.hipClusterId, args.hipClusterId));
		if (args.hipTypeId)
			conditions.push(eq(hazardousEventTable.hipTypeId, args.hipTypeId));
		if (args.approvalStatus)
			conditions.push(
				eq(hazardousEventTable.approvalStatus, args.approvalStatus),
			);
		if (args.hazardousEventStatus) {
			conditions.push(
				eq(hazardousEventTable.hazardousEventStatus, args.hazardousEventStatus),
			);
		}
		if (args.recordOriginator) {
			conditions.push(
				eq(hazardousEventTable.recordOriginator, args.recordOriginator),
			);
		}
		if (args.fromDate) {
			conditions.push(
				sql`${hazardousEventTable.startDate} >= ${args.fromDate}`,
			);
		}
		if (args.toDate) {
			conditions.push(sql`${hazardousEventTable.endDate} <= ${args.toDate}`);
		}
		if (search) {
			const searchIlike = `%${search}%`;
			conditions.push(
				or(
					sql`${hazardousEventTable.id}::text ILIKE ${searchIlike}`,
					ilike(hazardousEventTable.description, searchIlike),
					ilike(hazardousEventTable.recordOriginator, searchIlike),
					ilike(hazardousEventTable.dataSource, searchIlike),
				),
			);
		}

		const where = and(...conditions);
		const totalItems = await this.db.$count(hazardousEventTable, where);

		const rows = await this.db.query.hazardousEventTable.findMany({
			where,
			offset,
			limit: pageSize,
			orderBy: [desc(hazardousEventTable.updatedAt)],
			columns: {
				id: true,
				hipHazardId: true,
				hipClusterId: true,
				hipTypeId: true,
				recordOriginator: true,
				startDate: true,
				endDate: true,
				approvalStatus: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return {
			items: rows,
			pagination: {
				totalItems,
				itemsOnThisPage: rows.length,
				page,
				pageSize,
				extraParams: search ? { search: [search] } : {},
			},
		};
	}
}
