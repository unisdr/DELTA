import { and, eq, inArray, sql } from "drizzle-orm";
import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type {
	HazardousEventGeometryRecord,
	HazardousEventGeometryWriteData,
	HazardousEventRepositoryPort,
	HazardousEventWriteData,
} from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";
import type { Dr } from "~/modules/hazardous-event/infrastructure/db/client.server";
import {
	hazardousEventTable,
	type SelectHazardousEvent,
} from "~/modules/hazardous-event/infrastructure/db/schema";
import { eventCausalityTable } from "~/drizzle/schema/eventCausalityTable";
import { hazardousEventAttachmentTable } from "~/drizzle/schema/hazardousEventAttachmentTable";
import { hazardousEventGeometryTable } from "~/drizzle/schema/hazardousEventGeometryTable";

function isMissingEventCausalitySchemaError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;

	const maybeError = error as {
		message?: string;
		cause?: { message?: string; code?: string };
	};
	const message = String(maybeError.message || "");
	const causeMessage = String(maybeError.cause?.message || "");
	const code = String(maybeError.cause?.code || "");

	const hasEventCausalityReference =
		message.includes("event_causality") ||
		causeMessage.includes("event_causality") ||
		message.includes("cause_hazardous_event_id") ||
		causeMessage.includes("cause_hazardous_event_id") ||
		message.includes("effect_hazardous_event_id") ||
		causeMessage.includes("effect_hazardous_event_id");

	const isPgMissingSchemaError = code === "42P01" || code === "42703";

	return hasEventCausalityReference || isPgMissingSchemaError;
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

function toDateTimeOrNull(value: unknown): Date | null {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	const parsed = new Date(String(value));
	return Number.isNaN(parsed.getTime()) ? null : parsed;
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
		const attachmentRows = await this.db
			.select({ id: hazardousEventAttachmentTable.id })
			.from(hazardousEventAttachmentTable)
			.where(eq(hazardousEventAttachmentTable.hazardousEventId, rows[0].id))
			.execute();
		const hazardousEventAttachmentIds = attachmentRows.map(
			(attachment) => attachment.id,
		);
		return this.mapToHazardousEvent(
			rows[0],
			causeHazardousEventIds,
			hazardousEventAttachmentIds,
		);
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
				.delete(eventCausalityTable)
				.where(
					and(
						eq(eventCausalityTable.effectEntityType, "HE"),
						eq(
							eventCausalityTable.effectHazardousEventId,
							effectHazardousEventId,
						),
					),
				)
				.execute();
		} catch (error) {
			if (isMissingEventCausalitySchemaError(error)) {
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
				.insert(eventCausalityTable)
				.values(
					causeRows.map((causeRow) => ({
						causeEntityType: "HE" as const,
						causeHazardousEventId: causeRow.id,
						effectEntityType: "HE" as const,
						effectHazardousEventId,
					})),
				)
				.execute();
		} catch (error) {
			if (isMissingEventCausalitySchemaError(error)) {
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
					causeHazardousEventId: eventCausalityTable.causeHazardousEventId,
				})
				.from(eventCausalityTable)
				.where(
					and(
						eq(eventCausalityTable.causeEntityType, "HE"),
						eq(eventCausalityTable.effectEntityType, "HE"),
						eq(
							eventCausalityTable.effectHazardousEventId,
							effectHazardousEventId,
						),
					),
				)
				.execute();
		} catch (error) {
			if (isMissingEventCausalitySchemaError(error)) {
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

	async addGeometry(
		data: HazardousEventGeometryWriteData,
	): Promise<HazardousEventGeometryRecord | null> {
		const result = await this.db.execute(sql`
			INSERT INTO hazardous_event_geometry (
				hazardous_event_id,
				geometry,
				geometry_type,
				name,
				source,
				is_primary,
				valid_from,
				valid_to,
				created_by
			)
			VALUES (
				${data.hazardousEventId}::uuid,
				ST_SetSRID(ST_GeomFromGeoJSON(${data.geojson}), 4326),
				${data.geometryType},
				${data.name ?? null},
				${data.source ?? null},
				${data.isPrimary ?? false},
				${data.validFrom ?? null},
				${data.validTo ?? null},
				${data.createdBy ?? null}::uuid
			)
			RETURNING
				id,
				hazardous_event_id,
				geometry_type,
				ST_AsGeoJSON(geometry)::text AS geometry_geojson,
				name,
				source,
				is_primary,
				valid_from,
				valid_to,
				created_at,
				created_by
		`);

		const row = result.rows?.[0];
		return row ? this.mapGeometryRow(row) : null;
	}

	async listGeometriesByHazardousEventId(
		hazardousEventId: string,
	): Promise<HazardousEventGeometryRecord[]> {
		const result = await this.db.execute(sql`
			SELECT
				id,
				hazardous_event_id,
				geometry_type,
				ST_AsGeoJSON(geometry)::text AS geometry_geojson,
				name,
				source,
				is_primary,
				valid_from,
				valid_to,
				created_at,
				created_by
			FROM hazardous_event_geometry
			WHERE hazardous_event_id = ${hazardousEventId}::uuid
			ORDER BY is_primary DESC, created_at ASC
		`);

		return result.rows.map((row) => this.mapGeometryRow(row));
	}

	async getPrimaryGeometryByHazardousEventId(
		hazardousEventId: string,
	): Promise<HazardousEventGeometryRecord | null> {
		const result = await this.db.execute(sql`
			SELECT
				id,
				hazardous_event_id,
				geometry_type,
				ST_AsGeoJSON(geometry)::text AS geometry_geojson,
				name,
				source,
				is_primary,
				valid_from,
				valid_to,
				created_at,
				created_by
			FROM hazardous_event_geometry
			WHERE hazardous_event_id = ${hazardousEventId}::uuid
				AND is_primary = true
			LIMIT 1
		`);

		const row = result.rows?.[0];
		return row ? this.mapGeometryRow(row) : null;
	}

	async deleteGeometriesByHazardousEventId(
		hazardousEventId: string,
	): Promise<void> {
		await this.db
			.delete(hazardousEventGeometryTable)
			.where(eq(hazardousEventGeometryTable.hazardousEventId, hazardousEventId))
			.execute();
	}

	private mapGeometryRow(
		row: Record<string, unknown>,
	): HazardousEventGeometryRecord {
		return {
			id: String(row.id || ""),
			hazardousEventId: String(row.hazardous_event_id || ""),
			geometryType: String(
				row.geometry_type || "POINT",
			) as HazardousEventGeometryRecord["geometryType"],
			geometryGeoJson: String(row.geometry_geojson || ""),
			name: row.name ? String(row.name) : null,
			source: row.source ? String(row.source) : null,
			isPrimary: Boolean(row.is_primary),
			validFrom: toDateTimeOrNull(row.valid_from),
			validTo: toDateTimeOrNull(row.valid_to),
			createdAt: toDateTimeOrNull(row.created_at),
			createdBy: row.created_by ? String(row.created_by) : null,
		};
	}

	private mapToHazardousEvent(
		row: SelectHazardousEvent,
		causeHazardousEventIds: string[] = [],
		hazardousEventAttachmentIds: string[] = [],
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
			hazardousEventAttachmentIds,
			approvalStatus: row.approvalStatus,
			createdByUserId: row.createdByUserId,
			updatedByUserId: row.updatedByUserId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}
}
