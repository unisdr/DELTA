import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import type {
	DisasterEvent,
	DisasterEventAssessmentInput,
	DisasterEventAttachmentInput,
	DisasterEventDeclarationInput,
	DisasterEventGeographyInput,
	DisasterEventResponseInput,
	DisasterEventWriteModel,
	DisasterCausalityInput,
	DisasterHazardousCausalityInput,
} from "~/modules/disaster-event/domain/entities/disaster-event";
import type {
	DisasterEventRepositoryPort,
	ListDisasterEventsQuery,
	ListDisasterEventsResult,
} from "~/modules/disaster-event/domain/repositories/disaster-event-repository";
import type { Dr } from "~/modules/disaster-event/infrastructure/db/client.server";
import {
	disasterEventAssessmentTable,
	disasterEventAttachmentTable,
	disasterEventDeclarationTable,
	disasterEventGeographyTable,
	disasterEventResponseTable,
	disasterEventTable,
	eventCausalityTable,
} from "~/drizzle/schema";

function toDateOrNull(value: Date | string | null | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Date) return value;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateString(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (typeof value === "string") return value;
	return value.toISOString().slice(0, 10);
}

function parseNumber(value: unknown, fallback = 0): number {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

export class DrizzleDisasterEventRepository implements DisasterEventRepositoryPort {
	constructor(private readonly db: Dr) {}

	private async replaceChildren(
		tx: Parameters<Dr["transaction"]>[0] extends (arg: infer T) => any
			? T
			: never,
		disasterEventId: string,
		data: Partial<DisasterEventWriteModel>,
	) {
		if (data.declarations) {
			await tx
				.delete(disasterEventDeclarationTable)
				.where(
					eq(disasterEventDeclarationTable.disasterEventId, disasterEventId),
				);

			const rows = data.declarations
				.filter((item) => item.description || item.declarationDate)
				.map((item: DisasterEventDeclarationInput) => ({
					disasterEventId,
					declarationDate: item.declarationDate,
					description: item.description,
				}));

			if (rows.length > 0) {
				await tx.insert(disasterEventDeclarationTable).values(rows);
			}
		}

		if (data.responses) {
			await tx
				.delete(disasterEventResponseTable)
				.where(eq(disasterEventResponseTable.disasterEventId, disasterEventId));

			const rows = data.responses
				.filter(
					(item) =>
						item.description || item.responseDate || item.responseTypeId,
				)
				.map((item: DisasterEventResponseInput) => ({
					disasterEventId,
					responseTypeId: item.responseTypeId,
					responseDate: item.responseDate,
					description: item.description,
				}));

			if (rows.length > 0) {
				await tx.insert(disasterEventResponseTable).values(rows);
			}
		}

		if (data.assessments) {
			await tx
				.delete(disasterEventAssessmentTable)
				.where(
					eq(disasterEventAssessmentTable.disasterEventId, disasterEventId),
				);

			const rows = data.assessments
				.filter(
					(item) =>
						item.description || item.assessmentDate || item.assessmentTypeId,
				)
				.map((item: DisasterEventAssessmentInput) => ({
					disasterEventId,
					assessmentTypeId: item.assessmentTypeId,
					assessmentDate: item.assessmentDate,
					description: item.description,
				}));

			if (rows.length > 0) {
				await tx.insert(disasterEventAssessmentTable).values(rows);
			}
		}

		if (data.attachments) {
			await tx
				.delete(disasterEventAttachmentTable)
				.where(
					eq(disasterEventAttachmentTable.disasterEventId, disasterEventId),
				);

			const rows = data.attachments
				.filter((item) => item.title || item.fileKey || item.fileName)
				.map((item: DisasterEventAttachmentInput) => ({
					disasterEventId,
					title: item.title || "",
					fileKey: item.fileKey || "",
					fileName: item.fileName || "",
					fileType: item.fileType || "",
					fileSize: parseNumber(item.fileSize),
				}));

			if (rows.length > 0) {
				await tx.insert(disasterEventAttachmentTable).values(rows);
			}
		}

		if ("geography" in data) {
			await tx
				.delete(disasterEventGeographyTable)
				.where(
					eq(disasterEventGeographyTable.disasterEventId, disasterEventId),
				);

			if (data.geography) {
				const geography = data.geography as DisasterEventGeographyInput;
				if (geography.geomGeoJson) {
					await tx.execute(sql`
						INSERT INTO disaster_event_geography (disaster_event_id, division_id, source, geom)
						VALUES (
							${disasterEventId}::uuid,
							${geography.divisionId}::uuid,
							${geography.source},
							ST_SetSRID(ST_GeomFromGeoJSON(${geography.geomGeoJson}), 4326)
						)
					`);
				} else {
					await tx.insert(disasterEventGeographyTable).values({
						disasterEventId,
						divisionId: geography.divisionId,
						source: geography.source,
						geom: null,
					});
				}
			}
		}

		if (data.causedByDisasters) {
			await tx
				.delete(eventCausalityTable)
				.where(
					or(
						and(
							eq(eventCausalityTable.causeEntityType, "DE"),
							eq(eventCausalityTable.effectEntityType, "DE"),
							eq(eventCausalityTable.effectDisasterEventId, disasterEventId),
						),
						and(
							eq(eventCausalityTable.causeEntityType, "DE"),
							eq(eventCausalityTable.effectEntityType, "DE"),
							eq(eventCausalityTable.causeDisasterEventId, disasterEventId),
						),
					),
				);

			const rows = data.causedByDisasters
				.map((item: DisasterCausalityInput) => {
					if (item.direction === "TRIGGERED" && item.effectDisasterId) {
						return {
							causeEntityType: "DE" as const,
							causeDisasterEventId: disasterEventId,
							effectEntityType: "DE" as const,
							effectDisasterEventId: item.effectDisasterId,
						};
					}

					if (item.direction === "TRIGGERING" && item.causeDisasterId) {
						return {
							causeEntityType: "DE" as const,
							causeDisasterEventId: item.causeDisasterId,
							effectEntityType: "DE" as const,
							effectDisasterEventId: disasterEventId,
						};
					}

					if (item.causeDisasterId && item.effectDisasterId) {
						return {
							causeEntityType: "DE" as const,
							causeDisasterEventId: item.causeDisasterId,
							effectEntityType: "DE" as const,
							effectDisasterEventId: item.effectDisasterId,
						};
					}

					return null;
				})
				.filter(
					(
						row,
					): row is {
						causeEntityType: "DE";
						causeDisasterEventId: string;
						effectEntityType: "DE";
						effectDisasterEventId: string;
					} => !!row,
				);

			if (rows.length > 0) {
				await tx.insert(eventCausalityTable).values(rows);
			}
		}

		if (data.hazardousCausalities) {
			await tx
				.delete(eventCausalityTable)
				.where(
					or(
						and(
							eq(eventCausalityTable.causeEntityType, "HE"),
							eq(eventCausalityTable.effectEntityType, "DE"),
							eq(eventCausalityTable.effectDisasterEventId, disasterEventId),
						),
						and(
							eq(eventCausalityTable.causeEntityType, "DE"),
							eq(eventCausalityTable.effectEntityType, "HE"),
							eq(eventCausalityTable.causeDisasterEventId, disasterEventId),
						),
					),
				);

			const rows = data.hazardousCausalities
				.filter((item) => item.hazardousEventId)
				.map((item: DisasterHazardousCausalityInput) => {
					if (item.causeType === "HE_CAUSE_DE") {
						return {
							causeEntityType: "HE" as const,
							causeHazardousEventId: item.hazardousEventId,
							effectEntityType: "DE" as const,
							effectDisasterEventId: disasterEventId,
						};
					}

					return {
						causeEntityType: "DE" as const,
						causeDisasterEventId: disasterEventId,
						effectEntityType: "HE" as const,
						effectHazardousEventId: item.hazardousEventId,
					};
				});

			if (rows.length > 0) {
				await tx.insert(eventCausalityTable).values(rows);
			}
		}
	}

	private async findChildren(
		id: string,
	): Promise<
		Pick<
			DisasterEvent,
			| "declarations"
			| "responses"
			| "assessments"
			| "attachments"
			| "geography"
			| "causedByDisasters"
			| "hazardousCausalities"
		>
	> {
		const [
			declarations,
			responses,
			assessments,
			attachments,
			deCausality,
			heCausality,
		] = await Promise.all([
			this.db.query.disasterEventDeclarationTable.findMany({
				where: eq(disasterEventDeclarationTable.disasterEventId, id),
			}),
			this.db.query.disasterEventResponseTable.findMany({
				where: eq(disasterEventResponseTable.disasterEventId, id),
			}),
			this.db.query.disasterEventAssessmentTable.findMany({
				where: eq(disasterEventAssessmentTable.disasterEventId, id),
			}),
			this.db.query.disasterEventAttachmentTable.findMany({
				where: eq(disasterEventAttachmentTable.disasterEventId, id),
			}),
			this.db.query.eventCausalityTable.findMany({
				where: or(
					and(
						eq(eventCausalityTable.causeEntityType, "DE"),
						eq(eventCausalityTable.effectEntityType, "DE"),
						eq(eventCausalityTable.effectDisasterEventId, id),
					),
					and(
						eq(eventCausalityTable.causeEntityType, "DE"),
						eq(eventCausalityTable.effectEntityType, "DE"),
						eq(eventCausalityTable.causeDisasterEventId, id),
					),
				),
			}),
			this.db.query.eventCausalityTable.findMany({
				where: or(
					and(
						eq(eventCausalityTable.causeEntityType, "HE"),
						eq(eventCausalityTable.effectEntityType, "DE"),
						eq(eventCausalityTable.effectDisasterEventId, id),
					),
					and(
						eq(eventCausalityTable.causeEntityType, "DE"),
						eq(eventCausalityTable.effectEntityType, "HE"),
						eq(eventCausalityTable.causeDisasterEventId, id),
					),
				),
			}),
		]);

		const geographyResult = await this.db.execute(sql`
			SELECT source, division_id, ST_AsGeoJSON(geom)::text AS geom_geojson
			FROM disaster_event_geography
			WHERE disaster_event_id = ${id}::uuid
			LIMIT 1
		`);
		const geoRow = geographyResult.rows?.[0] as
			| {
					source?: string;
					division_id?: string | null;
					geom_geojson?: string | null;
			  }
			| undefined;

		return {
			declarations: declarations.map((row) => ({
				declarationDate: toDateString(row.declarationDate),
				description: row.description,
			})),
			responses: responses.map((row) => ({
				responseTypeId: row.responseTypeId,
				responseDate: toDateString(row.responseDate),
				description: row.description,
			})),
			assessments: assessments.map((row) => ({
				assessmentTypeId: row.assessmentTypeId,
				assessmentDate: toDateString(row.assessmentDate),
				description: row.description,
			})),
			attachments: attachments.map((row) => ({
				title: row.title,
				fileKey: row.fileKey,
				fileName: row.fileName,
				fileType: row.fileType,
				fileSize: Number(row.fileSize || 0),
			})),
			geography: geoRow
				? {
						source:
							geoRow.source === "derived_from_division"
								? "derived_from_division"
								: "manual",
						divisionId: geoRow.division_id || null,
						geomGeoJson: geoRow.geom_geojson || null,
					}
				: null,
			causedByDisasters: deCausality
				.map((row) => {
					if (row.effectDisasterEventId === id && row.causeDisasterEventId) {
						return {
							causeDisasterId: row.causeDisasterEventId,
							effectDisasterId: row.effectDisasterEventId,
							direction: "TRIGGERING" as const,
						};
					}

					if (row.causeDisasterEventId === id && row.effectDisasterEventId) {
						return {
							causeDisasterId: "",
							effectDisasterId: row.effectDisasterEventId,
							direction: "TRIGGERED" as const,
						};
					}

					return null;
				})
				.filter(
					(
						row,
					): row is {
						causeDisasterId: string;
						effectDisasterId: string;
						direction: "TRIGGERING" | "TRIGGERED";
					} => !!row,
				),
			hazardousCausalities: heCausality
				.map((row) => {
					if (row.causeEntityType === "HE") {
						return {
							hazardousEventId: row.causeHazardousEventId!,
							causeType: "HE_CAUSE_DE" as const,
						};
					}

					return {
						hazardousEventId: row.effectHazardousEventId!,
						causeType: "DE_CAUSE_HE" as const,
					};
				})
				.filter((row) => !!row.hazardousEventId),
		};
	}

	async create(data: DisasterEventWriteModel): Promise<DisasterEvent | null> {
		let id: string | null = null;
		await this.db.transaction(async (tx) => {
			const created = await tx
				.insert(disasterEventTable)
				.values({
					countryAccountsId: data.countryAccountsId,
					approvalStatus: data.approvalStatus || "draft",
					hipHazardId: data.hipHazardId ?? null,
					hipClusterId: data.hipClusterId ?? null,
					hipTypeId: data.hipTypeId ?? null,
					nationalDisasterId: data.nationalDisasterId,
					nameNational: data.nameNational,
					glide: data.glide || "",
					nameGlobalOrRegional: data.nameGlobalOrRegional || "",
					startDate: data.startDate || null,
					endDate: data.endDate || null,
					recordingInstitution: data.recordingInstitution,
				})
				.returning({ id: disasterEventTable.id });

			id = created[0]?.id || null;
			if (!id) {
				return;
			}

			await this.replaceChildren(tx as any, id, data);
		});

		if (!id) return null;
		return this.findById(id, data.countryAccountsId);
	}

	async findById(
		id: string,
		countryAccountsId: string,
	): Promise<DisasterEvent | null> {
		const row = await this.db.query.disasterEventTable.findFirst({
			where: and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, countryAccountsId),
			),
			columns: {
				id: true,
				countryAccountsId: true,
				approvalStatus: true,
				hipHazardId: true,
				hipClusterId: true,
				hipTypeId: true,
				nationalDisasterId: true,
				nameNational: true,
				glide: true,
				nameGlobalOrRegional: true,
				startDate: true,
				endDate: true,
				recordingInstitution: true,
			},
		});
		if (!row) return null;

		const children = await this.findChildren(row.id);

		return {
			id: row.id,
			countryAccountsId: row.countryAccountsId || "",
			approvalStatus: row.approvalStatus,
			hipHazardId: row.hipHazardId,
			hipClusterId: row.hipClusterId,
			hipTypeId: row.hipTypeId,
			nationalDisasterId: row.nationalDisasterId,
			nameNational: row.nameNational,
			glide: row.glide,
			nameGlobalOrRegional: row.nameGlobalOrRegional,
			startDate: toDateOrNull(row.startDate),
			endDate: toDateOrNull(row.endDate),
			recordingInstitution: row.recordingInstitution,
			createdAt: null,
			updatedAt: null,
			...children,
		};
	}

	async updateById(
		id: string,
		countryAccountsId: string,
		data: Partial<DisasterEventWriteModel>,
	): Promise<DisasterEvent | null> {
		await this.db.transaction(async (tx) => {
			const setData: Record<string, unknown> = {};
			if ("approvalStatus" in data)
				setData.approvalStatus = data.approvalStatus;
			if ("hipHazardId" in data) setData.hipHazardId = data.hipHazardId ?? null;
			if ("hipClusterId" in data)
				setData.hipClusterId = data.hipClusterId ?? null;
			if ("hipTypeId" in data) setData.hipTypeId = data.hipTypeId ?? null;
			if ("nationalDisasterId" in data)
				setData.nationalDisasterId = data.nationalDisasterId;
			if ("nameNational" in data) setData.nameNational = data.nameNational;
			if ("glide" in data) setData.glide = data.glide ?? "";
			if ("nameGlobalOrRegional" in data)
				setData.nameGlobalOrRegional = data.nameGlobalOrRegional ?? "";
			if ("startDate" in data) setData.startDate = data.startDate || null;
			if ("endDate" in data) setData.endDate = data.endDate || null;
			if ("recordingInstitution" in data)
				setData.recordingInstitution = data.recordingInstitution;

			await tx
				.update(disasterEventTable)
				.set(setData)
				.where(
					and(
						eq(disasterEventTable.id, id),
						eq(disasterEventTable.countryAccountsId, countryAccountsId),
					),
				);

			await this.replaceChildren(tx as any, id, data);
		});

		return this.findById(id, countryAccountsId);
	}

	async deleteById(
		id: string,
		countryAccountsId: string,
	): Promise<DisasterEvent | null> {
		const existing = await this.findById(id, countryAccountsId);
		if (!existing) return null;

		await this.db.transaction(async (tx) => {
			await tx
				.delete(eventCausalityTable)
				.where(
					or(
						eq(eventCausalityTable.causeDisasterEventId, id),
						eq(eventCausalityTable.effectDisasterEventId, id),
					),
				);
			await tx
				.delete(disasterEventDeclarationTable)
				.where(eq(disasterEventDeclarationTable.disasterEventId, id));
			await tx
				.delete(disasterEventResponseTable)
				.where(eq(disasterEventResponseTable.disasterEventId, id));
			await tx
				.delete(disasterEventAssessmentTable)
				.where(eq(disasterEventAssessmentTable.disasterEventId, id));
			await tx
				.delete(disasterEventAttachmentTable)
				.where(eq(disasterEventAttachmentTable.disasterEventId, id));
			await tx
				.delete(disasterEventGeographyTable)
				.where(eq(disasterEventGeographyTable.disasterEventId, id));
			await tx
				.delete(disasterEventTable)
				.where(
					and(
						eq(disasterEventTable.id, id),
						eq(disasterEventTable.countryAccountsId, countryAccountsId),
					),
				);
		});

		return existing;
	}

	async listByCountryAccountsId(
		args: ListDisasterEventsQuery,
	): Promise<ListDisasterEventsResult> {
		const search = (args.search || "").trim();
		const recordingInstitution = (args.recordingInstitution || "").trim();
		const page = Math.max(1, args.pagination.page || 1);
		const pageSize = Math.max(1, args.pagination.pageSize || 20);
		const offset = (page - 1) * pageSize;

		const conditions: any[] = [
			eq(disasterEventTable.countryAccountsId, args.countryAccountsId),
		];

		if (args.approvalStatus) {
			conditions.push(
				eq(disasterEventTable.approvalStatus, args.approvalStatus),
			);
		}
		if (args.hazardTypeId) {
			conditions.push(eq(disasterEventTable.hipTypeId, args.hazardTypeId));
		}
		if (args.hazardClusterId) {
			conditions.push(
				eq(disasterEventTable.hipClusterId, args.hazardClusterId),
			);
		}
		if (args.hazardId) {
			conditions.push(eq(disasterEventTable.hipHazardId, args.hazardId));
		}
		if (args.fromDate) {
			conditions.push(sql`${disasterEventTable.startDate} >= ${args.fromDate}`);
		}
		if (args.toDate) {
			conditions.push(sql`${disasterEventTable.endDate} <= ${args.toDate}`);
		}
		if (search) {
			const searchIlike = `%${search}%`;
			conditions.push(
				or(
					sql`${disasterEventTable.id}::text ILIKE ${searchIlike}`,
					ilike(disasterEventTable.nameNational, searchIlike),
					ilike(disasterEventTable.nationalDisasterId, searchIlike),
				),
			);
		}
		if (recordingInstitution) {
			conditions.push(
				ilike(
					disasterEventTable.recordingInstitution,
					`%${recordingInstitution}%`,
				),
			);
		}

		const where = and(...conditions);
		const totalItems = await this.db.$count(disasterEventTable, where);

		const rows = await this.db.query.disasterEventTable.findMany({
			where,
			offset,
			limit: pageSize,
			orderBy: [desc(disasterEventTable.id)],
			columns: {
				id: true,
				approvalStatus: true,
				nameNational: true,
				nationalDisasterId: true,
				recordingInstitution: true,
				startDate: true,
				endDate: true,
			},
		});

		return {
			items: rows.map((row) => ({
				...row,
				startDate: toDateOrNull(row.startDate),
				endDate: toDateOrNull(row.endDate),
				createdAt: null,
				updatedAt: null,
			})),
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
