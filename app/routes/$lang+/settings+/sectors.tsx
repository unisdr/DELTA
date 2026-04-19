import { authLoader } from "~/utils/auth";

import { NavSettings } from "~/frontend/components/NavSettings";
import { MainContainer } from "~/frontend/container";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema/sectorTable";
import { useLoaderData } from "react-router";
import { useState, useMemo, useCallback, useEffect } from "react";
import { sql, aliasedTable, eq } from "drizzle-orm";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Paginator } from "primereact/paginator";
import { VirtualScroller } from "primereact/virtualscroller";

import { getUserRoleFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";

const renderLevelName = (ctx: ViewContext, level: number) => {
	switch (level) {
		case 1:
			return ctx.t({ code: "sectors.type", msg: "Type" });
		case 2:
			return ctx.t({ code: "sectors.sector", msg: "Sector" });
		case 3:
			return ctx.t({ code: "sectors.sub_sector", msg: "Sub-sector" });
		case 4:
			return ctx.t({ code: "sectors.category", msg: "Category" });
		default:
			return " - ";
	}
};

// Convert custom tree data to PrimeReact Tree format
const convertToTreeNodes = (items: any[]) => {
	const map = new Map();
	const roots: any[] = [];

	items.forEach((item) => {
		const node = {
			key: item.id,
			label: item.sectorname || "Unnamed",
			data: item,
			children: [],
		};
		map.set(item.id, node);
		if (!item.parentId) {
			roots.push(node);
		}
	});

	items.forEach((item) => {
		if (item.parentId) {
			const parent = map.get(item.parentId);
			if (parent) {
				parent.children.push(map.get(item.id));
			}
		}
	});

	return roots;
};

export const loader = authLoader(async (loaderArgs) => {
	const { request } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);

	const userRole = await getUserRoleFromSession(request);

	const parent = aliasedTable(sectorTable, "parent");
	const sectors = await dr
		.select({
			id: sectorTable.id,
			sectorname:
				sql<string>`dts_jsonb_localized(${sectorTable.name}, ${ctx.lang})`.as(
					"sectorname",
				),
			level: sectorTable.level,
			description:
				sql<string>`dts_jsonb_localized(${sectorTable.description}, ${ctx.lang})`.as(
					"description",
				),
			parentId: sectorTable.parentId,
			createdAt: sectorTable.createdAt,
			parentName:
				sql<string>`dts_jsonb_localized(${parent.name}, ${ctx.lang})`.as(
					"parentName",
				),
		})
		.from(sectorTable)
		.leftJoin(parent, eq(parent.id, sectorTable.parentId))
		.orderBy(sectorTable.id);

	return {
		sectors: sectors,
		userRole: userRole,
	};
});

export default function SectorsPage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { sectors, userRole } = ld;

	const navSettings = <NavSettings ctx={ctx} userRole={userRole} />;
	const treeNodes = useMemo(() => convertToTreeNodes(sectors), [sectors]);
	const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
	const [filterValue, setFilterValue] = useState<string>("");
	const [tableFirst, setTableFirst] = useState(0);
	const [tableRows, setTableRows] = useState(10);
	const pageSizeOptions = [10, 20, 30, 40, 50];

	// Flatten tree into a list for VirtualScroller based on expandedKeys
	const flattenedNodes = useMemo(() => {
		const result: Array<{ node: any; depth: number }> = [];
		const stack: Array<{ node: any; depth: number }> = treeNodes.map(n => ({ node: n, depth: 0 })).reverse();

		while (stack.length > 0) {
			const { node, depth } = stack.pop()!;
			result.push({ node, depth });

			if (expandedKeys[node.key as string] && node.children?.length) {
				for (let i = node.children.length - 1; i >= 0; i--) {
					stack.push({ node: node.children[i], depth: depth + 1 });
				}
			}
		}

		return result;
	}, [treeNodes, expandedKeys]);

	// Filter nodes based on search input - include matches and their ancestors to show full context
	const filteredNodes = useMemo(() => {
		if (!filterValue.trim()) return flattenedNodes;

		const lowerFilter = filterValue.toLowerCase();
		const nodesToInclude = new Set<string>();

		// Find all matching nodes
		const matchingIndices: number[] = [];
		for (let i = 0; i < flattenedNodes.length; i++) {
			if (flattenedNodes[i].node.label.toLowerCase().includes(lowerFilter)) {
				matchingIndices.push(i);
				nodesToInclude.add(flattenedNodes[i].node.key as string);
			}
		}

		// For each match, find and include all its ancestors
		for (const matchIndex of matchingIndices) {
			let currentDepth = flattenedNodes[matchIndex].depth;

			// Walk backwards to find all ancestors (nodes with smaller depth)
			for (let i = matchIndex - 1; i >= 0; i--) {
				const item = flattenedNodes[i];
				if (item.depth < currentDepth) {
					nodesToInclude.add(item.node.key as string);
					currentDepth = item.depth;
					if (currentDepth === 0) break;
				}
			}
		}

		// Return filtered nodes maintaining the original order
		return flattenedNodes.filter(item => nodesToInclude.has(item.node.key as string));
	}, [flattenedNodes, filterValue]);

	// Auto-expand matching nodes when searching
	useEffect(() => {
		if (!filterValue.trim()) {
			return;
		}

		const lowerFilter = filterValue.toLowerCase();
		const _expandedKeys: Record<string, boolean> = {};

		// Build parent map while traversing
		const parentMap = new Map<string, any>();
		const findMatches = (nodes: any[]) => {
			const stack = [...nodes];
			while (stack.length > 0) {
				const node = stack.pop();
				if (!node) continue;

				// Check if this node matches
				if (node.label.toLowerCase().includes(lowerFilter)) {
					_expandedKeys[node.key as string] = true;
					// Expand all ancestors
					let parent = parentMap.get(node.key as string);
					while (parent) {
						_expandedKeys[parent.key as string] = true;
						parent = parentMap.get(parent.key as string);
					}
				}

				// Add children to stack and record parent relationships
				if (node.children) {
					for (const child of node.children) {
						parentMap.set(child.key as string, node);
					}
					stack.push(...node.children);
				}
			}
		};

		findMatches(treeNodes);
		setExpandedKeys(_expandedKeys);
	}, [filterValue, treeNodes]);

	const expandAll = () => {
		const _expandedKeys: Record<string, boolean> = {};
		const stack = [...treeNodes];

		while (stack.length > 0) {
			const node = stack.pop();
			if (node?.children && node.children.length) {
				_expandedKeys[node.key as string] = true;
				stack.push(...node.children);
			}
		}

		setExpandedKeys(_expandedKeys);
	};

	const collapseAll = () => {
		setExpandedKeys({});
	};

	const descriptionTemplate = useCallback((rowData: any) => (
		<div className="whitespace-pre-wrap text-sm">
			{rowData.description || "-"}
		</div>
	), []);

	const parentTemplate = useCallback((rowData: any) => (
		<span className="text-sm">
			{rowData.parentId
				? `${rowData.parentName} (ID: ${rowData.parentId})`
				: "None"}
		</span>
	), []);

	const levelTemplate = useCallback((rowData: any) => (
		<span className="text-sm">{renderLevelName(ctx, rowData.level)}</span>
	), [ctx]);

	const createdAtTemplate = useCallback((rowData: any) => {
		const value = rowData.createdAt ? new Date(rowData.createdAt).toLocaleString() : "-";
		return <span className="text-sm">{value}</span>;
	}, []);

	const paginatedSectors = useMemo(
		() => sectors.slice(tableFirst, tableFirst + tableRows),
		[sectors, tableFirst, tableRows],
	);

	return (
		<MainContainer
			title={ctx.t({ code: "nav.analysis.sectors", msg: "Sectors" })}
			headerExtra={navSettings}
		>
			<div className="w-full">
				<TabView className="w-full">
					<TabPanel
						header={ctx.t({
							code: "settings.sectors.tree_view",
							msg: "Tree View",
						})}
					>
						<div className="p-3 sm:p-6">
							<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
								<Button
									type="button"
									outlined
									size="small"
									icon="pi pi-plus"
									className="w-full sm:w-auto"
									label={ctx.t({
										code: "common.expand_all",
										msg: "Expand All",
									})}
									onClick={expandAll}
								/>
								<Button
									type="button"
									outlined
									size="small"
									icon="pi pi-minus"
									className="w-full sm:w-auto"
									label={ctx.t({
										code: "common.collapse_all",
										msg: "Collapse All",
									})}
									onClick={collapseAll}
								/>
								<div className="relative w-full sm:w-64">
									<input
										type="text"
										placeholder={ctx.t({
											code: "common.search_placeholder_dotdotdot",
											msg: "Search...",
										})}
										value={filterValue}
										onChange={(e) => setFilterValue(e.target.value)}
										className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
									{filterValue && (
										<button
											onClick={() => setFilterValue("")}
											className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
										>
											<i className="pi pi-times text-lg" />
										</button>
									)}
								</div>
							</div>
							<VirtualScroller
								items={filteredNodes}
								itemSize={35}
								scrollHeight="400px"
								className="w-full border border-gray-200 rounded-md shadow-sm bg-white"
								itemTemplate={(item) => {
									const { node, depth } = item;
									const isExpanded = expandedKeys[node.key as string];
									const hasChildren = node.children?.length > 0;

									return (
										<div
											key={node.key}
											className="flex items-center px-3 py-2 hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
											style={{ paddingLeft: `${depth * 20 + 12}px` }}
										>
											{hasChildren && (
												<span
													onClick={() => {
														const newExpandedKeys = { ...expandedKeys };
														if (isExpanded) {
															delete newExpandedKeys[node.key as string];
														} else {
															newExpandedKeys[node.key as string] = true;
														}
														setExpandedKeys(newExpandedKeys);
													}}
													className="mr-2 cursor-pointer w-4 flex items-center justify-center text-gray-600 hover:text-gray-900"
												>
													<i
														className={`pi text-xs ${isExpanded ? "pi-chevron-down" : "pi-chevron-right"}`}
													/>
												</span>
											)}
											{!hasChildren && <span className="mr-2 w-4" />}
											<span className="text-gray-800 font-medium">{node.label}</span>
										</div>
									);
								}}
							/>
						</div>
					</TabPanel>

					<TabPanel
						header={ctx.t({
							code: "settings.sectors.table_view",
							msg: "Table view",
						})}
					>
						<div className="w-full">
							<DataTable
								value={paginatedSectors}
								dataKey="id"
								emptyMessage={ctx.t({
									code: "common.no_data_found",
									msg: "No data found",
								})}
								className="w-full text-sm"
								scrollable
								scrollHeight="400px"
							>
								<Column
									field="id"
									header={ctx.t({
										code: "common.id",
										msg: "ID",
									})}
									className="w-1/6 px-4 py-3"
									style={{ minWidth: "100px" }}
								/>
								<Column
									field="sectorname"
									header={ctx.t({
										code: "common.sector_name",
										msg: "Sector Name",
									})}
									className="w-1/6 px-4 py-3"
									style={{ minWidth: "150px" }}
								/>
								<Column
									header={ctx.t({
										code: "common.grouping",
										msg: "Grouping",
									})}
									body={levelTemplate}
									className="w-1/6 px-4 py-3"
									style={{ minWidth: "100px" }}
								/>
								<Column
									header={ctx.t({
										code: "common.description",
										msg: "Description",
									})}
									body={descriptionTemplate}
									className="w-1/4 px-4 py-3"
									style={{ minWidth: "200px" }}
								/>
								<Column
									header={ctx.t({
										code: "common.parent",
										msg: "Parent",
									})}
									body={parentTemplate}
									className="w-1/6 px-4 py-3"
									style={{ minWidth: "150px" }}
								/>
								<Column
									header={ctx.t({
										code: "common.created_at",
										msg: "Created at",
									})}
									body={createdAtTemplate}
									className="w-1/6 px-4 py-3"
									style={{ minWidth: "150px" }}
								/>
							</DataTable>
							{sectors.length > 0 && (
								<Paginator
									first={tableFirst}
									rows={tableRows}
									totalRecords={sectors.length}
									rowsPerPageOptions={pageSizeOptions}
									onPageChange={(event) => {
										setTableFirst(event.first);
										setTableRows(event.rows);
									}}
									className="mt-4 !justify-end"
								/>
							)}
						</div>
					</TabPanel>
				</TabView>
			</div>
		</MainContainer>
	);
}
