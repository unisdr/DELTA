import {
	CreateResult,
	UpdateResult,
	ObjectWithImportId,
} from "~/backend.server/handlers/form/form";
import { Errors, hasErrors } from "~/frontend/form";
import { hazardousEventTable, hazardousEventTableConstraits, InsertHazardousEvent } from "~/drizzle/schema/hazardousEventTable";
import { eventTable, EventInsert } from "~/drizzle/schema/eventTable";
import { eventRelationshipTable } from "~/drizzle/schema/eventRelationshipTable";
import { checkConstraintError } from "../common";
import { Tx } from "~/db.server";
import { eq, and, getTableName } from "drizzle-orm";
import { logAudit } from "../auditLogs";
import { getRequiredAndSetToNullHipFields } from "../hip_hazard_picker";
import type { BackendContext } from "../../context";
import { processAndSaveAttachments } from "./attachments";
import { checkForCycle, createCycleErrorMessage } from "./cycles";
import { validateTemporalCausality } from "./temporal";
import { processValidationAssignmentWorkflow } from "./validation_workflow";
import { entityValidationAssignmentDeleteByEntityId } from "../entity_validation_assignment";

export interface HazardousEventFields
	extends
		Omit<EventInsert, "id">,
		Omit<InsertHazardousEvent, "id">,
		ObjectWithImportId {
	parent: string;
	createdByUserId: string;
	updatedByUserId: string;
	submittedByUserId: string | null;
	validatedByUserId: string | null;
	publishedByUserId: string | null;
}

export function validate(
	ctx: BackendContext,
	fields: Partial<HazardousEventFields>,
): Errors<HazardousEventFields> {
	let errors: Errors<HazardousEventFields> = {};
	errors.fields = {};

	let requiredHip = getRequiredAndSetToNullHipFields(fields);
	if (requiredHip) {
		if (requiredHip == "type") {
			errors.fields.hipHazardId = [
				ctx.t({
					code: "hip.hip_type_required",
					msg: "HIP type is required",
				}),
			];
		} else if (requiredHip == "cluster") {
			errors.fields.hipHazardId = [
				ctx.t({
					code: "hip.hip_cluster_required",
					msg: "HIP cluster is required",
				}),
			];
		} else {
			throw new Error("unknown field: " + requiredHip);
		}
	}

	// Validation start/end date: when updating date, all two fields must be available in the partial
	if (fields.startDate || fields.endDate) {
		if (!("startDate" in fields)) {
			errors.fields.startDate = [
				ctx.t({
					code: "common.field_required_null",
					msg: "Field is required. Otherwise set the value to null.",
				}),
			];
		}
		if (!("endDate" in fields)) {
			errors.fields.endDate = [
				ctx.t({
					code: "common.field_required_null",
					msg: "Field is required. Otherwise set the value to null.",
				}),
			];
		}
		if (
			fields.startDate &&
			fields.endDate &&
			fields.startDate > fields.endDate
		) {
			errors.fields.startDate = [
				ctx.t({
					code: "common.field_start_before_end",
					msg: "Field start must be before end.",
				}),
			];
		}
	}

	// validation recordOriginator
	if (!fields.recordOriginator || !("recordOriginator" in fields)) {
		errors.fields.recordOriginator = [
			ctx.t({
				code: "common.field_required",
				msg: "Field is required.",
			}),
		];
	}

	return errors;
}


export async function hazardousEventCreate(
	ctx: BackendContext,
	tx: Tx,
	fields: HazardousEventFields,
): Promise<CreateResult<HazardousEventFields>> {
	let errors = validate(ctx, fields);
	if (hasErrors(errors)) {
		return { ok: false, errors: errors };
	}

	let eventId = "";

	const res = await tx
		.insert(eventTable)
		.values({})
		.returning({ id: eventTable.id });
	eventId = res[0].id;

	// Ensure parent belongs to same tenant if specified
	if (fields.parent) {
		const parentEvent = await tx
			.select({ countryAccountsId: hazardousEventTable.countryAccountsId })
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.id, fields.parent));

		if (parentEvent.length === 0) {
			return {
				ok: false,
				errors: {
					fields: {
						parent: [
							ctx.t({
								code: "events.parent_event_not_found",
								msg: "Parent event not found",
							}),
						],
					},
					form: [],
				},
			};
		}

		if (parentEvent[0].countryAccountsId !== fields.countryAccountsId) {
			return {
				ok: false,
				errors: {
					fields: {
						parent: [
							ctx.t({
								code: "events.cannot_reference_other_country",
								msg: "Cannot reference events from other countries",
							}),
						],
					},
					form: [],
				},
			};
		}
	}

	let values = {
		...fields,
	};
	try {
		const [insertedHazardousEvent] = await tx
			.insert(hazardousEventTable)
			.values({
				...values,
				id: eventId,
				createdAt: new Date(),
			})
			.returning();

		const createByUserId = fields.createdByUserId;
		if (createByUserId) {
			logAudit({
				tableName: getTableName(hazardousEventTable),
				recordId: insertedHazardousEvent.id,
				action: "Create hazardous event",
				newValues: JSON.stringify(insertedHazardousEvent),
				oldValues: null,
				userId: createByUserId,
			});
		}

		if (res.length > 0) {
			await processAndSaveAttachments(
				hazardousEventTable,
				tx,
				eventId,
				Array.isArray(fields?.attachments) ? fields.attachments : [],
				"hazardous-event",
			);
		}
	} catch (error: any) {
		let res = checkConstraintError(error, hazardousEventTableConstraits);
		if (res) {
			return res;
		}
		throw error;
	}

	if (fields.parent) {
		await tx.insert(eventRelationshipTable).values({
			parentId: fields.parent,
			childId: eventId,
			type: "caused_by",
		});
	}

	// 6. Process validation assignment workflow
	// Record was sent for validation by any user to data validator
	// Condition: record status must "draft" and need to changed to "Waiting for validation"
	// and at least one validator assigned
	if (
		"tempAction" in fields &&
		fields.tempAction === "submit-validation" &&
		"updatedByUserId" in fields &&
		fields.updatedByUserId !== "" &&
		"tempValidatorUserIds" in fields &&
		fields.tempValidatorUserIds &&
		fields.tempValidatorUserIds !== ""
	) {
		// Process tempValidatorUserIds string to array
		const tempValidatorUserIdsStr = fields.tempValidatorUserIds as string;
		// Split by comma, trim whitespace, and filter out empty strings
		const idUserValidatorArray: string[] = tempValidatorUserIdsStr
			.split(",")
			.map((id) => id.trim())
			.filter((id) => id.length > 0);

		await processValidationAssignmentWorkflow(
			ctx,
			tx,
			eventId,
			idUserValidatorArray,
			fields.updatedByUserId ?? "",
			fields,
		);
	}

	return { ok: true, id: eventId };
}


export async function hazardousEventUpdate(
	ctx: BackendContext,
	tx: Tx,
	id: string,
	fields: Partial<HazardousEventFields>,
): Promise<UpdateResult<HazardousEventFields>> {
	const validationErrors = validate(ctx, fields);
	const errors: Errors<HazardousEventFields> = {
		...validationErrors,
		form: [...(validationErrors.form || [])],
	};

	if (!fields.countryAccountsId) {
		if (!errors.form) errors.form = [];
		errors.form.push(
			ctx.t({
				code: "common.user_no_country_accounts",
				msg: "User has no country accounts.",
			}),
		);
		return { ok: false, errors };
	}

	// 1. Get old record for validation and audit logging
	const [oldRecord] = await tx
		.select()
		.from(hazardousEventTable)
		.where(
			and(
				eq(hazardousEventTable.id, id),
				eq(hazardousEventTable.countryAccountsId, fields.countryAccountsId),
			),
		);

	if (!oldRecord) {
		if (!errors.form) errors.form = [];
		errors.form.push(
			ctx.t(
				{
					code: "common.record_not_found",
					msg: "Record with id {id} does not exist",
				},
				{ id },
			),
		);
		return { ok: false, errors };
	}

	// 2. Pre-transaction validation
	if (fields.parent !== undefined) {
		// 2.1 Self-reference check
		if (fields.parent === id) {
			errors.fields = errors.fields || {};
			errors.fields.parent = [
				{
					code: "ErrSelfReference",
					message: ctx.t({
						code: "events.cannot_set_self_as_parent",
						msg: "Cannot set an event as its own parent",
					}),
				},
			];
			return { ok: false, errors };
		}

		// 2.2 Cycle detection check
		if (fields.parent) {
			const cycleCheck = await checkForCycle(tx, id, fields.parent);
			if (cycleCheck.has_cycle) {
				errors.fields = errors.fields || {};
				errors.fields.parent = [
					{
						code: "ErrRelationCycle",
						message: createCycleErrorMessage(
							id,
							fields.parent,
							cycleCheck.child_description,
							cycleCheck.parent_description,
							cycleCheck.has_existing_chain,
						),
					},
				];
				return { ok: false, errors };
			}

			// 2.3 Temporal validation - ensure parent starts before or at same time as child
			const temporalCheck = await validateTemporalCausality(
				ctx,
				tx,
				id,
				fields.parent,
			);
			if (!temporalCheck.isValid) {
				errors.fields = errors.fields || {};
				errors.fields.parent = [
					{
						code: "ErrTemporalCausality",
						message:
							temporalCheck.errorMessage ||
							ctx.t({
								code: "events.invalid_temporal_relationship",
								msg: "Invalid temporal relationship between events",
							}),
					},
				];
				return { ok: false, errors };
			}
		}
	}

	// All validations passed, proceed with transaction
	return await tx.transaction(async (tx) => {
		try {
			// 3. Handle parent relationship updates if needed
			if (fields.parent !== undefined) {
				// Delete existing parent relationship if any
				await tx
					.delete(eventRelationshipTable)
					.where(
						and(
							eq(eventRelationshipTable.childId, id),
							eq(eventRelationshipTable.type, "caused_by"),
						),
					);

				// Only insert if parent is not null
				if (fields.parent) {
					await tx.insert(eventRelationshipTable).values({
						parentId: fields.parent,
						childId: id,
						type: "caused_by",
					});
				}
			}

			// 3. Update the hazardous event
			const [updatedHazardousEvent] = await tx
				.update(hazardousEventTable)
				.set({
					...fields,
					updatedAt: new Date(),
				})
				.where(eq(hazardousEventTable.id, id))
				.returning();

			const updatedByUserId = fields.updatedByUserId;
			if (updatedByUserId) {
				logAudit({
					tableName: getTableName(hazardousEventTable),
					recordId: updatedHazardousEvent.id,
					action: "Update hazardous event",
					newValues: updatedHazardousEvent,
					oldValues: oldRecord,
					userId: updatedByUserId,
				});
			}

			// 5. Process attachments
			if (Array.isArray(fields?.attachments)) {
				await processAndSaveAttachments(
					hazardousEventTable,
					tx,
					id,
					fields.attachments,
					"hazardous-event",
				);
			}

			// 6. Process validation assignment workflow
			// Record was sent for validation by any user to data validator
			// Condition: record status must "draft" and need to changed to "Waiting for validation"
			// and at least one validator assigned
			if (
				"tempAction" in fields &&
				fields.tempAction === "submit-validation" &&
				"updatedByUserId" in fields &&
				fields.updatedByUserId !== "" &&
				(fields.approvalStatus === "draft" ||
					fields.approvalStatus === "needs-revision") &&
				"tempValidatorUserIds" in fields &&
				fields.tempValidatorUserIds &&
				fields.tempValidatorUserIds !== ""
			) {
				// Process tempValidatorUserIds string to array
				const tempValidatorUserIdsStr = fields.tempValidatorUserIds as string;
				// Split by comma, trim whitespace, and filter out empty strings
				const idUserValidatorArray: string[] = tempValidatorUserIdsStr
					.split(",")
					.map((id) => id.trim())
					.filter((id) => id.length > 0);

				await processValidationAssignmentWorkflow(
					ctx,
					tx,
					id,
					idUserValidatorArray,
					fields.updatedByUserId ?? "",
					fields,
				);
			} else if (
				"tempAction" in fields &&
				fields.tempAction === "submit-draft"
			) {
				await tx
					.update(hazardousEventTable)
					.set({
						approvalStatus: "draft",
						submittedByUserId: null,
						submittedAt: null,
					})
					.where(eq(hazardousEventTable.id, id))
					.execute();

				// Remove record from validation assignments table
				await entityValidationAssignmentDeleteByEntityId(id, "hazardous_event");
			}

			return { ok: true };
		} catch (error: any) {
			const constraintError = checkConstraintError(
				error,
				hazardousEventTableConstraits,
			);
			if (constraintError) {
				return constraintError;
			}
			throw error;
		}
	});
}

export async function hazardousEventUpdateByIdAndCountryAccountsId(
	ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<HazardousEventFields>,
): Promise<UpdateResult<HazardousEventFields>> {
	const validationErrors = validate(ctx, fields);
	const errors: Errors<HazardousEventFields> = {
		...validationErrors,
		form: [...(validationErrors.form || [])],
	};

	// 1. Get old record for validation and audit logging
	const [oldRecord] = await tx
		.select()
		.from(hazardousEventTable)
		.where(
			and(
				eq(hazardousEventTable.id, id),
				eq(hazardousEventTable.countryAccountsId, countryAccountsId),
			),
		);

	if (!oldRecord) {
		if (!errors.form) errors.form = [];
		errors.form.push(
			ctx.t(
				{
					code: "common.record_not_found_or_no_access",
					msg: "Record with id {id} does not exist or you don't have access.",
				},
				{ id },
			),
		);
		return { ok: false, errors };
	}

	// 2. Pre-transaction validation
	if (fields.parent !== undefined) {
		// 2.1 Self-reference check
		if (fields.parent === id) {
			errors.fields = errors.fields || {};
			errors.fields.parent = [
				{
					code: "ErrSelfReference",
					message: ctx.t({
						code: "events.cannot_set_self_as_parent",
						msg: "Cannot set an event as its own parent",
					}),
				},
			];
			return { ok: false, errors };
		}

		// 2.2 Cycle detection check
		if (fields.parent) {
			const cycleCheck = await checkForCycle(tx, id, fields.parent);
			if (cycleCheck.has_cycle) {
				errors.fields = errors.fields || {};
				errors.fields.parent = [
					{
						code: "ErrRelationCycle",
						message: createCycleErrorMessage(
							id,
							fields.parent,
							cycleCheck.child_description,
							cycleCheck.parent_description,
							cycleCheck.has_existing_chain,
						),
					},
				];
				return { ok: false, errors };
			}

			// 2.3 Temporal validation - ensure parent starts before or at same time as child
			const temporalCheck = await validateTemporalCausality(
				ctx,
				tx,
				id,
				fields.parent,
			);
			if (!temporalCheck.isValid) {
				errors.fields = errors.fields || {};
				errors.fields.parent = [
					{
						code: "ErrTemporalCausality",
						message:
							temporalCheck.errorMessage ||
							ctx.t({
								code: "events.invalid_temporal_relationship",
								msg: "Invalid temporal relationship between events",
							}),
					},
				];
				return { ok: false, errors };
			}
		}
	}

	// All validations passed, proceed with transaction
	return await tx.transaction(async (tx) => {
		try {
			// 3. Handle parent relationship updates if needed
			if (fields.parent !== undefined) {
				// Delete existing parent relationship if any
				await tx
					.delete(eventRelationshipTable)
					.where(
						and(
							eq(eventRelationshipTable.childId, id),
							eq(eventRelationshipTable.type, "caused_by"),
						),
					);

				// Only insert if parent is not null
				if (fields.parent) {
					await tx.insert(eventRelationshipTable).values({
						parentId: fields.parent,
						childId: id,
						type: "caused_by",
					});
				}
			}

			// 3. Update the hazardous event
			await tx
				.update(hazardousEventTable)
				.set({
					...fields,
					updatedAt: new Date(),
				})
				.where(eq(hazardousEventTable.id, id))
				.returning();

			// 5. Process attachments
			if (Array.isArray(fields?.attachments)) {
				await processAndSaveAttachments(
					hazardousEventTable,
					tx,
					id,
					fields.attachments,
					"hazardous-event",
				);
			}

			return { ok: true };
		} catch (error: any) {
			const constraintError = checkConstraintError(
				error,
				hazardousEventTableConstraits,
			);
			if (constraintError) {
				return constraintError;
			}
			throw error;
		}
	});
}


