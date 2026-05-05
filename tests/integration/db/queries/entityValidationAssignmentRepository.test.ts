import "../setup";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { dr } from "~/db.server";
import { entityValidationAssignmentDeleteByEntityId } from "~/backend.server/models/entity_validation_assignment";
import { EntityValidationAssignmentRepository } from "~/db/queries/entityValidationAssignmentRepository";
import { entityValidationAssignmentTable, userTable } from "~/drizzle/schema";

describe("EntityValidationAssignment compatibility", () => {
	it("query returns legacy and new discriminator rows for same entity", async () => {
		const entityId = crypto.randomUUID();
		const assignedToUserId = crypto.randomUUID();
		const assignedByUserId = crypto.randomUUID();

		await dr.insert(userTable).values([
			{
				id: assignedToUserId,
				email: `assigned-to-${entityId}@example.com`,
			},
			{
				id: assignedByUserId,
				email: `assigned-by-${entityId}@example.com`,
			},
		]);

		await dr.insert(entityValidationAssignmentTable).values([
			{
				entityId,
				entityType: "disaster_record",
				assignedToUserId,
				assignedByUserId,
			},
			{
				entityId,
				entityType: "disaster_records",
				assignedToUserId,
				assignedByUserId,
			},
		]);

		const rows = await EntityValidationAssignmentRepository.getByEntityIds([
			entityId,
		]);
		expect(rows).toHaveLength(2);
		expect(rows.map((r) => r.entityType).sort()).toEqual([
			"disaster_record",
			"disaster_records",
		]);
	});

	it("repository delete removes both legacy and new discriminators", async () => {
		const entityId = crypto.randomUUID();
		const assignedToUserId = crypto.randomUUID();
		const assignedByUserId = crypto.randomUUID();

		await dr.insert(userTable).values([
			{
				id: assignedToUserId,
				email: `repo-to-${entityId}@example.com`,
			},
			{
				id: assignedByUserId,
				email: `repo-by-${entityId}@example.com`,
			},
		]);

		await dr.insert(entityValidationAssignmentTable).values([
			{
				entityId,
				entityType: "disaster_record",
				assignedToUserId,
				assignedByUserId,
			},
			{
				entityId,
				entityType: "disaster_records",
				assignedToUserId,
				assignedByUserId,
			},
			{
				entityId,
				entityType: "hazardous_event",
				assignedToUserId,
				assignedByUserId,
			},
		]);

		await EntityValidationAssignmentRepository.deleteByEntityIdsAndEntityType(
			[entityId],
			"disaster_records",
		);

		const remaining = await dr
			.select({ entityType: entityValidationAssignmentTable.entityType })
			.from(entityValidationAssignmentTable)
			.where(eq(entityValidationAssignmentTable.entityId, entityId));

		expect(remaining).toHaveLength(1);
		expect(remaining[0].entityType).toBe("hazardous_event");
	});

	it("model delete removes both legacy and new discriminators", async () => {
		const entityId = crypto.randomUUID();
		const assignedToUserId = crypto.randomUUID();
		const assignedByUserId = crypto.randomUUID();

		await dr.insert(userTable).values([
			{
				id: assignedToUserId,
				email: `model-to-${entityId}@example.com`,
			},
			{
				id: assignedByUserId,
				email: `model-by-${entityId}@example.com`,
			},
		]);

		await dr.insert(entityValidationAssignmentTable).values([
			{
				entityId,
				entityType: "disaster_record",
				assignedToUserId,
				assignedByUserId,
			},
			{
				entityId,
				entityType: "disaster_records",
				assignedToUserId,
				assignedByUserId,
			},
		]);

		await entityValidationAssignmentDeleteByEntityId(
			entityId,
			"disaster_records",
		);

		const remaining = await dr
			.select({ id: entityValidationAssignmentTable.id })
			.from(entityValidationAssignmentTable)
			.where(
				and(
					eq(entityValidationAssignmentTable.entityId, entityId),
					eq(entityValidationAssignmentTable.entityType, "disaster_records"),
				),
			);

		expect(remaining).toHaveLength(0);

		const legacyRemaining = await dr
			.select({ id: entityValidationAssignmentTable.id })
			.from(entityValidationAssignmentTable)
			.where(
				and(
					eq(entityValidationAssignmentTable.entityId, entityId),
					eq(entityValidationAssignmentTable.entityType, "disaster_record"),
				),
			);

		expect(legacyRemaining).toHaveLength(0);
	});
});
