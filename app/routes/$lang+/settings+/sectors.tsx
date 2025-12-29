import { authLoader, } from "~/util/auth";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { dr } from "~/db.server";
import { sectorTable } from "~/drizzle/schema";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { TreeView, buildTree } from "~/components/TreeView";
import { aliasedTable, eq } from "drizzle-orm";

import {
	sessionCookie,
} from "~/util/session";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";

const renderContent = (level: number) => {
	switch (level) {
		case 1:
			return "Type";
		case 2:
			return "Sector";
		case 3:
			return "Sub-sector";
		case 4:
			return "Category";
		default:
			return " - ";
	}
};

// Table Component
const SectorsTable = ({ sectors, ctx }: { sectors: any[]; ctx: ViewContext }) => (
	<table className="dts-table">
		<thead>
			<tr>
				<th>{ctx.t({ "code": "common.id", "msg": "ID" })}</th>
				<th>{ctx.t({ "code": "common.sector_name", "msg": "Sector Name" })}</th>
				<th>{ctx.t({ "code": "common.grouping", "msg": "Grouping" })}</th>
				<th>{ctx.t({ "code": "common.description", "msg": "Description" })}</th>
				<th>{ctx.t({ "code": "common.parent", "msg": "Parent" })}</th>
				<th>{ctx.t({ "code": "common.created_at", "msg": "Created at" })}</th>
			</tr>
		</thead>
		<tbody>
			{sectors.map((sector) => (
				<tr key={sector.id}>
					<td>{sector.id}</td>
					<td>{sector.sectorname}</td>
					<td>{renderContent(sector.level)}</td>
					<td
						// Replace newline characters with <br/> tags
						dangerouslySetInnerHTML={{
							__html: sector.description?.replace(/(\r\n|\r|\n)/g, "<br/>"),
						}}
					/>
					<td>
						{sector.parentId
							? `${sector.parentName} (ID: ${sector.parentId})`
							: "None"}
					</td>
					<td>{sector.createdAt.toLocaleString()}</td>
				</tr>
			))}
		</tbody>
	</table>
);

export const loader = authLoader(async (loaderArgs) => {
	const { request } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);

	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);

	const userRole = session.get("userRole");

	const parent = aliasedTable(sectorTable, "parent");
	const sectors = await dr
		.select({
			id: sectorTable.id,
			sectorname: sectorTable.sectorname,
			level: sectorTable.level,
			description: sectorTable.description,
			parentId: sectorTable.parentId,
			createdAt: sectorTable.createdAt,
			parentName: parent.sectorname,
		})
		.from(sectorTable)
		.leftJoin(parent, eq(parent.id, sectorTable.parentId))
		.orderBy(sectorTable.id);

	// Translate in place: overwrite sectorname and description
	for (const row of sectors as any) {
		row.sectorname = ctx.dbt({
			type: "sector.name",
			id: String(row.id),
			msg: row.sectorname,
		});

		if (row.description) {
			row.description = ctx.dbt({
				type: "sector.description",
				id: String(row.id),
				msg: row.description,
			});
		}
		if (row.parentName) {
			row.parentName = ctx.dbt({
				type: "sector.name",
				id: String(row.parentId),
				msg: row.parentName,
			});
		}
	}

	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "sectorname";

	const treeData = buildTree(sectors, idKey, parentKey, nameKey);

	return {
		
		sectors: sectors,
		treeData,
		userRole: userRole
	};
});

export default function SectorsPage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { sectors, treeData, userRole } = ld;

	const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
	const navSettings = <NavSettings ctx={ctx} userRole={userRole} />;

	return (
		<MainContainer title={ctx.t({ "code": "nav.analysis.sectors", "msg": "Sectors" })} headerExtra={navSettings}>
			<>
				<section className="dts-page-section">
					<h2 className="mg-u-sr-only" id="tablist01">
						Tablist title
					</h2>
					<ul
						className="dts-tablist"
						role="tablist"
						aria-labelledby="tablist01"
					>
						<li role="presentation">
							<button
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab01"
								aria-selected={viewMode === "tree" ? true : false}
								aria-controls="tabpanel01"
								tabIndex={viewMode === "tree" ? 0 : -1}
								onClick={() => setViewMode("tree")}
							>
								<span>{ctx.t({ "code": "settings.sectors.tree_view", "msg": "Tree View" })}</span>
							</button>
						</li>
						<li role="presentation">
							<button
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab02"
								aria-selected={viewMode === "table" ? true : false}
								aria-controls="tabpanel02"
								tabIndex={viewMode === "table" ? 0 : -1}
								onClick={() => setViewMode("table")}
							>
								<span>{ctx.t({ "code": "settings.sectors.table_view", "msg": "Table view" })}</span>
							</button>
						</li>
					</ul>
					<div
						className={
							viewMode === "tree"
								? "dts-tablist__panel"
								: "dts-tablist__panel hidden"
						}
						id="tabpanel101"
						role="tabpanel"
						aria-labelledby="tab01"
					>
						<div className="dts-placeholder">
							<form>
								<div className="fields">
									<div className="form-field">
										<TreeView
											ctx={ctx}
											treeData={treeData as any}
											rootCaption={ctx.t({ "code": "nav.sectors", "msg": "Sectors" })}
											dialogMode={false}
											disableButtonSelect={true}
											noSelect={true}
											search={true}
											expanded={true}
										/>
									</div>
								</div>
							</form>
						</div>
					</div>
					<div
						className={
							viewMode === "table"
								? "dts-tablist__panel"
								: "dts-tablist__panel hidden"
						}
						id="tabpanel102"
						role="tabpanel"
						aria-labelledby="tab02"
					>
						<SectorsTable ctx={ctx} sectors={sectors} />
					</div>
				</section>
			</>
		</MainContainer>
	);
}
