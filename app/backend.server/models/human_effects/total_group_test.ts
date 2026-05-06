// Tests for human effects total group
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { dr } from "~/db.server";
import { totalGroupGet, totalGroupSet } from "./index";
import { rid1, resetCategoryPresenceData } from "./_test_utils";

describe("human_effects - total group", async () => {
	beforeEach(async () => {
		await resetCategoryPresenceData();
	});

	it("get no data", async () => {
		let res = await totalGroupGet(dr, rid1, "Deaths");
		assert.equal(res, null);
	});

	it("set and get", async () => {
		let data = ["sex"];
		await totalGroupSet(dr, rid1, "Deaths", data);
		let res = await totalGroupGet(dr, rid1, "Deaths");
		assert.deepEqual(res, data);
	});

	it("update", async () => {
		await totalGroupSet(dr, rid1, "Deaths", ["sex"]);
		await totalGroupSet(dr, rid1, "Deaths", ["sex", "age"]);
		let res = await totalGroupGet(dr, rid1, "Deaths");
		assert.deepEqual(res, ["sex", "age"]);
	});

	it("set null", async () => {
		let data = ["sex"];
		await totalGroupSet(dr, rid1, "Deaths", data);

		await totalGroupSet(dr, rid1, "Deaths", null);
		let res = await totalGroupGet(dr, rid1, "Deaths");
		assert.equal(res, null);
	});
});
