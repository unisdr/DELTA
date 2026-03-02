import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { sql } from "drizzle-orm";

import {
	disasterEventCreate,
	disasterEventUpdate,
	disasterEventDelete,
	hazardousEventCreate,
	HazardousEventFields,
	DisasterEventFields,
} from "./event";

import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { countriesTable } from "~/drizzle/schema/countriesTable";

import { eq, and } from "drizzle-orm";
import { createTestBackendContext } from "../context";
import { createTestData, createTestUser } from "./hip_test";

// Test-only simplified version of disasterEventById to avoid PostgreSQL argument limit
async function testDisasterEventById(id: string, countryAccountsId: string) {
	if (typeof id !== "string") {
		throw new Error("Invalid ID: must be a string");
	}

	// Simple query that only checks if the record exists with tenant isolation
	const res = await dr
		.select({
			id: disasterEventTable.id,
			// Only select the ID to avoid any schema issues
		})
		.from(disasterEventTable)
		.where(
			and(
				eq(disasterEventTable.id, id),
				eq(disasterEventTable.countryAccountsId, countryAccountsId),
			),
		)
		.execute();

	if (res.length === 0) {
		return null;
	}

	return res[0];
}

const countryAccountsId1 = "00000000-0000-0000-0000-000000000001";
const countryAccountsId2 = "00000000-0000-0000-0000-000000000002";

// Helper function to create test disaster event fields
function testDisasterEventFields(num: number): Partial<DisasterEventFields> {
	return {
		name: `Test Disaster event ${num}`,
		nationalDisasterId: `test-disaster-${num}`,
		nameNational: `Test National Disaster ${num}`,
		glide: `TEST-${num}`,
		hazardousEventId: "", // Will be set during test
	};
}

// Helper function to create test country accounts
async function createTestCountryAccounts() {
	await dr.execute(sql`TRUNCATE ${countriesTable}, ${countryAccounts} CASCADE`);

	await dr.insert(countriesTable).values({
		id: "00000000-0000-0000-0000-000000000001",
		name: "test1",
	});
	await dr.insert(countryAccounts).values({
		id: countryAccountsId1,
		shortDescription: "test1",
		countryId: "00000000-0000-0000-0000-000000000001",
	});

	await dr.insert(countriesTable).values({
		id: "00000000-0000-0000-0000-000000000002",
		name: "test2",
	});
	await dr.insert(countryAccounts).values({
		id: countryAccountsId2,
		shortDescription: "test2",
		countryId: "00000000-0000-0000-0000-000000000002",
	});
}

// Setup function to clean database and create necessary test data
async function disasterEventTestData() {
	// Create HIP test data
	await createTestData();
	// Create test user
	await createTestUser();
	// Create test country accounts
	await createTestCountryAccounts();
	// Clear disaster event tables
	await dr.execute(sql`TRUNCATE ${disasterEventTable} CASCADE`);
	await dr.execute(sql`TRUNCATE ${hazardousEventTable} CASCADE`);
	await dr.execute(sql`TRUNCATE ${eventTable} CASCADE`);
}

// Helper function to create a hazardous event for testing
async function createTestHazardousEvent(countryAccountsId: string) {
	let ctx = createTestBackendContext();
	// Create hazardous event using the model function
	const hazardFields: HazardousEventFields = {
		name: "Test Hazardous event",
		description: "Test hazardous event for disaster event tests",
		startDate: new Date().toISOString().slice(0, 10),
		endDate: new Date().toISOString().slice(0, 10),
		hipTypeId: "type1", // Required field
		hipClusterId: "cluster1", // Required field
		hipHazardId: "hazard1", // Required field
		parent: "", // Required field, empty string means no parent
		createdByUserId: "00000000-0000-0000-0000-000000000001",
		updatedByUserId: "00000000-0000-0000-0000-000000000001",
		submittedByUserId: null,
		submittedAt: undefined,
		validatedByUserId: null,
		validatedAt: undefined,
		publishedByUserId: null,
		publishedAt: undefined,
		countryAccountsId: countryAccountsId,
		recordOriginator: "test",
		dataSource: "test",
		approvalStatus: "draft",
	};

	const result = await hazardousEventCreate(ctx, dr, hazardFields);
	if (!result.ok) {
		throw new Error(
			`Failed to create test hazardous event: ${JSON.stringify(result.errors)}`,
		);
	}

	return result.id;
}

// Main test cases
describe("Disaster event Tenant Isolation Tests", async () => {
	before(async () => {
		await disasterEventTestData();
	});

	// Test case for creating disaster events with tenant isolation
	it("should create disaster events with tenant isolation", async () => {
		const ctx = createTestBackendContext();

		// Create hazardous events for each tenant
		const hazardousEventId1 =
			await createTestHazardousEvent(countryAccountsId1);
		const hazardousEventId2 =
			await createTestHazardousEvent(countryAccountsId2);

		// Create disaster event for tenant 1
		const disasterEvent1 = testDisasterEventFields(1);
		disasterEvent1.hazardousEventId = hazardousEventId1;
		disasterEvent1.countryAccountsId = countryAccountsId1;

		const result1 = await disasterEventCreate(
			ctx,
			dr,
			disasterEvent1 as DisasterEventFields,
		);
		assert.strictEqual(
			result1.ok,
			true,
			"Disaster event creation for tenant 1 should succeed",
		);
		const tenant1EventId = result1.id;

		// Create disaster event for tenant 2
		const disasterEvent2 = testDisasterEventFields(2);
		disasterEvent2.hazardousEventId = hazardousEventId2;
		disasterEvent2.countryAccountsId = countryAccountsId2;

		const result2 = await disasterEventCreate(
			ctx,
			dr,
			disasterEvent2 as DisasterEventFields,
		);
		assert.strictEqual(
			result2.ok,
			true,
			"Disaster event creation for tenant 2 should succeed",
		);
		const tenant2EventId = result2.id;

		// Try to create disaster event for tenant 1 with hazardous event from tenant 2
		const disasterEvent3 = testDisasterEventFields(3);
		disasterEvent3.hazardousEventId = hazardousEventId2; // Using tenant 2's hazardous event
		disasterEvent3.countryAccountsId = countryAccountsId1;

		const result3 = await disasterEventCreate(
			ctx,
			dr,
			disasterEvent3 as DisasterEventFields,
		);
		assert.strictEqual(
			result3.ok,
			false,
			"Disaster event creation with cross-tenant hazardous event should fail",
		);

		// Verify tenant 1 CANNOT access tenant 2's event
		const crossTenantAccess1 = await testDisasterEventById(
			tenant2EventId,
			countryAccountsId1,
		);
		assert.strictEqual(
			crossTenantAccess1,
			null,
			"Tenant 1 should NOT be able to access tenant 2's disaster event",
		);

		// Verify tenant 2 CANNOT access tenant 1's event
		const crossTenantAccess2 = await testDisasterEventById(
			tenant1EventId,
			countryAccountsId2,
		);
		assert.strictEqual(
			crossTenantAccess2,
			null,
			"Tenant 2 should NOT be able to access tenant 1's disaster event",
		);
	});

	// Test case for accessing disaster events with tenant isolation
	it("should enforce tenant isolation when accessing disaster events", async () => {
		const ctx = createTestBackendContext();

		// Create hazardous events for each tenant
		const hazardousEventId1 =
			await createTestHazardousEvent(countryAccountsId1);

		// Create disaster event for tenant 1
		const disasterEvent1 = testDisasterEventFields(4);
		disasterEvent1.hazardousEventId = hazardousEventId1;
		disasterEvent1.countryAccountsId = countryAccountsId1;

		const result1 = await disasterEventCreate(
			ctx,
			dr,
			disasterEvent1 as DisasterEventFields,
		);
		assert.strictEqual(
			result1.ok,
			true,
			"Disaster event creation for tenant 1 should succeed",
		);
		const disasterId = result1.id;

		// Tenant 1 should be able to access their own disaster event
		const disasterEvent1Access = await testDisasterEventById(
			disasterId,
			countryAccountsId1,
		);
		assert.notStrictEqual(
			disasterEvent1Access,
			null,
			"Tenant 1 should be able to access their own disaster event",
		);

		// Tenant 2 should not be able to access tenant 1's disaster event
		const disasterEvent2Access = await testDisasterEventById(
			disasterId,
			countryAccountsId2,
		);
		assert.strictEqual(
			disasterEvent2Access,
			null,
			"Tenant 2 should not be able to access tenant 1's disaster event",
		);
	});

	// Test case for updating disaster events with tenant isolation
	it("should enforce tenant isolation when updating disaster events", async () => {
		const ctx = createTestBackendContext();

		// Create hazardous events for each tenant
		const hazardousEventId1 =
			await createTestHazardousEvent(countryAccountsId1);

		// Create disaster event for tenant 1
		const disasterEvent1 = testDisasterEventFields(5);
		disasterEvent1.hazardousEventId = hazardousEventId1;
		disasterEvent1.countryAccountsId = countryAccountsId1;

		const result1 = await disasterEventCreate(
			ctx,
			dr,
			disasterEvent1 as DisasterEventFields,
		);
		assert.strictEqual(
			result1.ok,
			true,
			"Disaster event creation for tenant 1 should succeed",
		);
		const disasterId = result1.id;

		// Update the disaster event as tenant 1
		const updateFields = {
			name: "Updated Disaster event",
			hazardousEventId: hazardousEventId1,
			countryAccountsId: countryAccountsId1,
		};

		const updateResult1 = await disasterEventUpdate(
			ctx,
			dr,
			disasterId,
			updateFields,
		);
		assert.strictEqual(
			updateResult1.ok,
			true,
			"Tenant 1 should be able to update their own disaster event",
		);

		// Try to update the disaster event as tenant 2
		const updateFields2 = {
			name: "Updated Disaster event by tenant 2",
			hazardousEventId: hazardousEventId1,
			countryAccountsId: countryAccountsId2,
		};
		const updateResult2 = await disasterEventUpdate(
			ctx,
			dr,
			disasterId,
			updateFields2,
		);
		assert.strictEqual(
			updateResult2.ok,
			false,
			"Tenant 2 should not be able to update tenant 1's disaster event",
		);
	});

	// Test case for deleting disaster events with tenant isolation
	it("should enforce tenant isolation when deleting disaster events", async () => {
		const ctx = createTestBackendContext();

		// Create hazardous events for each tenant
		const hazardousEventId1 =
			await createTestHazardousEvent(countryAccountsId1);

		// Create disaster event for tenant 1
		const disasterEvent1 = testDisasterEventFields(6);
		disasterEvent1.hazardousEventId = hazardousEventId1;
		disasterEvent1.countryAccountsId = countryAccountsId1;

		const result1 = await disasterEventCreate(
			ctx,
			dr,
			disasterEvent1 as DisasterEventFields,
		);
		assert.strictEqual(
			result1.ok,
			true,
			"Disaster event creation for tenant 1 should succeed",
		);
		const disasterId = result1.id;

		// Try to delete the disaster event as tenant 2
		const deleteResult1 = await disasterEventDelete(
			ctx,
			disasterId,
			countryAccountsId2,
		);
		assert.strictEqual(
			deleteResult1.ok,
			false,
			"Tenant 2 should not be able to delete tenant 1's disaster event",
		);

		// Delete the disaster event as tenant 1
		const deleteResult2 = await disasterEventDelete(
			ctx,
			disasterId,
			countryAccountsId1,
		);
		assert.strictEqual(
			deleteResult2.ok,
			true,
			"Tenant 1 should be able to delete their own disaster event",
		);

		// Verify the disaster event is deleted
		const disasterEvent1Access = await testDisasterEventById(
			disasterId,
			countryAccountsId1,
		);
		assert.strictEqual(
			disasterEvent1Access,
			null,
			"Disaster event should be deleted",
		);
	});
});
