import { describe, expect, it, vi, beforeEach } from "vitest";
import { action, loader } from "~/routes/$lang+/api+/mcp";
import * as apiAuthModule from "~/backend.server/models/api_key";

vi.mock("~/backend.server/models/api_key", () => ({
	apiAuth: vi.fn(),
}));

const BASE_URL = "http://localhost:3000/en/api/mcp";

function createRequest(body: unknown, headers?: HeadersInit): Request {
	return new Request(BASE_URL, {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers: { "Content-Type": "application/json", ...headers },
	});
}

async function callAction(request: Request): Promise<Response> {
	return await action({ request, params: {}, context: {} } as any);
}

async function callLoader(request: Request): Promise<Response> {
	return await loader({ request, params: {}, context: {} } as any);
}

describe("mcp.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("action", () => {
		describe("authentication", () => {
			it("should return 401 when no API key provided", async () => {
				vi.mocked(apiAuthModule.apiAuth).mockRejectedValue(
					new Error("Unauthorized"),
				);

				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
					method: "initialize",
				});

				const response = await callAction(request);
				expect(response.status).toBe(401);

				const data = await response.json();
				expect(data.error.code).toBe(-32000);
			});

			it("should return 401 when API key has no country accounts ID", async () => {
				vi.mocked(apiAuthModule.apiAuth).mockResolvedValue({
					countryAccountsId: null,
				} as any);

				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
					method: "initialize",
				});

				const response = await callAction(request);
				expect(response.status).toBe(401);

				const data = await response.json();
				expect(data.error.message).toContain("No country accounts ID");
			});
		});

		describe("request validation", () => {
			beforeEach(() => {
				vi.mocked(apiAuthModule.apiAuth).mockResolvedValue({
					countryAccountsId: "test-id",
				} as any);
			});

			it("should return 400 for invalid JSON", async () => {
				const request = createRequest("invalid json");

				const response = await callAction(request);
				expect(response.status).toBe(400);

				const data = await response.json();
				expect(data.error.code).toBe(-32700);
				expect(data.error.message).toContain("Parse error");
			});

			it("should return error for invalid jsonrpc version", async () => {
				const request = createRequest({
					jsonrpc: "1.0",
					id: "test-id",
					method: "initialize",
				});

				const response = await callAction(request);
				const data = await response.json();

				expect(data.error.code).toBe(-32600);
				expect(data.error.message).toContain("jsonrpc version must be 2.0");
			});

			it("should return error for missing method", async () => {
				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
				});

				const response = await callAction(request);
				const data = await response.json();

				expect(data.error.code).toBe(-32600);
				expect(data.error.message).toContain("method is required");
			});
		});

		describe("method handling", () => {
			beforeEach(() => {
				vi.mocked(apiAuthModule.apiAuth).mockResolvedValue({
					countryAccountsId: "test-id",
				} as any);
			});

			it("should handle initialize method", async () => {
				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
					method: "initialize",
				});

				const response = await callAction(request);
				const data = await response.json();

				expect(data.jsonrpc).toBe("2.0");
				expect(data.id).toBe("test-id");
				expect(data.result.protocolVersion).toBe("2024-11-05");
				expect(data.result.capabilities.tools).toBeDefined();
				expect(data.result.serverInfo.name).toBe("dts-mcp");
			});

			it("should handle tools/list method", async () => {
				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
					method: "tools/list",
				});

				const response = await callAction(request);
				const data = await response.json();

				expect(data.result.tools).toBeDefined();
				expect(Array.isArray(data.result.tools)).toBe(true);
				expect(data.result.tools.length).toBeGreaterThan(0);
			});

			it("should handle shutdown method", async () => {
				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
					method: "shutdown",
				});

				const response = await callAction(request);
				const data = await response.json();

				expect(data.result).toBeNull();
			});

			it("should return error for unknown method", async () => {
				const request = createRequest({
					jsonrpc: "2.0",
					id: "test-id",
					method: "unknown_method",
				});

				const response = await callAction(request);
				const data = await response.json();

				expect(data.error.code).toBe(-32601);
				expect(data.error.message).toContain("Method not found");
			});
		});
	});

	describe("loader", () => {
		it("should return JSON message for normal request", async () => {
			const request = new Request(BASE_URL);
			const response = await callLoader(request);
			const data = await response.json();

			expect(data.message).toBe("MCP endpoint - use POST for MCP requests");
		});

		it("should return SSE stream for text/event-stream", async () => {
			const request = new Request(BASE_URL, {
				headers: { Accept: "text/event-stream" },
			});

			const response = await callLoader(request);

			expect(response.headers.get("Content-Type")).toBe("text/event-stream");
			expect(response.headers.get("Cache-Control")).toBe("no-cache");
			expect(response.headers.get("Connection")).toBe("keep-alive");
			expect(response.body).toBeInstanceOf(ReadableStream);
		});
	});
});
