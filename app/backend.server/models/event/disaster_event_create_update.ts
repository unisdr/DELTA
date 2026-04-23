import {
	CreateResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, hasErrors } from "~/frontend/form";
import { disasterEventTable, disasterEventTableConstrains } from "~/drizzle/schema/disasterEventTable";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eventTable, EventInsert } from "~/drizzle/schema/eventTable";
import { checkConstraintError } from "../common";
import { Tx } from "~/db.server";
import { eq, and } from "drizzle-orm";
import { logAudit } from "../auditLogs";
import { getTableName } from "drizzle-orm";
import type { InsertDisasterEvent } from "~/drizzle/schema/disasterEventTable";
import type { BackendContext } from "../../context";
import { processAndSaveAttachments } from "./attachments";

export interface DisasterEventFields
	extends Omit<EventInsert, "id">, Omit<InsertDisasterEvent, "id"> {
	createdByUserId?: string;
	updatedByUserId?: string;
}

export async function disasterEventCreate(
	ctx: BackendContext,
	tx: Tx,
	fields: DisasterEventFields,
): Promise<CreateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];

	// Ensure hazardous event belongs to the same tenant if specified
	if (fields.hazardousEventId) {
		const hazardousEvent = await tx
			.select({ countryAccountsId: hazardousEventTable.countryAccountsId })
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, fields.hazardousEventId));

		if (hazardousEvent.length === 0) {
			return {
				ok: false,
				errors: {
					fields: {
						hazardousEventId: [
							ctx.t({
								code: "hazardous_event.not_found",
								msg: "Hazardous event not found",
							}),
						],
					},
					form: [],
				},
			};
		}

		if (hazardousEvent[0].countryAccountsId !== fields.countryAccountsId) {
			return {
				ok: false,
				errors: {
					fields: {
						hazardousEventId: [
							ctx.t({
								code: "hazardous_event.cannot_reference_other_tenant",
								msg: "Cannot reference hazardous events from other country instances of DELTA",
							}),
						],
					},
					form: [],
				},
			};
		}
	}

	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({})
		.returning({ id: eventTable.id });
	eventId = res[0].id;

	let values: DisasterEventFields = {
		...fields,
	};
	try {
		const [insertedDisasterEvent] = await tx
			.insert(disasterEventTable)
			.values({
				...values,
				id: eventId,
			})
			.returning();

		const createdByUserId = fields.createdByUserId;
		if (createdByUserId) {
			logAudit({
				tableName: getTableName(disasterEventTable),
				recordId: insertedDisasterEvent.id,
				action: "Create disaster event",
				newValues: JSON.stringify(insertedDisasterEvent),
				oldValues: null,
				userId: createdByUserId,
			});
		}
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstrains);
		if (res) {
			return res;
		}
		throw error;
	}

	if (res.length > 0) {
		await processAndSaveAttachments(
			disasterEventTable,
			tx,
			eventId,
			Array.isArray(fields?.attachments) ? fields.attachments : [],
			"disaster-event",
		);
	}

	return { ok: true, id: eventId };
}

export async function disasterEventUpdate(
	ctx: BackendContext,
	tx: Tx,
	id: string,
	fields: Partial<DisasterEventFields>,
): Promise<UpdateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return { ok: false, errors: errors };
	}
	fields.countryAccountsId;
	if (!fields.countryAccountsId) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: [
					ctx.t({
						code: "common.user_no_instance_assigned",
						msg: "User has no instance assigned to.",
					}),
				],
			},
		};
	}

	const [oldRecord] = await tx
		.select({ id: disasterEventTable.id })
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, fields.countryAccountsId),
			),
		);

	if (!oldRecord) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: [
					ctx.t({
						code: "disaster_event.no_permission_update",
						msg: "You don't have permission to update this disaster event",
					}),
				],
			},
		};
	}

	try {
		const [updatedDisasterEvent] = await tx
			.update(disasterEventTable)
			.set({
				...fields,
			})
			.where(
				and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, fields.countryAccountsId),
				),
			)
			.returning();

		const updatedByUserId = fields.updatedByUserId;
		if (updatedByUserId) {
			logAudit({
				tableName: getTableName(disasterEventTable),
				recordId: updatedDisasterEvent.id,
				action: "Update disaster event",
				newValues: updatedDisasterEvent,
				oldValues: oldRecord,
				userId: updatedByUserId,
			});
		}

		await processAndSaveAttachments(
			disasterEventTable,
			tx,
			id,
			Array.isArray(fields?.attachments) ? fields.attachments : [],
			"disaster-event",
		);
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstrains);
		if (res) {
			return res;
		}
		throw error;
	}

	return { ok: true };
}

export async function disasterEventUpdateByIdAndCountryAccountsId(
	ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DisasterEventFields>,
): Promise<UpdateResult<DisasterEventFields>> {
	let errors: Errors<DisasterEventFields> = {};
	errors.fields = {};
	errors.form = [];
	if (hasErrors(errors)) {
		return { ok: false, errors: errors };
	}

	const event = await tx
		.select({ id: disasterEventTable.id })
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, countryAccountsId),
			),
		);

	if (event.length === 0) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: [
					ctx.t({
						code: "disaster_event.no_permission_update",
						msg: "You don't have permission to update this disaster event",
					}),
				],
			},
		};
	}

	try {
		await tx
			.update(disasterEventTable)
			.set({
				...fields,
			})
			.where(
				and(
					eq(disasterEventTable.id, id),
					eq(disasterEventTable.countryAccountsId, countryAccountsId),
				),
			);

		await processAndSaveAttachments(
			disasterEventTable,
			tx,
			id,
			Array.isArray(fields?.attachments) ? fields.attachments : [],
			"disaster-event",
		);
	} catch (error: any) {
		let res = checkConstraintError(error, disasterEventTableConstrains);
		if (res) {
			return res;
		}
		throw error;
	}

	return { ok: true };
}

