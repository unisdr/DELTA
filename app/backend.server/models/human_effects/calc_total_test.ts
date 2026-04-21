// Tests for human effects calc total for group
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { create, calcTotalForGroup } from "./index";
import { Def } from "~/frontend/editabletable/base";
import { rid1, resetTestData } from "./_test_utils";

describe("human_effects - calc total for group", async () => {
	beforeEach(async () => {
		await resetTestData();
	});

	it("calcs total for group - no custom", async () => {
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
					{ key: "<50", label: "<50" },
					{ key: ">=50", label: ">=50" },
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
		{
			let data = [
				["m", null, 1],
				["f", null, 2],
				["m", "<50", 1],
				["m", ">=50", 2],
				["f", "<50", 3],
				["f", ">=50", 4],
			];
			let res = await create(dr, "Injured", rid1, defs, data, false);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["sex"]);
			assert(res.ok);
			assert.equal(res.totals.injured, 3);
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, [
				"sex",
				"age",
			]);
			assert(res.ok);
			assert.equal(res.totals.injured, 10);
		}
	});

	it("calcs total for group - global poverty line", async () => {
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
				uiName: "Global poverty line",
				jsName: "globalPovertyLine",
				dbName: "global_poverty_line",
				uiColWidth: "thin", // 60
				format: "enum",
				role: "dimension",
				data: [
					{ key: "below", label: "Below" },
					{ key: "above", label: "Above" },
				],
			},
			{
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
			},
		];
		{
			let data = [
				["m", null, 1],
				["f", null, 2],
				["f", "above", 3],
				["m", "above", 4],
			];
			let res = await create(dr, "Missing", rid1, defs, data, false);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await calcTotalForGroup(dr, "Missing", rid1, defs, [
				"sex",
				"global_poverty_line",
			]);
			console.log(res);
			assert(res.ok);
			assert.equal(res.totals.missing, 7);
		}
	});

	it("calcs total for group - as of date", async () => {
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
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin",
			},
			{
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
			},
		];
		{
			let data = [
				["m", null, 1],
				["f", null, 2],
				["f", "2025-09-04", 3],
				["m", "2025-09-04", 4],
				[null, "2025-09-04", 5],
				[null, "2025-09-04", 6],
			];
			let res = await create(dr, "Missing", rid1, defs, data, false);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await calcTotalForGroup(dr, "Missing", rid1, defs, ["sex"]);
			assert(res.ok);
			assert.equal(res.totals.missing, 3);
		}
		{
			let res = await calcTotalForGroup(dr, "Missing", rid1, defs, ["asOf"]);
			console.log("res", res);
			assert.equal(res.ok, false);
		}
	});

	it("calcs total for group - custom cols", async () => {
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
					{ key: "<50", label: "<50" },
					{ key: ">=50", label: ">=50" },
				],
			},
			{
				custom: true,
				uiName: "My Custom",
				jsName: "custom",
				dbName: "custom",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "l1" },
					{ key: "v2", label: "l2" },
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
		{
			let data = [
				[null, null, "v1", 5],
				[null, null, "v2", 6],
				["m", null, null, 1],
				["f", null, null, 1],
				["m", null, "v1", 1],
				["f", null, "v2", 2],
				["m", "<50", "v1", 1],
				["m", ">=50", "v2", 2],
				["f", "<50", "v1", 3],
				["f", ">=50", "v2", 4],
			];
			let res = await create(dr, "Injured", rid1, defs, data, false);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["custom"]);
			assert(res.ok);
			assert.equal(res.totals.injured, 11);
		}
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs, ["sex"]);
			assert(res.ok);
			assert.equal(res.totals.injured, 2);
		}
	});

	it("calcs total for group - custom cols - changed", async () => {
		let defs1: Def[] = [
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
				custom: true,
				uiName: "My Custom",
				jsName: "custom",
				dbName: "custom",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "l1" },
					{ key: "v2", label: "l2" },
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
		{
			let data = [
				["m", null, 1],
				["f", null, 1],
			];
			let res = await create(dr, "Injured", rid1, defs1, data, false);
			console.log(res);
			assert.equal(res.ok, true);
		}
		let defs2 = [defs1[0], defs1[2]];
		{
			let res = await calcTotalForGroup(dr, "Injured", rid1, defs2, ["sex"]);
			console.log("res", res);
			assert.equal(res.ok, true);
			assert.equal(res.totals.injured, 2);
		}
	});
});
