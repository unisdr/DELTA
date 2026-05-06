// Tests for human effects total data
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { create, get, setTotalDsgTable, getTotalDsgTable, setTotalPresenceTable, getTotalPresenceTable } from "./index";
import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import {
	rid1,
	countryAccountsId,
	testDisasterRecord1Id,
	defs1,
	defsCustom,
	resetTestData,
} from "./_test_utils";

const testNonExistingRecordID = "00000000-0000-0000-0000-000000000000";

describe("human_effects - total data", async () => {
	beforeEach(async () => {
		await resetTestData();
	});

	it("set and get total - dsg table", async () => {
		const tblId: HumanEffectsTable = "Injured";
		const recordId = testDisasterRecord1Id;
		const data = { injured: 2 };
		await setTotalDsgTable(dr, tblId, recordId, defs1, data);
		let res = await getTotalDsgTable(dr, tblId, recordId, defs1);
		assert.deepEqual(res, { injured: 2 });
	});

	it("set and get total - dsg table - custom", async () => {
		const tblId: HumanEffectsTable = "Injured";

		let defs = defsCustom;
		{
			let res = await create(dr, "Injured", rid1, defs, [[null, 1]], false);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [[null, 1]]);
		}

		await setTotalDsgTable(dr, tblId, rid1, defs, { injured: 2 });

		{
			let res = await getTotalDsgTable(dr, tblId, rid1, defs1);
			assert.deepEqual(res, { injured: 2 });
		}

		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [[null, 2]]);
		}
	});

	it("get returns empty when no matching total - dsg table", async () => {
		let res = await getTotalDsgTable(
			dr,
			"Injured",
			testNonExistingRecordID,
			defs1,
		);
		assert.deepEqual(res, { injured: 0 });
	});

	it("set and get total - presence table", async () => {
		const tblId: HumanEffectsTable = "Injured";
		const recordId = testDisasterRecord1Id;
		const data = { injured: 2 };
		await setTotalPresenceTable(dr, tblId, recordId, defs1, data);
		let res = await getTotalPresenceTable(dr, tblId, recordId, defs1);
		assert.deepEqual(res, { injured: 2 });
	});

	it("get returns empty when no matching total - presence table", async () => {
		let res = await getTotalPresenceTable(
			dr,
			"Injured",
			testNonExistingRecordID,
			defs1,
		);
		assert.deepEqual(res, { injured: 0 });
	});
});
