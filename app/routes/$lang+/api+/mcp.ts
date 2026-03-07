import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { apiAuth } from "~/backend.server/models/api_key";
import {
	errorResponse,
	successResponse,
	extractLangFromRequest,
} from "~/backend.server/services/mcp/utils";
import { getAllTools } from "~/backend.server/services/mcp/tools";
import { executeTool } from "~/backend.server/services/mcp/handlers";

export async function action({ request }: ActionFunctionArgs) {
	try {
		const apiKey = await apiAuth(request);
		if (!apiKey.countryAccountsId) {
			return Response.json(
				errorResponse(null, -32000, "Unauthorized: No country accounts ID"),
				{ status: 401 },
			);
		}
	} catch (error) {
		return Response.json(
			errorResponse(null, -32000, "Unauthorized: Invalid API key"),
			{
				status: 401,
			},
		);
	}

	let req: any;
	try {
		req = await request.json();
	} catch (error) {
		return Response.json(
			errorResponse(null, -32700, "Parse error: Invalid JSON"),
			{ status: 400 },
		);
	}

	if (req.jsonrpc !== "2.0") {
		return Response.json(
			errorResponse(
				req.id,
				-32600,
				"Invalid Request: jsonrpc version must be 2.0",
			),
		);
	}

	if (!req.method) {
		return Response.json(
			errorResponse(req.id, -32600, "Invalid Request: method is required"),
		);
	}

	if (typeof req.method !== "string") {
		return Response.json(
			errorResponse(req.id, -32600, "Invalid Request: method must be a string"),
		);
	}

	const lang = extractLangFromRequest(request);

	switch (req.method) {
		case "initialize":
			return Response.json(
				successResponse(req.id, {
					protocolVersion: "2024-11-05",
					capabilities: {
						tools: {},
					},
					serverInfo: {
						name: "dts-mcp",
						version: "1.0.0",
					},
				}),
			);

		case "tools/list":
			return Response.json(successResponse(req.id, { tools: getAllTools() }));

		case "tools/call":
			const params = req.params;
			if (!params) {
				return Response.json(
					errorResponse(
						req.id,
						-32602,
						"Invalid params: params object is required",
					),
				);
			}
			if (!params.name) {
				return Response.json(
					errorResponse(req.id, -32602, "Invalid params: name is required"),
				);
			}
			if (typeof params.name !== "string") {
				return Response.json(
					errorResponse(
						req.id,
						-32602,
						"Invalid params: name must be a string",
					),
				);
			}
			const name = params.name;
			const toolArgs = params.arguments || {};

			try {
				const result = await executeTool(request, lang, name, toolArgs);

				return Response.json(
					successResponse(req.id, {
						content: [
							{
								type: "text",
								text: result,
							},
						],
					}),
				);
			} catch (error) {
				return Response.json(
					errorResponse(
						req.id,
						-32000,
						error instanceof Error ? error.message : String(error),
					),
				);
			}

		case "shutdown":
			return Response.json(successResponse(req.id, null));

		default:
			return Response.json(
				errorResponse(req.id, -32601, `Method not found: ${req.method}`),
			);
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	console.log("[MCP Loader] Request:", request.method, request.url);
	const accept = request.headers.get("Accept") || "";
	console.log("[MCP Loader] Accept:", accept);

	if (accept.includes("text/event-stream")) {
		console.log("[MCP Loader] SSE connection established");
		const encoder = new TextEncoder();
		const url = new URL(request.url);
		const postEndpoint = url.pathname;

		const stream = new ReadableStream({
			start(controller) {
				console.log("[MCP Loader] Sending endpoint event:", postEndpoint);
				controller.enqueue(
					encoder.encode(`event: endpoint\ndata: ${postEndpoint}\n\n`),
				);

				const keepAlive = setInterval(() => {
					controller.enqueue(encoder.encode(": keepalive\n\n"));
				}, 30000);

				setTimeout(() => {
					clearInterval(keepAlive);
					controller.close();
				}, 3600000);
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	}

	console.log("[MCP Loader] Returning JSON response");
	return Response.json({ message: "MCP endpoint - use POST for MCP requests" });
}
