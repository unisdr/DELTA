import { describe, expect, it } from "vitest";
import { isValidUUID } from "~/utils/id";

describe("isValidUUID", () => {
	it("Should return true if valid UUID", () => {
		expect(isValidUUID("50a3b7c1-8f2d-4d9a-9e1c-3b8f4e6a2d1c")).toBe(true);
	});
	it("Should return false if invalid UUID", () => {
		expect(isValidUUID("50a3b7c1-8f2d-4d9a-9e1c-3b8f4e6a2")).toBe(false);
	});
	it("Should return false when empty string", () => {
		expect(isValidUUID("")).toBe(false);
	});
	it("Should return false when empty single space", () => {
		expect(isValidUUID(" ")).toBe(false);
	});
});
