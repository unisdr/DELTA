import { and, eq, inArray } from "drizzle-orm";
import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type {
	HazardousEventRepositoryPort,
	HazardousEventWriteData,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";
import type { Dr } from "~/modules/hazardous-event/infrastructure/db/client.server";
import {
	hazardousEventTable,
	type SelectHazardousEvent,
} from "~/modules/hazardous-event/infrastructure/db/schema";
import { hazardCausalityTable } from "~/drizzle/schema/hazardCausalityTable";

function isMissingHazardCausalitySchemaError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;

	const maybeError = error as {
		message?: string;
		cause?: { message?: string; code?: string };
	};
	const message = String(maybeError.message || "");
	const causeMessage = String(maybeError.cause?.message || "");
	const code = String(maybeError.cause?.code || "");

	const hasHazardCausalityReference =
		message.includes("hazard_causality") ||
		causeMessage.includes("hazard_causality") ||
		message.includes("cause_hazardous_event_id") ||
		causeMessage.includes("cause_hazardous_event_id") ||
		message.includes("effect_hazardous_event_id") ||
		causeMessage.includes("effect_hazardous_event_id");

	const isPgMissingSchemaError = code === "42P01" || code === "42703";

	return hasHazardCausalityReference || isPgMissingSchemaError;
}

function toDateOrNull(value: string | null): Date | null {
	if (!value) {
		return null;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoString(value: Date | string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	return String(value) || null;
}

export class DrizzleHazardousEventRepository implements HazardousEventRepositoryPort {
	constructor(private readonly db: Dr) {}

	async create(data: HazardousEventWriteData): Promise<HazardousEvent | null> {
		const insertData: typeof hazardousEventTable.$inferInsert = {
			...data,
			startDate: toIsoString(data.startDate),
			endDate: toIsoString(data.endDate),
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

	async findById(id: string): Promise<HazardousEvent | null> {
		const rows = await this.db
			.select()
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, id))
			.execute();

		if (!rows.length) return null;
		const causeHazardousEventIds = await this.getCauseHazardousEventIds(
			rows[0].id,
		);
		return this.mapToHazardousEvent(rows[0], causeHazardousEventIds);
	}

	async updateById(
		id: string,
		data: HazardousEventWriteData,
	): Promise<HazardousEvent | null> {
		const updateData: Record<string, unknown> = {
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
		if (data.startDate !== undefined)
			updateData.startDate = toIsoString(data.startDate);
		if (data.endDate !== undefined)
			updateData.endDate = toIsoString(data.endDate);
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

		const rows = await this.db
			.update(hazardousEventTable)
			.set(updateData)
			.where(eq(hazardousEventTable.id, id))
			.returning()
			.execute();

		if (!rows.length) return null;
		return this.mapToHazardousEvent(rows[0]);
	}

	async deleteById(id: string): Promise<HazardousEvent | null> {
		const rows = await this.db
			.delete(hazardousEventTable)
			.where(eq(hazardousEventTable.id, id))
			.returning()
			.execute();

		if (!rows.length) return null;
		return this.mapToHazardousEvent(rows[0]);
	}

	async setCauseHazardousEventIds(
		effectHazardousEventId: string,
		causeHazardousEventIds: string[],
	): Promise<void> {
		const effectRows = await this.db
			.select({
				id: hazardousEventTable.id,
				countryAccountsId: hazardousEventTable.countryAccountsId,
			})
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, effectHazardousEventId))
			.execute();

		if (!effectRows.length) {
			return;
		}

		const effectCountryAccountsId = effectRows[0].countryAccountsId;

		if (!effectCountryAccountsId) {
			return;
		}

		try {
			await this.db
				.delete(hazardCausalityTable)
				.where(
					eq(
						hazardCausalityTable.effectHazardousEventId,
						effectHazardousEventId,
					),
				)
				.execute();
		} catch (error) {
			if (isMissingHazardCausalitySchemaError(error)) {
				return;
			}
			throw error;
		}

		const normalizedCauseHazardousEventIds = [
			...new Set(
				causeHazardousEventIds
					.map((causeHazardousEventId) => causeHazardousEventId.trim())
					.filter(
						(causeHazardousEventId) =>
							causeHazardousEventId.length > 0 &&
							causeHazardousEventId !== effectHazardousEventId,
					),
			),
		];

		if (!normalizedCauseHazardousEventIds.length) {
			return;
		}

		const causeRows = await this.db
			.select({ id: hazardousEventTable.id })
			.from(hazardousEventTable)
			.where(
				and(
					inArray(hazardousEventTable.id, normalizedCauseHazardousEventIds),
					eq(hazardousEventTable.countryAccountsId, effectCountryAccountsId),
				),
			)
			.execute();

		if (!causeRows.length) {
			return;
		}

		try {
			await this.db
				.insert(hazardCausalityTable)
				.values(
					causeRows.map((causeRow) => ({
						causeHazardousEventId: causeRow.id,
						effectHazardousEventId,
					})),
				)
				.execute();
		} catch (error) {
			if (isMissingHazardCausalitySchemaError(error)) {
				return;
			}
			throw error;
		}
	}

	async getCauseHazardousEventIds(
		effectHazardousEventId: string,
	): Promise<string[]> {
		const effectRows = await this.db
			.select({
				id: hazardousEventTable.id,
				countryAccountsId: hazardousEventTable.countryAccountsId,
			})
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, effectHazardousEventId))
			.execute();

		if (!effectRows.length) {
			return [];
		}

		const effectCountryAccountsId = effectRows[0].countryAccountsId;

		if (!effectCountryAccountsId) {
			return [];
		}

		let rows: Array<{ causeHazardousEventId: string | null }> = [];
		try {
			rows = await this.db
				.select({
					causeHazardousEventId: hazardCausalityTable.causeHazardousEventId,
				})
				.from(hazardCausalityTable)
				.where(
					eq(
						hazardCausalityTable.effectHazardousEventId,
						effectHazardousEventId,
					),
				)
				.execute();
		} catch (error) {
			if (isMissingHazardCausalitySchemaError(error)) {
				return [];
			}
			throw error;
		}

		const causeHazardousEventIds = rows
			.map((row) => row.causeHazardousEventId)
			.filter((causeHazardousEventId): causeHazardousEventId is string =>
				Boolean(causeHazardousEventId),
			);

		if (!causeHazardousEventIds.length) {
			return [];
		}

		const causeRows = await this.db
			.select({ id: hazardousEventTable.id })
			.from(hazardousEventTable)
			.where(
				and(
					inArray(hazardousEventTable.id, causeHazardousEventIds),
					eq(hazardousEventTable.countryAccountsId, effectCountryAccountsId),
				),
			)
			.execute();

		if (!causeRows.length) {
			return [];
		}

		return causeRows.map((row) => row.id);
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

	private mapToHazardousEvent(
		row: SelectHazardousEvent,
		causeHazardousEventIds: string[] = [],
	): HazardousEvent {
		return {
			id: row.id,
			countryAccountsId: row.countryAccountsId || "",
			hipHazardId: row.hipHazardId,
			hipClusterId: row.hipClusterId,
			hipTypeId: row.hipTypeId,
			startDate: toDateOrNull(row.startDate),
			endDate: toDateOrNull(row.endDate),
			nationalSpecification: row.nationalSpecification,
			description: row.description,
			chainsExplanation: row.chainsExplanation,
			magnitude: row.magnitude,
			recordOriginator: row.recordOriginator,
			dataSource: row.dataSource,
			hazardousEventStatus: row.hazardousEventStatus,
			causeHazardousEventIds,
			effectHazardousEventIds: causeHazardousEventIds,
			approvalStatus: row.approvalStatus,
			createdByUserId: row.createdByUserId,
			updatedByUserId: row.updatedByUserId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}
}
