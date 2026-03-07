import { entities, readOnlyEntities, specialEntities } from "./constants";

export function getAllTools(): any[] {
	const tools: any[] = [];
	const allEntities = [...entities, ...readOnlyEntities, ...specialEntities];

	tools.push({
		name: "docs",
		description:
			"Get documentation about the data model, entity relationships, and workflow",
		inputSchema: {
			type: "object",
			properties: {},
		},
	});

	for (const entity of allEntities) {
		if (entity === "human-effects") {
			tools.push({
				name: `${entity}_fields`,
				description: `Get field definitions for ${entity}`,
				inputSchema: {
					type: "object",
					properties: {
						recordId: {
							type: "string",
							description: "Disaster record ID",
						},
						table: {
							type: "string",
							description:
								"Table name (Deaths, Injured, Missing, Affected, Displaced)",
						},
					},
					required: ["recordId", "table"],
				},
			});
		} else {
			tools.push({
				name: `${entity}_fields`,
				description: `Get field definitions for ${entity}`,
				inputSchema: {
					type: "object",
					properties: {},
				},
			});
		}
	}

	for (const entity of allEntities) {
		if (entity === "human-effects") {
			tools.push({
				name: `${entity}_list`,
				description: `List ${entity} records`,
				inputSchema: {
					type: "object",
					properties: {
						recordId: {
							type: "string",
							description: "Disaster record ID",
						},
						table: {
							type: "string",
							description:
								"Table name (Deaths, Injured, Missing, Affected, Displaced)",
						},
					},
					required: ["recordId", "table"],
				},
			});
		} else {
			tools.push({
				name: `${entity}_list`,
				description: `List ${entity} records with pagination`,
				inputSchema: {
					type: "object",
					properties: {
						page: {
							type: "number",
							description: "Page number (default: 1)",
						},
						pageSize: {
							type: "number",
							description: "Items per page (default: 50)",
						},
					},
				},
			});
		}
	}

	for (const entity of entities) {
		tools.push({
			name: `${entity}_add`,
			description: `Add new ${entity} records`,
			inputSchema: {
				type: "object",
				properties: {
					records: {
						type: "array",
						description: `Array of ${entity} records to add`,
						items: { type: "object" },
					},
				},
				required: ["records"],
			},
		});
	}

	for (const entity of entities) {
		tools.push({
			name: `${entity}_update`,
			description: `Update existing ${entity} records`,
			inputSchema: {
				type: "object",
				properties: {
					records: {
						type: "array",
						description: `Array of ${entity} records to update (must include id field)`,
						items: { type: "object" },
					},
				},
				required: ["records"],
			},
		});
	}

	for (const entity of specialEntities) {
		if (entity === "human-effects") {
			tools.push({
				name: `${entity}_save`,
				description: `Save ${entity} records (handles both new and existing records)`,
				inputSchema: {
					type: "object",
					properties: {
						data: {
							type: "object",
							description: `Human effects data object with recordId, table, columns, and data (newRows, updates, deletes)`,
						},
					},
					required: ["data"],
				},
			});
			tools.push({
				name: `${entity}_clear`,
				description: `Clear all ${entity} data for a specific table`,
				inputSchema: {
					type: "object",
					properties: {
						recordId: {
							type: "string",
							description: "Disaster record ID",
						},
						table: {
							type: "string",
							description:
								"Table name (Deaths, Injured, Missing, Affected, Displaced)",
						},
					},
					required: ["recordId", "table"],
				},
			});
			tools.push({
				name: `${entity}_category-presence-save`,
				description: `Set category presence or total group flags for ${entity}`,
				inputSchema: {
					type: "object",
					properties: {
						data: {
							type: "object",
							description: `Data object with recordId, table, and either category flags (deaths, injured, etc.) or totalGroupFlags array`,
						},
					},
					required: ["data"],
				},
			});
			tools.push({
				name: `${entity}_docs`,
				description: `Get brief documentation for ${entity} API`,
				inputSchema: {
					type: "object",
					properties: {},
				},
			});
		}
	}

	return tools;
}

export function getReadOnlyEntityFields(entity: string): any[] {
	switch (entity) {
		case "hip-type":
			return [
				{
					key: "id",
					label: "ID",
					type: "text",
				},
				{
					key: "name",
					label: "Name",
					type: "text",
				},
			];
		case "hip-cluster":
			return [
				{
					key: "id",
					label: "ID",
					type: "text",
				},
				{
					key: "typeId",
					label: "Type ID",
					type: "text",
				},
				{
					key: "name",
					label: "Name",
					type: "text",
				},
			];
		case "hip-hazard":
			return [
				{
					key: "id",
					label: "ID",
					type: "text",
				},
				{
					key: "code",
					label: "Code",
					type: "text",
				},
				{
					key: "clusterId",
					label: "Cluster ID",
					type: "text",
				},
				{
					key: "name",
					label: "Name",
					type: "text",
				},
				{
					key: "description",
					label: "Description",
					type: "textarea",
				},
			];
		case "categories":
			return [
				{
					key: "id",
					label: "ID",
					type: "text",
				},
				{
					key: "parentId",
					label: "Parent ID",
					type: "text",
				},
				{
					key: "name",
					label: "Name",
					type: "text",
				},
				{
					key: "level",
					label: "Level",
					type: "number",
				},
			];
		case "sector":
			return [
				{
					key: "id",
					label: "ID",
					type: "text",
				},
				{
					key: "parentId",
					label: "Parent ID",
					type: "text",
				},
				{
					key: "name",
					label: "Name",
					type: "text",
				},
				{
					key: "description",
					label: "Description",
					type: "textarea",
				},
				{
					key: "level",
					label: "Level",
					type: "number",
				},
			];
		default:
			return [];
	}
}
