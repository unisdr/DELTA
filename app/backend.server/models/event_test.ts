import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { sql } from "drizzle-orm";
import {
	hazardousEventCreate,
	hazardousEventById,
	HazardousEventFields,
	hazardousEventUpdate,
	hazardousEventDelete,
} from "./event";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eventTable } from "~/drizzle/schema/eventTable";
import {
	createTestData,
	createTestUser,
} from "~/backend.server/models/hip_test";
import { testCountryAccountsId } from "~/backend.server/models/disaster_record_test";
import { FormError } from "~/frontend/form";
import { createTestBackendContext } from "../context";

// Error codes for hazardous event validation
const SelfReferenceError = {
	code: "ErrSelfReference",
	message: "Cannot set an event as its own parent",
};

function testHazardFields(id: number) {
	let data: HazardousEventFields = {
		createdAt: new Date(),
		updatedAt: new Date(),
		parent: "",
		hipTypeId: "type1",
		hipClusterId: "cluster1",
		hipHazardId: "hazard1",
		startDate: "2024-12-30",
		endDate: "2024-12-31",
		description: `Test hazard event ${id}`,
		chainsExplanation: "Test explanation",
		magnitude: "Moderate",
		spatialFootprint: "todo",
		recordOriginator: "external-user",
		dataSource: "external",
		approvalStatus: "draft",
		createdByUserId: "00000000-0000-0000-0000-000000000001",
		updatedByUserId: "00000000-0000-0000-0000-000000000001",
		submittedByUserId: null,
		submittedAt: undefined,
		validatedByUserId: null,
		validatedAt: undefined,
		publishedByUserId: null,
		publishedAt: undefined,
		countryAccountsId: testCountryAccountsId,
	};
	return data;
}

async function hazardousEventTestData() {
	// Then create HIP test data
	await createTestData();
	// Create test user
	await createTestUser();
	// Clear hazardous event tables
	await dr.execute(sql`TRUNCATE ${eventTable}, ${hazardousEventTable} CASCADE`);
}

describe("hazardous_event", async () => {
	// Check that the constraint errors from create are properly handled
	it("create contraint error", async () => {
		let ctx = createTestBackendContext();
		let data = testHazardFields(1);
		data.hipHazardId = "xxx";
		let res = await hazardousEventCreate(ctx, dr, data);
		assert(!res.ok);
		let errs = res.errors.fields?.hipHazardId;
		assert.equal(errs?.length, 1);
		let err = errs[0] as FormError;
		assert(err.code, "constraint");
		assert(err.data, "reference");
	});

	// Check that basic update works.
	it("update success", async () => {
		await hazardousEventTestData();
		let ctx = createTestBackendContext();
		let data = testHazardFields(1);
		let id: string;
		{
			let res = await hazardousEventCreate(ctx, dr, data);
			assert(res.ok);
			id = res.id;
		}
		{
			data.endDate = "2025-01-01";
			let res = await hazardousEventUpdate(ctx, dr, id, data);
			assert(res.ok);
			// let got = await hazardousEventById(id,countryAccountsId1 )
			let got = await hazardousEventById(ctx, id);
			assert(got);
			assert(got.endDate! == data.endDate);
		}
	});

	// Check that the constraint errors from update are properly handled
	it("update constraint error", async () => {
		let ctx = createTestBackendContext();
		let data = testHazardFields(1);
		let id: string = "";
		{
			let res = await hazardousEventCreate(ctx, dr, data);
			assert(res.ok);
			id = res.id;
		}
		{
			data.hipHazardId = "xxx";
			let res = await hazardousEventUpdate(ctx, dr, id, data);
			assert(!res.ok);
			let errs = res.errors.fields?.hipHazardId;
			assert.equal(errs?.length, 1);
			let err = errs[0] as FormError;
			assert(err.code, "constraint");
			assert(err.data, "reference");
		}
	});

	// Check that update that creates a relation cycle is not allowed.
	it("update link cycle", async () => {
		await hazardousEventTestData();
		let ctx = createTestBackendContext();

		let data = testHazardFields(1);
		let id: string;
		{
			let res = await hazardousEventCreate(ctx, dr, data);
			assert(res.ok);
			id = res.id;
		}
		{
			// Setting an event as its own parent should fail with ErrSelfReference
			data.parent = id;
			let res = await hazardousEventUpdate(ctx, dr, id, data);

			// The update should fail
			assert(!res.ok, "Expected update to fail when creating a self-reference");

			// Check for the correct error code
			let err = res.errors?.fields?.["parent"]?.[0] as FormError;
			assert(
				err?.code === SelfReferenceError.code,
				`Expected error code ${SelfReferenceError.code} but got ${err?.code}`,
			);

			// Verify the event still exists and wasn't modified
			let got = await hazardousEventById(ctx, id);
			assert(got);
		}
	});

	// Check that partial update works
	it("partial update", async () => {
		await hazardousEventTestData();
		let ctx = createTestBackendContext();

		let data = testHazardFields(1);

		let event1: string;
		{
			let res = await hazardousEventCreate(ctx, dr, data);
			assert(res.ok);
			event1 = res.id;
		}

		let event2: string;
		{
			let data = testHazardFields(2);
			data.parent = event1;
			let res = await hazardousEventCreate(ctx, dr, data);
			assert(res.ok);
			event2 = res.id;
		}

		{
			let update: Partial<HazardousEventFields> = {};
			update.description = "updated";
			update.countryAccountsId = testCountryAccountsId;
			let res = await hazardousEventUpdate(ctx, dr, event2, update);
			assert(res.ok);
		}

		let got = await hazardousEventById(ctx, event2);
		assert.equal(got?.description, "updated", "Description should be updated");
		assert(got?.parent!!, "Expecting parent");
		assert.equal(got?.parent.id, event1, "Parent ID should match event1");
	});

	// Test tenant isolation - verify that records are properly isolated between tenants
	it("tenant isolation", async () => {
		await hazardousEventTestData();
		let ctx = createTestBackendContext();

		// Create an event for tenant 1
		const tenant1Data = testHazardFields(1);
		tenant1Data.description = "Tenant 1 Event";
		tenant1Data.countryAccountsId = "00000000-0000-0000-0000-000000000001";
		let tenant1EventId: string;
		{
			const res = await hazardousEventCreate(ctx, dr, tenant1Data);
			assert(res.ok, "Should successfully create event for tenant 1");
			tenant1EventId = res.id;
		}

		// Create an event for tenant 2
		const tenant2Data = testHazardFields(2);
		tenant2Data.description = "Tenant 2 Event";
		tenant2Data.countryAccountsId = "00000000-0000-0000-0000-000000000002";
		let tenant2EventId: string;
		{
			const res = await hazardousEventCreate(ctx, dr, tenant2Data);
			assert(res.ok, "Should successfully create event for tenant 2");
			tenant2EventId = res.id;
		}

		// Verify tenant 1 can access their own event
		{
			const event = await hazardousEventById(
				ctx,
				tenant1EventId,
				tenant1Data.countryAccountsId,
			);
			assert(event, "Tenant 1 should be able to access their own event");
			assert.equal(
				event.description,
				"Tenant 1 Event",
				"Event should have correct description",
			);
		}

		// Verify tenant 2 can access their own event
		{
			const event = await hazardousEventById(
				ctx,
				tenant2EventId,
				tenant2Data.countryAccountsId,
			);
			assert(event, "Tenant 2 should be able to access their own event");
			assert.equal(
				event.description,
				"Tenant 2 Event",
				"Event should have correct description",
			);
		}

		// Verify tenant 1 CANNOT access tenant 2's event
		{
			let event = null;
			try {
				event = await hazardousEventById(
					ctx,
					tenant2EventId,
					tenant1Data.countryAccountsId,
				);
			} catch (e) {
				// Expected - tenant 1 should not be able to access tenant 2's event
			}
			assert(!event, "Tenant 1 should NOT be able to access tenant 2's event");
		}

		// Verify tenant 2 CANNOT access tenant 1's event
		{
			let event = null;
			try {
				event = await hazardousEventById(
					ctx,
					tenant1EventId,
					tenant2Data.countryAccountsId,
				);
			} catch (e) {
				// Expected - tenant 2 should not be able to access tenant 1's event
			}
			assert(!event, "Tenant 2 should NOT be able to access tenant 1's event");
		}

		// Verify tenant 1 CAN update their own event
		{
			const updateData = {
				description: "Updated Tenant 1 Event",
				countryAccountsId: tenant1Data.countryAccountsId,
			};
			const res = await hazardousEventUpdate(
				ctx,
				dr,
				tenant1EventId,
				updateData,
			);
			assert(res.ok, "Tenant 1 should be able to update their own event");

			// Verify tenant 1's data is updated
			const event = await hazardousEventById(
				ctx,
				tenant1EventId,
				tenant1Data.countryAccountsId,
			);
			assert(event, "Tenant 1's event should still exist");
			assert.equal(
				event.description,
				"Updated Tenant 1 Event",
				"Event description should be updated",
			);
		}

		// Verify tenant 2 CAN update their own event
		{
			const updateData = {
				description: "Updated Tenant 2 Event",
				countryAccountsId: tenant2Data.countryAccountsId,
			};
			const res = await hazardousEventUpdate(
				ctx,
				dr,
				tenant2EventId,
				updateData,
			);
			assert(res.ok, "Tenant 2 should be able to update their own event");

			// Verify tenant 2's data is updated
			const event = await hazardousEventById(
				ctx,
				tenant2EventId,
				tenant2Data.countryAccountsId,
			);
			assert(event, "Tenant 2's event should still exist");
			assert.equal(
				event.description,
				"Updated Tenant 2 Event",
				"Event description should be updated",
			);
		}

		// Verify tenant 1 CANNOT update tenant 2's event
		{
			const updateData = {
				description: "Attempted update from tenant 1",
				countryAccountsId: tenant1Data.countryAccountsId,
			};
			const res = await hazardousEventUpdate(
				ctx,
				dr,
				tenant2EventId,
				updateData,
			);
			assert(!res.ok, "Tenant 1 should NOT be able to update tenant 2's event");

			// Verify tenant 2's data remains unchanged
			const event = await hazardousEventById(
				ctx,
				tenant2EventId,
				tenant2Data.countryAccountsId,
			);
			assert(event, "Tenant 2's event should still exist");
			assert.equal(
				event.description,
				"Updated Tenant 2 Event",
				"Event description should remain unchanged",
			);
		}

		// Verify tenant 2 CANNOT update tenant 1's event
		{
			const updateData = {
				description: "Attempted update from tenant 2",
				countryAccountsId: tenant2Data.countryAccountsId,
			};
			const res = await hazardousEventUpdate(
				ctx,
				dr,
				tenant1EventId,
				updateData,
			);
			assert(!res.ok, "Tenant 2 should NOT be able to update tenant 1's event");

			// Verify tenant 1's data remains unchanged
			const event = await hazardousEventById(
				ctx,
				tenant1EventId,
				tenant1Data.countryAccountsId,
			);
			assert(event, "Tenant 1's event should still exist");
			assert.equal(
				event.description,
				"Updated Tenant 1 Event",
				"Event description should remain unchanged",
			);
		}

		// Create a third event for tenant 1 to test deletion
		let tenant1EventToDeleteId: string;
		{
			const deleteTestData = testHazardFields(3);
			deleteTestData.description = "Tenant 1 Event To Delete";
			deleteTestData.countryAccountsId = tenant1Data.countryAccountsId;
			const res = await hazardousEventCreate(ctx, dr, deleteTestData);
			assert(res.ok, "Should successfully create event for tenant 1 to delete");
			tenant1EventToDeleteId = res.id;

			// Verify it exists
			const event = await hazardousEventById(
				ctx,
				tenant1EventToDeleteId,
				tenant1Data.countryAccountsId,
			);
			assert(event, "Tenant 1's event to delete should exist");
		}

		// Create a fourth event for tenant 2 to test cross-tenant deletion attempts
		let tenant2EventToDeleteId: string;
		{
			const deleteTestData = testHazardFields(4);
			deleteTestData.description = "Tenant 2 Event To Delete";
			deleteTestData.countryAccountsId = tenant2Data.countryAccountsId;
			const res = await hazardousEventCreate(ctx, dr, deleteTestData);
			assert(res.ok, "Should successfully create event for tenant 2 to delete");
			tenant2EventToDeleteId = res.id;

			// Verify it exists
			const event = await hazardousEventById(
				ctx,
				tenant2EventToDeleteId,
				tenant2Data.countryAccountsId,
			);
			assert(event, "Tenant 2's event to delete should exist");
		}

		// Verify tenant 2 CANNOT delete tenant 1's event
		{
			// Attempt to delete tenant 1's event using tenant 2's context
			const res = await hazardousEventDelete(
				ctx,
				tenant1EventToDeleteId,
				tenant2Data.countryAccountsId,
			);
			assert(!res.ok, "Tenant 2 should NOT be able to delete tenant 1's event");
			assert.equal(
				res.error,
				"Record not found or access denied",
				"Should get access denied error",
			);

			// Verify tenant 1's event still exists
			const event = await hazardousEventById(
				ctx,
				tenant1EventToDeleteId,
				tenant1Data.countryAccountsId,
			);
			assert(
				event,
				"Tenant 1's event should still exist after tenant 2's deletion attempt",
			);
		}

		// Verify tenant 1 CANNOT delete tenant 2's event
		{
			// Attempt to delete tenant 2's event using tenant 1's context
			const res = await hazardousEventDelete(
				ctx,
				tenant2EventToDeleteId,
				tenant1Data.countryAccountsId,
			);
			assert(!res.ok, "Tenant 1 should NOT be able to delete tenant 2's event");
			assert.equal(
				res.error,
				"Record not found or access denied",
				"Should get access denied error",
			);

			// Verify tenant 2's event still exists
			const event = await hazardousEventById(
				ctx,
				tenant2EventToDeleteId,
				tenant2Data.countryAccountsId,
			);
			assert(
				event,
				"Tenant 2's event should still exist after tenant 1's deletion attempt",
			);
		}

		// Verify tenant 1 CAN delete their own event
		{
			// Delete tenant 1's event using tenant 1's context
			const res = await hazardousEventDelete(
				ctx,
				tenant1EventToDeleteId,
				tenant1Data.countryAccountsId,
			);
			assert(res.ok, "Tenant 1 should be able to delete their own event");

			// Verify tenant 1's event no longer exists
			let event = null;
			try {
				event = await hazardousEventById(
					ctx,
					tenant1EventToDeleteId,
					tenant1Data.countryAccountsId,
				);
			} catch (e) {
				// Expected - event should be deleted
			}
			assert(!event, "Tenant 1's event should be deleted");
		}

		// Verify tenant 2 CAN delete their own event
		{
			// Delete tenant 2's event using tenant 2's context
			const res = await hazardousEventDelete(
				ctx,
				tenant2EventToDeleteId,
				tenant2Data.countryAccountsId,
			);
			assert(res.ok, "Tenant 2 should be able to delete their own event");

			// Verify tenant 2's event no longer exists
			let event = null;
			try {
				event = await hazardousEventById(
					ctx,
					tenant2EventToDeleteId,
					tenant2Data.countryAccountsId,
				);
			} catch (e) {
				// Expected - event should be deleted
			}
			assert(!event, "Tenant 2's event should be deleted");
		}
	});
});
