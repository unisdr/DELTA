import path from "path";
import { unlink } from "fs/promises";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type { HazardousEventGeometry } from "~/modules/hazardous-event/domain/entities/hazardous-event-geometry";
import {
	normalizeWorkflowStatus,
	type WorkflowStatus,
} from "~/modules/workflow/domain/entities/workflow-status";
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
import { workflowHistoryTable } from "~/drizzle/schema/workflowHistoryTable";
import { workflowInstanceTable } from "~/drizzle/schema/workflowInstanceTable";

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

function workflowTimestampsForStatus(status: WorkflowStatus, now: Date) {
	const setData: Partial<typeof workflowInstanceTable.$inferInsert> = {
		status,
		updatedAt: now,
	};

	if (status === "draft") {
		setData.draftedAt = now;
		setData.submittedAt = null;
		setData.approvedAt = null;
		setData.publishedAt = null;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}
	if (status === "submitted") {
		setData.submittedAt = now;
		setData.approvedAt = null;
		setData.publishedAt = null;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}
	if (status === "approved") {
		setData.approvedAt = now;
		setData.publishedAt = null;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}
	if (status === "published") {
		setData.publishedAt = now;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}
	if (status === "rejected") {
		setData.rejectedAt = now;
	}
	if (status === "revision_requested") {
		setData.revisionRequestedAt = now;
		setData.approvedAt = null;
		setData.publishedAt = null;
		setData.rejectedAt = null;
	}

	return setData;
}

export class DrizzleHazardousEventRepository implements HazardousEventRepositoryPort {
	constructor(private readonly db: Dr) {}

	private async getWorkflowStatus(entityId: string): Promise<WorkflowStatus> {
		const row = await this.db.query.workflowInstanceTable.findFirst({
			where: and(
				eq(workflowInstanceTable.entityType, "hazardous_event"),
				eq(workflowInstanceTable.entityId, entityId),
			),
			columns: { status: true },
		});
		return normalizeWorkflowStatus(row?.status);
	}

	private async getWorkflowStatusMap(
		entityIds: string[],
	): Promise<Map<string, WorkflowStatus>> {
		if (!entityIds.length) return new Map();
		const rows = await this.db.query.workflowInstanceTable.findMany({
			where: and(
				eq(workflowInstanceTable.entityType, "hazardous_event"),
				inArray(workflowInstanceTable.entityId, entityIds),
			),
			columns: {
				entityId: true,
				status: true,
			},
		});
		return new Map(
			rows.map((row) => [row.entityId, normalizeWorkflowStatus(row.status)]),
		);
	}

	async create(data: HazardousEventWriteData): Promise<HazardousEvent | null> {
		const initialWorkflowStatus = normalizeWorkflowStatus(
			(
				data as {
					workflowStatus?: string | null;
					approvalStatus?: string | null;
				}
			).workflowStatus ??
				(
					data as {
						workflowStatus?: string | null;
						approvalStatus?: string | null;
					}
				).approvalStatus,
		);
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

		const workflowRows = await this.db
			.insert(workflowInstanceTable)
			.values({
				entityId: rows[0].id,
				entityType: "hazardous_event",
				...workflowTimestampsForStatus(initialWorkflowStatus, new Date()),
			})
			.returning({ id: workflowInstanceTable.id });
		const workflowId = workflowRows[0]?.id;
		if (workflowId) {
			await this.db.insert(workflowHistoryTable).values({
				workflowInstanceId: workflowId,
				status: initialWorkflowStatus,
				actionBy: data.createdByUserId ?? null,
			});
		}

		return this.mapToHazardousEvent(rows[0], initialWorkflowStatus);
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

		const geometryResult = await this.db.execute(sql`
			SELECT id, hazardous_event_id, ST_AsGeoJSON(geometry)::text AS geometry_geojson, geometry_type, name, is_primary, valid_from, valid_to, created_at, created_by
			FROM hazardous_event_geometry
			WHERE hazardous_event_id = ${id}::uuid
		`);

		const hazardousEventGeometry = geometryResult.rows.map((row) => ({
			id: String(row.id || ""),
			hazardousEventId: String(row.hazardous_event_id || ""),
			geometryGeoJson: row.geometry_geojson
				? String(row.geometry_geojson)
				: null,
			geometryType:
				(row.geometry_type as
					| "POINT"
					| "LINESTRING"
					| "POLYGON"
					| "MULTIPOLYGON"
					| null) || null,
			name: row.name ? String(row.name) : null,
			isPrimary: Boolean(row.is_primary),
			validFrom: toDateOrNull(row.valid_from as string | null),
			validTo: toDateOrNull(row.valid_to as string | null),
			createdAt: toDateOrNull(row.created_at as string | null),
			createdBy: row.created_by ? String(row.created_by) : null,
		}));

		const workflowStatus = await this.getWorkflowStatus(rows[0].id);

		return this.mapToHazardousEvent(
			rows[0],
			workflowStatus,
			causeHazardousEventIds,
			hazardousEventAttachmentIds,
			hazardousEventGeometry,
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

		const nextStatusInput =
			(
				data as {
					workflowStatus?: string | null;
					approvalStatus?: string | null;
				}
			).workflowStatus ??
			(
				data as {
					workflowStatus?: string | null;
					approvalStatus?: string | null;
				}
			).approvalStatus;

		if (nextStatusInput !== undefined) {
			const nextStatus = normalizeWorkflowStatus(nextStatusInput);
			const current = await this.db.query.workflowInstanceTable.findFirst({
				where: and(
					eq(workflowInstanceTable.entityType, "hazardous_event"),
					eq(workflowInstanceTable.entityId, id),
				),
				columns: { id: true, status: true },
			});
			if (current) {
				const now = new Date();
				await this.db
					.update(workflowInstanceTable)
					.set(workflowTimestampsForStatus(nextStatus, now))
					.where(eq(workflowInstanceTable.id, current.id))
					.execute();
				await this.db.insert(workflowHistoryTable).values({
					workflowInstanceId: current.id,
					status: nextStatus,
					actionBy: data.updatedByUserId ?? null,
				});
			}
		}

		const rows = await this.db
			.update(hazardousEventTable)
			.set(updateData)
			.where(eq(hazardousEventTable.id, id))
			.returning()
			.execute();

		if (!rows.length) return null;
		const workflowStatus = await this.getWorkflowStatus(rows[0].id);
		return this.mapToHazardousEvent(rows[0], workflowStatus);
	}

	async deleteById(id: string): Promise<HazardousEvent | null> {
		// Best-effort cleanup for legacy DBs where FKs may still be RESTRICT/NO ACTION.
		const attachmentRows = await this.db
			.select({ fileKey: hazardousEventAttachmentTable.fileKey })
			.from(hazardousEventAttachmentTable)
			.where(eq(hazardousEventAttachmentTable.hazardousEventId, id))
			.execute();

		await this.db
			.execute(
				sql`
			UPDATE disaster_event
			SET hazardous_event_id = NULL
			WHERE hazardous_event_id = ${id}::uuid
		`,
			)
			.catch((error: unknown) => {
				if (!isMissingEventCausalitySchemaError(error)) {
					throw error;
				}
			});

		await this.db
			.execute(
				sql`
			DELETE FROM event_causality
			WHERE cause_hazardous_event_id = ${id}::uuid
			   OR effect_hazardous_event_id = ${id}::uuid
		`,
			)
			.catch((error: unknown) => {
				if (!isMissingEventCausalitySchemaError(error)) {
					throw error;
				}
			});

		await this.db
			.delete(hazardousEventGeometryTable)
			.where(eq(hazardousEventGeometryTable.hazardousEventId, id))
			.execute();

		await this.db
			.delete(hazardousEventAttachmentTable)
			.where(eq(hazardousEventAttachmentTable.hazardousEventId, id))
			.execute();

		for (const attachmentRow of attachmentRows) {
			const normalizedPath = String(attachmentRow.fileKey || "").replace(
				/^\/+/,
				"",
			);
			if (!normalizedPath) {
				continue;
			}

			const absolutePath = path.resolve(process.cwd(), normalizedPath);
			try {
				await unlink(absolutePath);
			} catch {
				// Best-effort cleanup: missing or locked files must not block entity deletion.
			}
		}

		const rows = await this.db
			.delete(hazardousEventTable)
			.where(eq(hazardousEventTable.id, id))
			.returning()
			.execute();

		if (!rows.length) return null;
		const workflowStatus = await this.getWorkflowStatus(rows[0].id);
		return this.mapToHazardousEvent(rows[0], workflowStatus);
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
			.orderBy(desc(hazardousEventTable.updatedAt))
			.execute();
		const statusMap = await this.getWorkflowStatusMap(
			rows.map((row) => row.id),
		);

		return rows.map((row) =>
			this.mapToHazardousEvent(row, statusMap.get(row.id) ?? "draft"),
		);
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
			hazardousEventId: String(
				row.hazardous_event_id || row.hazardousEventId || "",
			),
			geometryType: String(
				row.geometry_type || row.geometryType || "POINT",
			) as HazardousEventGeometryRecord["geometryType"],
			geometryGeoJson: String(
				row.geometry_geojson || row.geometryGeoJson || "",
			),
			name: row.name ? String(row.name) : null,
			isPrimary: Boolean(row.is_primary ?? row.isPrimary),
			validFrom: toDateTimeOrNull(row.valid_from ?? row.validFrom),
			validTo: toDateTimeOrNull(row.valid_to ?? row.validTo),
			createdAt: toDateTimeOrNull(row.created_at ?? row.createdAt),
			createdBy: row.created_by
				? String(row.created_by)
				: row.createdBy
					? String(row.createdBy)
					: null,
		};
	}

	private mapToHazardousEvent(
		row: SelectHazardousEvent,
		workflowStatus: WorkflowStatus = "draft",
		causeHazardousEventIds: string[] = [],
		hazardousEventAttachmentIds: string[] = [],
		hazardousEventGeometry: HazardousEventGeometry[] = [],
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
			hazardousEventGeometry,
			workflowStatus,
			approvalStatus: workflowStatus,
			createdByUserId: row.createdByUserId,
			updatedByUserId: row.updatedByUserId,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		};
	}
}
