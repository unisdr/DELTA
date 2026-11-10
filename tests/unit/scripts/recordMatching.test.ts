import { describe, expect, it } from "vitest";
import {
	compareCausalityPairs,
	compareKeyedRecords,
	type CausalityPair,
} from "../../../scripts/db_migration_validation/recordMatching";

type MappingRow = { id: string; specificHazardId: string };

const keyOf = (r: MappingRow) => r.id;
const fieldsEqual = (a: MappingRow, b: MappingRow) =>
	a.specificHazardId === b.specificHazardId;

describe("compareKeyedRecords — mapped value integrity", () => {
	it("counts an exact id + field match as matched", () => {
		const expected: MappingRow[] = [
			{ id: "he1", specificHazardId: "sh1" },
			{ id: "he2", specificHazardId: "sh2" },
		];
		const actual: MappingRow[] = [
			{ id: "he1", specificHazardId: "sh1" },
			{ id: "he2", specificHazardId: "sh2" },
		];

		const r = compareKeyedRecords(expected, actual, { keyOf, fieldsEqual });

		expect(r).toMatchObject({ expected: 2, matched: 2, missing: 0, unexpected: 0, mismatched: 0 });
	});

	it("reports a mismatch (not matched) when the row count is unchanged but a mapped value is altered", () => {
		const expected: MappingRow[] = [
			{ id: "he1", specificHazardId: "sh1" },
			{ id: "he2", specificHazardId: "sh2" },
		];
		// Same row count, same keys, but he2 points at the wrong specific hazard.
		const actual: MappingRow[] = [
			{ id: "he1", specificHazardId: "sh1" },
			{ id: "he2", specificHazardId: "WRONG" },
		];

		const r = compareKeyedRecords(expected, actual, { keyOf, fieldsEqual });

		expect(actual.length).toBe(expected.length); // equal counts
		expect(r.matched).toBe(1); // affected record NOT counted as matched
		expect(r.mismatched).toBe(1);
		expect(r.missing).toBe(0);
	});

	it("excludes pre-existing baseline rows from in-scope and unexpected", () => {
		const expected: MappingRow[] = [{ id: "he1", specificHazardId: "sh1" }];
		const actual: MappingRow[] = [
			{ id: "he1", specificHazardId: "sh1" },
			{ id: "preexisting", specificHazardId: "x" },
		];

		const r = compareKeyedRecords(
			expected,
			actual,
			{ keyOf, fieldsEqual },
			new Set(["preexisting"]),
		);

		expect(r.inScope).toBe(1);
		expect(r.unexpected).toBe(0);
		expect(r.matched).toBe(1);
	});
});

describe("compareCausalityPairs — direction integrity", () => {
	it("counts correct-direction pairs as matched", () => {
		const eligible: CausalityPair[] = [
			{ causeId: "a", effectId: "b" },
			{ causeId: "c", effectId: "d" },
		];
		const actual: CausalityPair[] = [
			{ causeId: "a", effectId: "b" },
			{ causeId: "c", effectId: "d" },
		];

		const r = compareCausalityPairs(eligible, actual);

		expect(r).toMatchObject({ expected: 2, matched: 2, missing: 0, mismatched: 0, unexpected: 0 });
	});

	it("reports a mismatch (not matched) when a causality pair is reversed and the row count is unchanged", () => {
		const eligible: CausalityPair[] = [
			{ causeId: "a", effectId: "b" },
			{ causeId: "c", effectId: "d" },
		];
		// Same row count, but (c,d) is stored reversed as (d,c).
		const actual: CausalityPair[] = [
			{ causeId: "a", effectId: "b" },
			{ causeId: "d", effectId: "c" },
		];

		const r = compareCausalityPairs(eligible, actual);

		expect(actual.length).toBe(eligible.length); // equal counts
		expect(r.matched).toBe(1); // reversed pair NOT counted as matched
		expect(r.mismatched).toBe(1);
		expect(r.missing).toBe(0);
	});

	it("excludes pre-existing baseline pairs from in-scope and unexpected", () => {
		const eligible: CausalityPair[] = [{ causeId: "a", effectId: "b" }];
		const actual: CausalityPair[] = [
			{ causeId: "a", effectId: "b" },
			{ causeId: "pre", effectId: "existing" },
		];

		const r = compareCausalityPairs(eligible, actual, new Set(["pre->existing"]));

		expect(r.inScope).toBe(1);
		expect(r.unexpected).toBe(0);
		expect(r.matched).toBe(1);
	});
});
