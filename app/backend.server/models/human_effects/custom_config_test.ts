// Tests for human effects validateCustomConfigChanges
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { create, validateCustomConfigChanges } from "./index";
import { HumanEffectsCustomDef } from "~/frontend/human_effects/defs";
import { ColWidth } from "~/frontend/editabletable/base";
import { Def } from "~/frontend/editabletable/base";
import { rid1, countryAccountsId, resetTestData } from "./_test_utils";

describe("human_effects - validateCustomConfigChanges", async () => {
	beforeEach(async () => {
		await resetTestData();
	});

	it("returns null when no current config and new config is empty", async () => {
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			null,
			[],
		);
		assert.equal(result, null);
	});

	it("returns null when adding new columns", async () => {
		const currentConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [{ key: "v1", label: "V1" }],
			},
		];
		const newConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [{ key: "v1", label: "V1" }],
			},
			{
				dbName: "custom2",
				uiName: "C2",
				uiColWidth: "wide" as ColWidth,
				enum: [{ key: "v1", label: "V1" }],
			},
		];
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig,
			newConfig,
		);
		assert.equal(result, null);
	});

	it("returns null when removing column without data", async () => {
		const currentConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [{ key: "v1", label: "V1" }],
			},
		];
		const newConfig: HumanEffectsCustomDef[] = [];
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig,
			newConfig,
		);
		assert.equal(result, null);
	});

	it("returns error when removing column with data", async () => {
		let defs: Def[] = [
			{
				custom: true,
				uiName: "Custom1",
				jsName: "custom1",
				dbName: "custom1",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
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
		let res = await create(dr, "Injured", rid1, defs, [["v1", 1]], false);
		assert(res.ok);

		const currentConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
				],
			},
		];
		const newConfig: HumanEffectsCustomDef[] = [];
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig,
			newConfig,
		);
		assert.notEqual(result, null);
		assert.equal(result?.code, "cannot_delete_column_with_data");
		assert.equal(result?.column, "custom1");
	});

	it("returns null when removing value from column without data", async () => {
		const currentConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
				],
			},
		];
		const newConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [{ key: "v1", label: "V1" }],
			},
		];
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig,
			newConfig,
		);
		assert.equal(result, null);
	});

	it("returns error when removing value from column with data", async () => {
		let defs: Def[] = [
			{
				custom: true,
				uiName: "Custom1",
				jsName: "custom1",
				dbName: "custom1",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
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
		let res = await create(dr, "Injured", rid1, defs, [["v1", 1]], false);
		assert(res.ok);

		const currentConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
				],
			},
		];
		const newConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [{ key: "v2", label: "V2" }],
			},
		];
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig,
			newConfig,
		);
		assert.notEqual(result, null);
		assert.equal(result?.code, "cannot_remove_value_with_data");
		assert.equal(result?.column, "custom1");
		assert.equal(result?.value, "v1");
	});

	it("returns null when keeping all columns and values with data", async () => {
		let defs: Def[] = [
			{
				custom: true,
				uiName: "Custom1",
				jsName: "custom1",
				dbName: "custom1",
				format: "enum",
				role: "dimension",
				data: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
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
		let res = await create(dr, "Injured", rid1, defs, [["v1", 1]], false);
		assert(res.ok);

		const currentConfig = [
			{
				dbName: "custom1",
				uiName: "C1",
				uiColWidth: "wide" as ColWidth,
				enum: [
					{ key: "v1", label: "V1" },
					{ key: "v2", label: "V2" },
				],
			},
		];
		const newConfig = [
			{
				dbName: "custom1",
				uiName: "C1 Updated",
				uiColWidth: "wide" as ColWidth,
				enum: [
					{ key: "v1", label: "V1 Updated" },
					{ key: "v2", label: "V2" },
				],
			},
		];
		const result = await validateCustomConfigChanges(
			dr,
			countryAccountsId,
			currentConfig,
			newConfig,
		);
		assert.equal(result, null);
	});
});
