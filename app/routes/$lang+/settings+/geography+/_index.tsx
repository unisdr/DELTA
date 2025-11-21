import { authLoaderWithPerm } from "~/util/auth";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import {
	divisionBreadcrumb,
	DivisionBreadcrumbRow,
	divisionsAllLanguages,
} from "~/backend.server/models/division";
import { useLoaderData } from "@remix-run/react";
import { divisionTable } from "~/drizzle/schema";
import { eq, isNull, sql, and } from "drizzle-orm";
import { dr } from "~/db.server";

import { Pagination } from "~/frontend/pagination/view";
import { executeQueryForPagination2 } from "~/frontend/pagination/api.server";

import { Breadcrumb } from "~/frontend/division";
import { MainContainer } from "~/frontend/container";

import "./style.css";
import { DataMainLinks } from "~/frontend/data_screen";
import { useState } from "react";
import { buildTree, TreeView } from "~/components/TreeView";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { sessionCookie } from "~/util/session";
import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { LangLink } from "~/util/link";

interface ItemRes {
	id: number;
	nationalId: string;
	hasChildren: boolean;
	name: Record<string, string>;
}

export const loader = authLoaderWithPerm("ManageCountrySettings", async (loaderArgs) => {
	const { request } = loaderArgs;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const url = new URL(request.url);
	const parentId = url.searchParams.get("parent") || null;
	const langs = await divisionsAllLanguages(parentId, [], countryAccountsId);

	const selectedLangs = Object.entries(langs)
		.sort(([ak, ac], [bk, bc]) => {
			if (bc !== ac) {
				return bc - ac;
			}
			return ak.localeCompare(bk);
		})
		.slice(0, 3)
		.map(([lang]) => lang)
		.sort();

	const q1 = dr.select({
		id: divisionTable.id,
		nationalId: divisionTable.nationalId,
		name: divisionTable.name,
		hasChildren: sql<boolean>`EXISTS (
		SELECT 1
		FROM ${divisionTable} as children
		WHERE children.${divisionTable.parentId} = ${divisionTable}.id)`.as(
			"hasChildren"
		),
	});

	let q2 = (q: typeof q1) => {
		return q
			.from(divisionTable)
			.where(
				and(
					parentId
						? eq(divisionTable.parentId, parentId)
						: isNull(divisionTable.parentId),
					eq(divisionTable.countryAccountsId, countryAccountsId)
				)
			);
	};

	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (parentId) {
		breadcrumbs = await divisionBreadcrumb(
			selectedLangs,
			parentId,
			countryAccountsId
		);
	}

	const res = await executeQueryForPagination2<ItemRes>(request, q1, q2, [
		"parent",
	]);

	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
	const rawData = await dr
		.select({
			id: divisionTable.id,
			nationalId: divisionTable.nationalId,
			name: divisionTable.name,
			parentId: divisionTable.parentId,
		})
		.from(divisionTable)
		.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	const treeData = buildTree(
		rawData,
		idKey,
		parentKey,
		nameKey,
		"en",
	);


	const session = await sessionCookie().getSession(
			request.headers.get("Cookie")
		);
	
	const userRole = session.get("userRole");

	return {
		common: await getCommonData(loaderArgs),
		langs,
		breadcrumbs,
		selectedLangs,
		treeData,
		...res,
		userRole: userRole
	};
});

type LanguageCheckboxesProps = {
	langs: Record<string, number>;
	selectedLangs: string[];
};

export function LanguageCheckboxes({
	langs,
	selectedLangs,
}: LanguageCheckboxesProps) {
	const sortedLangs = Object.entries(langs).sort(([a], [b]) =>
		a.localeCompare(b)
	);

	return (
		<div>
			{sortedLangs.map(([lang, count]) => (
				<label key={lang}>
					<input
						type="checkbox"
						id={lang}
						name={lang}
						defaultChecked={selectedLangs.includes(lang)}
					/>
					{lang.toUpperCase()} ({count})
				</label>
			))}
		</div>
	);
}

type DivisionsTableProps = {
	ctx: ViewContext;
	items: ItemRes[];
	langs: string[];
};

function linkOrText(ctx: ViewContext, linkUrl: string, text: string | number) {
	return linkUrl ? <LangLink lang={ctx.lang} to={linkUrl}>{text}</LangLink> : <span>{text}</span>;
}

export function DivisionsTable({ ctx, items, langs }: DivisionsTableProps) {
	return (
		<table className="dts-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>National ID</th>
					{langs.map((lang) => (
						<th key={lang}>{lang.toUpperCase()}</th>
					))}
					<th></th>
				</tr>
			</thead>
			<tbody>
				{items.map((item) => {
					const linkUrl = item.hasChildren ? `?parent=${item.id}` : "";
					return (
						<tr key={item.id}>
							<td>{linkOrText(ctx, linkUrl, item.id)}</td>
							<td>{linkOrText(ctx, linkUrl, item.nationalId)}</td>
							{langs.map((lang) => (
								<td key={lang}>
									{linkOrText(ctx, linkUrl, item.name[lang] || "-")}
								</td>
							))}
							<td>
								<LangLink lang={ctx.lang} to={`/settings/geography/${item.id}`}>View</LangLink>&nbsp;
								<LangLink lang={ctx.lang} to={`/settings/geography/edit/${item.id}`}>Edit</LangLink>
								&nbsp;
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	const pagination = Pagination({
		ctx,
		...ld.pagination
	});
	const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

	// Table Component
	const GeographicLevelsTable = () => (
		<>
			<br />
			<DataMainLinks
				ctx={ctx}
				noCreate={true}
				noImport={true}
				baseRoute="/settings/geography"
				resourceName=""
				csvExportLinks={true}
				extraButtons={[{ relPath: "upload", label: "Upload CSV" }]}
			/>
			{ld.pagination.totalItems > 0 ? (
				<>
					<LanguageCheckboxes
						langs={ld.langs}
						selectedLangs={ld.selectedLangs}
					/>
					<Breadcrumb ctx={ctx} rows={ld.breadcrumbs} />
					<DivisionsTable ctx={ctx} langs={ld.selectedLangs} items={ld.items} />
					{pagination}
				</>
			) : (
				<p>
					No administrative divisions configured. Please upload CSV with data.
					See <a href="#">example (todo)</a>.
				</p>
			)}
		</>
	);

	const navSettings = <NavSettings ctx={ctx} userRole={ ld.userRole } />;

	return (
		<MainContainer title="Geographic levels" headerExtra={ navSettings }>
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
								<span>Tree View</span>
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
								<span>Table View</span>
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
						<div>
							<form>
								<div className="fields">
									<div className="form-field">
										<TreeView
											ctx={ctx}
											treeData={ld.treeData as any}
											rootCaption="Geographic levels"
											dialogMode={false}
											disableButtonSelect={true}
											noSelect={true}
											search={true}
											expanded={true}
											itemLink="/settings/geography/edit/[id]?view=tree"
											expandByDefault={true}
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
						<GeographicLevelsTable />
					</div>
				</section>
			</>
		</MainContainer>
	);
}
