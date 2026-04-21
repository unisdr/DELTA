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
import { InputText } from "primereact/inputtext";
import { Paginator } from "primereact/paginator";
import { Tree, TreeExpandedKeysType } from "primereact/tree";
import { TreeNode } from "primereact/treenode";
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

// Build PrimeReact TreeNode[] from flat sector rows
const convertToTreeNodes = (items: any[]): TreeNode[] => {
	const map = new Map<string, TreeNode>();
	const roots: TreeNode[] = [];

	items.forEach((item) => {
		map.set(item.id, {
			key: String(item.id),
			label: item.sectorname || "Unnamed",
			data: item,
			children: [],
		});
	});

	items.forEach((item) => {
		if (item.parentId) {
			const parent = map.get(item.parentId);
			const node = map.get(item.id);
			if (parent && node) {
				(parent.children as TreeNode[]).push(node);
			}
		} else {
			const node = map.get(item.id);
			if (node) roots.push(node);
		}
	});

	return roots;
};

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
	if (!query.trim()) {
		return nodes;
	}

	const q = query.toLowerCase();
	const out: TreeNode[] = [];

	for (const node of nodes) {
		const label = String(node.label || "").toLowerCase();
		const children = filterTreeNodes(node.children || [], query);
		if (label.includes(q) || children.length > 0) {
			out.push({ ...node, children });
		}
	}

	return out;
}

function expandAllNodes(
	nodes: TreeNode[],
	keys: TreeExpandedKeysType = {},
): TreeExpandedKeysType {
	for (const node of nodes) {
		if (node.key) {
			keys[String(node.key)] = true;
		}
		if (node.children?.length) {
			expandAllNodes(node.children, keys);
		}
	}
	return keys;
}



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

	const [expandedKeys, setExpandedKeys] = useState<TreeExpandedKeysType>({});
	const [filterValue, setFilterValue] = useState<string>("");
	const [tableFirst, setTableFirst] = useState(0);
	const [tableRows, setTableRows] = useState(10);
	const pageSizeOptions = [10, 20, 30, 40, 50];

	const filteredNodes = useMemo(
		() => filterTreeNodes(treeNodes, filterValue),
		[treeNodes, filterValue],
	);

	const expandedFilteredKeys = useMemo(
		() => expandAllNodes(filteredNodes),
		[filteredNodes],
	);

	useEffect(() => {
		if (filterValue.trim()) {
			setExpandedKeys(expandedFilteredKeys);
		} else {
			setExpandedKeys({});
		}
	}, [expandedFilteredKeys, filterValue]);

	const expandAll = () => {
		setExpandedKeys(expandedFilteredKeys);
	};

	const collapseAll = () => setExpandedKeys({});

	const descriptionTemplate = useCallback((rowData: any) => (
		<div className="whitespace-pre-wrap text-sm">
			{rowData.description || "-"}
		</div>
	), []);

	const parentTemplate = useCallback((rowData: any) => (
		<span className="text-sm">
			{rowData.parentId
				? rowData.parentName
				: "None"}
		</span>
	), []);

	const levelTemplate = useCallback((rowData: any) => (
		<span className="text-sm">{renderLevelName(ctx, rowData.level)}</span>
	), [ctx]);

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
								<InputText
									value={filterValue}
									onChange={(e) => setFilterValue(e.target.value)}
									placeholder={ctx.t({
										code: "common.search_placeholder_dotdotdot",
										msg: "Search...",
									})}
									size="small"
								/>
							</div>
								<VirtualScroller disabled className="w-full">
									<div className="dts-tree-shell max-h-[32rem] overflow-auto rounded-md border border-slate-200 bg-white pr-2 shadow-sm">
										<Tree
											selectionMode="single"
											value={filteredNodes}
											className="w-full"
											expandedKeys={expandedKeys}
											onToggle={(e) =>
												setExpandedKeys(e.value as TreeExpandedKeysType)
											}
										/>
									</div>
								</VirtualScroller>
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
