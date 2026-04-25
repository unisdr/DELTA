import { and, eq } from "drizzle-orm";
import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type {
	HazardousEventRepositoryPort,
	HazardousEventWriteData,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";
import type { Dr } from "~/modules/hazardous-event/infrastructure/db/client.server";
import { hazardousEventTable } from "~/modules/hazardous-event/infrastructure/db/schema";

export class DrizzleHazardousEventRepository implements HazardousEventRepositoryPort {
	constructor(private readonly db: Dr) {}

	async create(data: HazardousEventWriteData): Promise<HazardousEvent | null> {
		const insertData: typeof hazardousEventTable.$inferInsert = {
			...data,
			nationalSpecification: data.nationalSpecification ?? "",
			description: data.description ?? "",
			chainsExplanation: data.chainsExplanation ?? "",
			magnitude: data.magnitude ?? "",
			recordOriginator: data.recordOriginator ?? "",
			dataSource: data.dataSource ?? "",
			hipTypeId: data.hipTypeId ?? "",
		};

		const rows = await this.db
			.insert(hazardousEventTable)
			.values(insertData)
			.returning()
			.execute();

		if (!rows.length) return null;
		return this.mapToHazardousEvent(rows[0]);
	}

	async findById(
		id: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null> {
		const rows = await this.db
			.select()
			.from(hazardousEventTable)
			.where(
				and(
					eq(hazardousEventTable.id, id),
					eq(hazardousEventTable.countryAccountsId, countryAccountsId),
				),
			)
			.execute();

		if (!rows.length) return null;
		return this.mapToHazardousEvent(rows[0]);
	}

	async updateById(
		id: string,
		countryAccountsId: string,
		data: HazardousEventWriteData,
	): Promise<HazardousEvent | null> {
		const updateData: any = {
			updatedAt: new Date(),
		};

		// Add fields only if they're defined in the update data
		if (data.countryAccountsId !== undefined)
			updateData.countryAccountsId = data.countryAccountsId;
		if (data.hipHazardId !== undefined)
			updateData.hipHazardId = data.hipHazardId;
		if (data.hipClusterId !== undefined)
			updateData.hipClusterId = data.hipClusterId;
		if (data.hipTypeId !== undefined) updateData.hipTypeId = data.hipTypeId;
		if (data.startDate !== undefined) updateData.startDate = data.startDate;
		if (data.endDate !== undefined) updateData.endDate = data.endDate;
		if (data.nationalSpecification !== undefined)
			updateData.nationalSpecification = data.nationalSpecification;
		if (data.description !== undefined)
			updateData.description = data.description;
		if (data.chainsExplanation !== undefined)
			updateData.chainsExplanation = data.chainsExplanation;
		if (data.magnitude !== undefined) updateData.magnitude = data.magnitude;
		if (data.recordOriginator !== undefined)
			updateData.recordOriginator = data.recordOriginator;
		if (data.dataSource !== undefined) updateData.dataSource = data.dataSource;
		if (data.hazardousEventStatus !== undefined)
			updateData.hazardousEventStatus = data.hazardousEventStatus;
		if (data.approvalStatus !== undefined)
			updateData.approvalStatus = data.approvalStatus;
		if (data.parentId !== undefined) updateData.parentId = data.parentId;

		const rows = await this.db
			.update(hazardousEventTable)
			.set(updateData)
			.where(
				and(
					eq(hazardousEventTable.id, id),
					eq(hazardousEventTable.countryAccountsId, countryAccountsId),
				),
			)
			.returning()
			.execute();

		if (!rows.length) return null;
		return this.mapToHazardousEvent(rows[0]);
	}

	async deleteById(
		id: string,
		countryAccountsId: string,
	): Promise<HazardousEvent | null> {
		const rows = await this.db
			.delete(hazardousEventTable)
			.where(
				and(
					eq(hazardousEventTable.id, id),
					eq(hazardousEventTable.countryAccountsId, countryAccountsId),
				),
			)
			.returning()
			.execute();

		if (!rows.length) return null;
		return this.mapToHazardousEvent(rows[0]);
	}

	async findByCountryAccountsId(
		countryAccountsId: string,
	): Promise<HazardousEvent[]> {
		const rows = await this.db
			.select()
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.countryAccountsId, countryAccountsId))
			.execute();

		return rows.map((row) => this.mapToHazardousEvent(row));
	}

	private mapToHazardousEvent(row: any): HazardousEvent {
		return {
			id: row.id,
			countryAccountsId: row.countryAccountsId,
			hipHazardId: row.hipHazardId,
			hipClusterId: row.hipClusterId,
			hipTypeId: row.hipTypeId,
			startDate: row.startDate,
			endDate: row.endDate,
			nationalSpecification: row.nationalSpecification,
			description: row.description,
			chainsExplanation: row.chainsExplanation,
			magnitude: row.magnitude,
			recordOriginator: row.recordOriginator,
			dataSource: row.dataSource,
			hazardousEventStatus: row.hazardousEventStatus,
			approvalStatus: row.approvalStatus,
			parentId: row.parentId,
			createdByUserId: row.createdByUserId,
			updatedByUserId: row.updatedByUserId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}
}
