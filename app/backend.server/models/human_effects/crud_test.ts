// Tests for human effects CRUD operations and number data
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { create, update, deleteRows, get, validate } from "./index";
import { Def } from "~/frontend/editabletable/base";
import { createTestBackendContext } from "../../context";
import {
	rid1,
	countryAccountsId,
	defs1,
	defs2,
	defsCustom,
	resetTestData,
} from "./_test_utils";

describe("human_effects - number data", async () => {
	beforeEach(async () => {
		await resetTestData();
	});

	it("create basic", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["m", 1],
					["f", 2],
				],
				false,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["f", 2],
				["m", 1],
			]);
		}
	});

	it("validate - no duplicates", async () => {
		const ctx = createTestBackendContext();
		let defs = defs1;
		let res1 = await create(
			dr,
			"Injured",
			rid1,
			defs,
			[
				["m", 1],
				["m", 2],
			],
			false,
		);
		assert(res1.ok);
		let res = await validate(ctx, dr, "Injured", rid1, countryAccountsId, defs);
		assert(!res.ok);
		assert.equal(res.rowErrors?.length, 2);
		let e0 = res.rowErrors[0];
		let e1 = res.rowErrors[1];
		//console.log("errors", res.rowErrors)
		assert.equal(e0.code, "duplicate_dimension");
		assert.equal(e1.code, "duplicate_dimension");
	});

	it("create custom", async () => {
		let defs = defsCustom;
		{
			let res = await create(dr, "Injured", rid1, defs, [["g1", 1]], false);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [["g1", 1]]);
		}
	});

	it("get field casing", async () => {
		let defs: Def[] = [
			{
				shared: true,
				uiName: "Global Poverty Line",
				jsName: "globalPovertyLine",
				dbName: "global_poverty_line",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "above", label: "Above" },
					{ key: "below", label: "Below" },
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
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["above", 1],
					["below", 2],
				],
				false,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["above", 1],
				["below", 2],
			]);
		}
	});
	it("type mismatch", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					[1, 1],
					[1, 2],
				],
				false,
			);
			console.log(res);
			assert(!res.ok);
			assert.equal(res.error!.code, "invalid_value");
		}
	});

	it("max value validation - number exceeds 1 billion", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[["m", 1000000001]],
				false,
			);
			console.log(res);
			assert(!res.ok);
			assert.equal(res.error!.code, "invalid_value");
			assert.ok(res.error!.message.includes("exceeds maximum"));
		}
	});

	it("max value validation - string number exceeds 1 billion", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[["m", "1000000001"]],
				true,
			);
			console.log(res);
			assert(!res.ok);
			assert.equal(res.error!.code, "invalid_value");
			assert.ok(res.error!.message.includes("exceeds maximum"));
		}
	});

	it("max value validation - number at 1 billion boundary", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[["m", 1000000000]],
				false,
			);
			console.log(res);
			assert(res.ok);
		}
	});

	it("max value validation - string number at 1 billion boundary", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[["m", "1000000000"]],
				true,
			);
			console.log(res);
			assert(res.ok);
		}
	});
	it("non string data (for json)", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["m", 1],
					["f", 2],
				],
				false,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["f", 2],
				["m", 1],
			]);
		}
	});
	it("string data (for csv)", async () => {
		let defs = defs1;
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["m", "1"],
					["f", "2"],
				],
				true,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["f", 2],
				["m", 1],
			]);
		}
	});
	it("string data (for csv) - unset", async () => {
		let defs = defs1;
		{
			let res = await create(dr, "Injured", rid1, defs, [["", ""]], true);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [[null, null]]);
		}
	});
	it("non string data (for json) - date", async () => {
		let defs = defs2;
		{
			let res = await create(
				dr,
				"Missing",
				rid1,
				defs,
				[
					["2025-01-29", 1],
					["2025-01-30", 2],
				],
				false,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Missing", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["2025-01-29 00:00:00", 1],
				["2025-01-30 00:00:00", 2],
			]);
		}
	});
	it("string data (for csv) - date", async () => {
		let defs = defs2;
		{
			let res = await create(
				dr,
				"Missing",
				rid1,
				defs,
				[
					["2025-01-29", "1"],
					["2025-01-30", "2"],
				],
				true,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Missing", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["2025-01-29 00:00:00", 1],
				["2025-01-30 00:00:00", 2],
			]);
		}
	});
	it("string data (for csv) - date - wrong format", async () => {
		let defs = defs2;
		{
			let res = await create(dr, "Missing", rid1, defs, [["xxxx", "1"]], true);
			console.log(res);
			assert(!res.ok);
			assert.equal(res.error!.code, "invalid_value");
		}
	});
	it("update", async () => {
		let defs = defs1;
		let ids: string[] = [];
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["m", "1"],
					["f", "2"],
				],
				true,
			);
			console.log(res);
			assert(res.ok);
			ids = res.ids;
		}
		{
			let res = await update(
				dr,
				"Injured",
				defs,
				ids,
				[
					["m", "3"],
					["f", "4"],
				],
				true,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				["f", 4],
				["m", 3],
			]);
		}
	});
	it("update custom", async () => {
		let defs = defsCustom;
		let ids: string[] = [];
		{
			let res = await create(dr, "Injured", rid1, defs, [["g1", 1]], false);
			console.log(res);
			assert(res.ok);
			ids = res.ids;
		}
		{
			let res = await update(dr, "Injured", defs, ids, [["g2", "2"]], true);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [["g2", 2]]);
		}
	});

	it("update (partial)", async () => {
		let defs = defs1;
		let ids = [];
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["m", "1"],
					["f", "2"],
				],
				true,
			);
			assert(res.ok);
			ids = res.ids;
		}
		{
			let res = await update(
				dr,
				"Injured",
				defs,
				ids,
				[
					[undefined, "3"],
					[null, "4"],
				],
				true,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [
				[null, 4],
				["m", 3],
			]);
		}
	});

	let defsCustom2: Def[] = [
		{
			uiName: "custom1",
			jsName: "custom1",
			dbName: "custom1",
			custom: true,
			format: "enum",
			role: "dimension",
			data: [
				{ key: "g1", label: "G1" },
				{ key: "g2", label: "G2" },
			],
		},
		{
			uiName: "custom2",
			jsName: "custom2",
			dbName: "custom2",
			custom: true,
			format: "enum",
			role: "dimension",
			data: [
				{ key: "g1", label: "G1" },
				{ key: "g2", label: "G2" },
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

	it("update custom - partial", async () => {
		let defs = defsCustom2;
		let ids: string[] = [];
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[["g1", "g2", 1]],
				false,
			);
			console.log(res);
			assert(res.ok);
			ids = res.ids;
		}
		{
			let res = await update(
				dr,
				"Injured",
				defs,
				ids,
				[["g2", undefined, "2"]],
				true,
			);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, [["g2", "g2", 2]]);
		}
	});

	it("delete", async () => {
		let defs = defs1;
		let ids: string[] = [];
		{
			let res = await create(
				dr,
				"Injured",
				rid1,
				defs,
				[
					["m", "1"],
					["f", "2"],
				],
				true,
			);
			console.log(res);
			assert(res.ok);
			ids = res.ids;
		}
		{
			let res = await deleteRows(dr, "Injured", ids);
			console.log(res);
			assert(res.ok);
		}
		{
			let res = await get(dr, "Injured", rid1, countryAccountsId, defs);
			console.log(res);
			assert(res.ok);
			assert.deepEqual(res.data, []);
		}
	});
});
