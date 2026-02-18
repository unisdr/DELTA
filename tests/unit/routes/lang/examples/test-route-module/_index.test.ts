import { describe, expect, it } from "vitest";
import {
	loader,
	action,
} from "~/routes/$lang+/examples+/test-route-module+/_index";

describe("loader", () => {
	it("Should return the default message", async () => {
		const mockArgs = {
			request: new Request("http://localhost:3000/"),
			params: {},
			context: {},
			unstable_pattern: "",
		};
		const data = await loader(mockArgs);
		expect(data).toEqual({ message: "Hello World Loader!" });
	});
});

describe("action", () => {
	it("Should returns message when no name is provided", async () => {
		const formData = new FormData();
		const request = new Request("http://localhost:3000", {
			method: "POST",
			body: formData,
		});

		const mockArgs = { request, params: {}, context: {}, unstable_pattern: "" };
		const response = await action(mockArgs);
		expect(response).toEqual({ message: "Hello World Action!" });
	});
	it("Should returns message with name when name is provided", async () => {
		const formData = new FormData();
		formData.append("name", "Joel");
		const request = new Request("http://localhost:3000", {
			method: "POST",
			body: formData,
		});

		const mockArgs = { request, params: {}, context: {}, unstable_pattern: "" };
		const response = await action(mockArgs);
		expect(response).toEqual({ message: "Hello Joel" });
	});
});
