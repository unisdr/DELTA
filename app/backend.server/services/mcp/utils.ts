import type { MCPResponse } from "./types";
import { entities, readOnlyEntities, specialEntities } from "./constants";

export function successResponse(id: any, result: any): MCPResponse {
	return {
		jsonrpc: "2.0",
		id,
		result,
	};
}

export function errorResponse(
	id: any,
	code: number,
	message: string,
): MCPResponse {
	return {
		jsonrpc: "2.0",
		id,
		error: {
			code,
			message,
		},
	};
}

export function extractLangFromRequest(request: Request): string {
	const url = new URL(request.url);
	const pathParts = url.pathname.split("/");
	const lang = pathParts[1] || "en";
	return lang;
}

export function parseToolName(toolName: string): {
	entity: string;
	action: string;
} {
	const parts = toolName.split("_");
	if (parts.length < 2) {
		throw new Error(`Invalid tool name: ${toolName}`);
	}

	const action = parts[parts.length - 1];
	const entity = parts.slice(0, parts.length - 1).join("-");

	return { entity, action };
}

export function isValidEntity(entity: string): boolean {
	const allEntities = [...entities, ...readOnlyEntities, ...specialEntities];
	return allEntities.includes(entity);
}

export function isReadOnly(entity: string): boolean {
	return readOnlyEntities.includes(entity);
}

export function isActionAllowed(entity: string, action: string): boolean {
	if (isReadOnly(entity) && (action === "add" || action === "update")) {
		return false;
	}
	return true;
}

export function getEntityPath(entity: string): string {
	const pathMap: Record<string, string> = {
		"hip-type": "hips/type",
		"hip-cluster": "hips/cluster",
		"hip-hazard": "hips/hazard",
	};
	return pathMap[entity] || entity;
}
