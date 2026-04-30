import {
	isReadOnly,
	getEntityPath,
	parseToolName,
	isValidEntity,
	isActionAllowed,
} from "./utils";
import { getReadOnlyEntityFields } from "./tools";
import { callInternalApi } from "./client";
import { DOCS, HUMAN_EFFECTS_DOCS } from "./docs";

export async function executeFields(
	request: Request,
	lang: string,
	entity: string,
	args: any,
): Promise<string> {
	if (isReadOnly(entity)) {
		const fields = getReadOnlyEntityFields(entity);
		return JSON.stringify(fields, null, 2);
	}

	const entityPath = getEntityPath(entity);

	if (entity === "human-effects") {
		const recordId = args.recordId;
		const table = args.table || "Deaths";

		if (!recordId) {
			throw new Error("recordId is required for human-effects");
		}

		const validTables = [
			"Deaths",
			"Injured",
			"Missing",
			"Affected",
			"Displaced",
		];
		if (!validTables.includes(table)) {
			throw new Error(`table must be one of: ${validTables.join(", ")}`);
		}

		const data = await callInternalApi(
			request,
			`/${lang}/api/${entityPath}/list?recordId=${recordId}&table=${table}`,
		);

		const columnNames = data.defs.map((def: any) => def.jsName || def.dbName);
		return JSON.stringify(
			{
				columns: columnNames,
				defs: data.defs,
			},
			null,
			2,
		);
	}

	const response = await callInternalApi(
		request,
		`/${lang}/api/${entityPath}/fields`,
	);

	return JSON.stringify(response, null, 2);
}

export async function executeList(
	request: Request,
	lang: string,
	entity: string,
	args: any,
): Promise<string> {
	if (entity === "human-effects") {
		const recordId = args.recordId;
		const table = args.table || "Deaths";

		if (!recordId) {
			throw new Error("recordId is required for human-effects");
		}

		const validTables = [
			"Deaths",
			"Injured",
			"Missing",
			"Affected",
			"Displaced",
		];
		if (!validTables.includes(table)) {
			throw new Error(`table must be one of: ${validTables.join(", ")}`);
		}

		const entityPath = getEntityPath(entity);
		const result = await callInternalApi(
			request,
			`/${lang}/api/${entityPath}/list?recordId=${recordId}&table=${table}`,
		);

		return JSON.stringify(result, null, 2);
	}

	const page = args.page || 1;
	const pageSize = args.pageSize || 50;

	if (page < 1) {
		throw new Error("page must be >= 1");
	}
	if (pageSize < 1 || pageSize > 1000) {
		throw new Error("pageSize must be between 1 and 1000");
	}

	const entityPath = getEntityPath(entity);
	const result = await callInternalApi(
		request,
		`/${lang}/api/${entityPath}/list?page=${page}&pageSize=${pageSize}`,
	);

	return JSON.stringify(result.data, null, 2);
}

export async function executeAdd(
	request: Request,
	lang: string,
	entity: string,
	args: any,
): Promise<string> {
	const records = args.records;

	if (!Array.isArray(records)) {
		throw new Error("records must be an array");
	}
	if (records.length === 0) {
		throw new Error("records array cannot be empty");
	}
	if (records.length > 100) {
		throw new Error("records array cannot exceed 100 items");
	}

	const entityPath = getEntityPath(entity);
	const result = await callInternalApi(
		request,
		`/${lang}/api/${entityPath}/add`,
		"POST",
		records,
	);

	return JSON.stringify(result, null, 2);
}

export async function executeUpdate(
	request: Request,
	lang: string,
	entity: string,
	args: any,
): Promise<string> {
	const records = args.records;

	if (!Array.isArray(records)) {
		throw new Error("records must be an array");
	}
	if (records.length === 0) {
		throw new Error("records array cannot be empty");
	}
	if (records.length > 100) {
		throw new Error("records array cannot exceed 100 items");
	}

	for (const record of records) {
		if (!record.id) {
			throw new Error("each record must include an id field for update");
		}
	}

	const entityPath = getEntityPath(entity);
	const result = await callInternalApi(
		request,
		`/${lang}/api/${entityPath}/update`,
		"POST",
		records,
	);

	return JSON.stringify(result, null, 2);
}

export async function executeHumanEffectsSave(
	request: Request,
	lang: string,
	args: any,
): Promise<string> {
	const data = args.data;

	if (!data) {
		throw new Error("data is required for human-effects");
	}
	if (!data.recordId) {
		throw new Error("recordId is required for human-effects");
	}
	if (!data.table) {
		throw new Error("table is required for human-effects");
	}

	const validTables = ["Deaths", "Injured", "Missing", "Affected", "Displaced"];
	if (!validTables.includes(data.table)) {
		throw new Error(`table must be one of: ${validTables.join(", ")}`);
	}

	const result = await callInternalApi(
		request,
		`/${lang}/api/human-effects/save?recordId=${data.recordId}`,
		"POST",
		data,
	);

	return JSON.stringify(result, null, 2);
}

export async function executeHumanEffectsClear(
	request: Request,
	lang: string,
	args: any,
): Promise<string> {
	const recordId = args.recordId;
	const table = args.table;

	if (!recordId) {
		throw new Error("recordId is required for human-effects");
	}
	if (!table) {
		throw new Error("table is required for human-effects");
	}

	const validTables = ["Deaths", "Injured", "Missing", "Affected", "Displaced"];
	if (!validTables.includes(table)) {
		throw new Error(`table must be one of: ${validTables.join(", ")}`);
	}

	const result = await callInternalApi(
		request,
		`/${lang}/api/human-effects/clear?recordId=${recordId}&table=${table}`,
		"POST",
	);

	return JSON.stringify(result, null, 2);
}

export async function executeHumanEffectsCategoryPresenceSave(
	request: Request,
	lang: string,
	args: any,
): Promise<string> {
	const data = args.data;

	if (!data) {
		throw new Error("data is required for human-effects");
	}
	if (!data.recordId) {
		throw new Error("recordId is required for human-effects");
	}
	if (!data.table) {
		throw new Error("table is required for human-effects");
	}

	const validTables = ["Deaths", "Injured", "Missing", "Affected", "Displaced"];
	if (!validTables.includes(data.table)) {
		throw new Error(`table must be one of: ${validTables.join(", ")}`);
	}

	const result = await callInternalApi(
		request,
		`/${lang}/api/human-effects/category-presence-save?recordId=${data.recordId}`,
		"POST",
		data,
	);

	return JSON.stringify(result, null, 2);
}

export async function executeHumanEffectsDocs(): Promise<string> {
	return HUMAN_EFFECTS_DOCS;
}

export async function executeDocs(): Promise<string> {
	return DOCS;
}

export async function executeTool(
	request: Request,
	lang: string,
	toolName: string,
	args: any,
): Promise<string> {
	if (toolName === "docs") {
		return await executeDocs();
	}

	const { entity, action } = parseToolName(toolName);

	if (!isValidEntity(entity)) {
		throw new Error(`Invalid entity: ${entity}`);
	}

	if (!isActionAllowed(entity, action)) {
		throw new Error(`${entity} is read-only, cannot ${action}`);
	}

	switch (action) {
		case "fields":
			return await executeFields(request, lang, entity, args);
		case "list":
			return await executeList(request, lang, entity, args);
		case "add":
			return await executeAdd(request, lang, entity, args);
		case "update":
			return await executeUpdate(request, lang, entity, args);
		case "save":
			if (entity === "human-effects") {
				return await executeHumanEffectsSave(request, lang, args);
			}
			throw new Error(`save action not supported for ${entity}`);
		case "clear":
			if (entity === "human-effects") {
				return await executeHumanEffectsClear(request, lang, args);
			}
			throw new Error(`clear action not supported for ${entity}`);
		case "category-presence-save":
			if (entity === "human-effects") {
				return await executeHumanEffectsCategoryPresenceSave(
					request,
					lang,
					args,
				);
			}
			throw new Error(
				`category-presence-save action not supported for ${entity}`,
			);
		case "docs":
			if (entity === "human-effects") {
				return await executeHumanEffectsDocs();
			}
			throw new Error(`docs action not supported for ${entity}`);
		default:
			throw new Error(`Unknown action: ${action}`);
	}
}
