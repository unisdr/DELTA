// Tests for human effects category presence data
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { categoryPresenceGet, categoryPresenceSet } from "./index";
import { Def } from "~/frontend/editabletable/base";
import {
	rid1,
	countryAccountsId,
	resetCategoryPresenceData,
} from "./_test_utils";

describe("human_effects - category presence data", async () => {
	beforeEach(async () => {
		await resetCategoryPresenceData();
	});

	let defs: Def[] = [
		{
			uiName: "Injured",
			jsName: "injured",
			dbName: "injured",
			format: "number",
			role: "metric",
		},
	];

	it("no data", async () => {
		let res = await categoryPresenceGet(
			dr,
			rid1,
			countryAccountsId,
			"Injured",
			defs,
		);
		assert.deepEqual(res, { injured: null });
	});

	it("insert", async () => {
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			injured: true,
		});
		let res = await categoryPresenceGet(
			dr,
			rid1,
			countryAccountsId,
			"Injured",
			defs,
		);
		assert.deepEqual(res, { injured: true });
	});

	it("update - false", async () => {
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			injured: true,
		});
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			injured: false,
		});
		let res = await categoryPresenceGet(
			dr,
			rid1,
			countryAccountsId,
			"Injured",
			defs,
		);
		assert.deepEqual(res, { injured: false });
	});

	it("update - unset", async () => {
		await categoryPresenceSet(dr, rid1, "Injured", defs, {
			injured: true,
		});
		await categoryPresenceSet(dr, rid1, "Injured", defs, {});
		let res = await categoryPresenceGet(
			dr,
			rid1,
			countryAccountsId,
			"Injured",
			defs,
		);
		assert.deepEqual(res, {
			injured: null,
		});
	});

	let defs2: Def[] = [
		{
			uiName: "Directly Affected",
			jsName: "direct",
			dbName: "direct",
			format: "number",
			role: "metric",
		},
	];

	it("insert - table prefix", async () => {
		let defs = defs2;
		await categoryPresenceSet(dr, rid1, "Affected", defs, {
			direct: true,
		});
		let res = await categoryPresenceGet(
			dr,
			rid1,
			countryAccountsId,
			"Affected",
			defs,
		);
		assert.deepEqual(res, { direct: true });
	});

	it("update - table prefix", async () => {
		let defs = defs2;
		await categoryPresenceSet(dr, rid1, "Affected", defs, {
			direct: true,
		});
		await categoryPresenceSet(dr, rid1, "Affected", defs, {});
		let res = await categoryPresenceGet(
			dr,
			rid1,
			countryAccountsId,
			"Affected",
			defs,
		);
		assert.deepEqual(res, {
			direct: null,
		});
	});
});
