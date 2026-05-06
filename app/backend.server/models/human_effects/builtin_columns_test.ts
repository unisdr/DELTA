// Tests for human effects getUsedBuiltinColumns
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { create, getUsedBuiltinColumns } from "./index";
import { Def } from "~/frontend/editabletable/base";
import { rid1, countryAccountsId, resetTestData } from "./_test_utils";

describe("human_effects - getUsedBuiltinColumns", async () => {
	beforeEach(async () => {
		await resetTestData();
	});

	it("returns empty set when no data exists", async () => {
		const result = await getUsedBuiltinColumns(dr, countryAccountsId);
		assert.equal(result.size, 0);
	});

	it("returns columns that have data", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" },
				],
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
			},
		];
		let res = await create(dr, "Injured", rid1, defs, [["m", 1]], false);
		assert(res.ok);

		const result = await getUsedBuiltinColumns(dr, countryAccountsId);
		assert.equal(result.size, 1);
		assert.equal(result.has("sex"), true);
		assert.equal(result.has("age"), false);
	});

	it("returns multiple columns that have data", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Sex",
				jsName: "sex",
				dbName: "sex",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "m", label: "Male" },
					{ key: "f", label: "Female" },
				],
			},
			{
				shared: true,
				uiName: "Age",
				jsName: "age",
				dbName: "age",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "0-14", label: "Children" },
					{ key: "15-64", label: "Adults" },
				],
			},
			{
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
			},
		];
		let res = await create(
			dr,
			"Injured",
			rid1,
			defs,
			[["m", "0-14", 1]],
			false,
		);
		assert(res.ok);

		const result = await getUsedBuiltinColumns(dr, countryAccountsId);
		assert.equal(result.size, 2);
		assert.equal(result.has("sex"), true);
		assert.equal(result.has("age"), true);
		assert.equal(result.has("disability"), false);
	});
});
