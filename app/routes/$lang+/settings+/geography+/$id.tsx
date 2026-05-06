import { authLoaderWithPerm } from "~/utils/auth";

import { useLoaderData } from "react-router";

import {
	DivisionBreadcrumbRow,
} from "~/backend.server/models/division";
import { DivisionRepository } from "~/db/queries/divisonRepository";

import { useState, useEffect } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { BreadCrumb as PrimeBreadCrumb } from "primereact/breadcrumb";
import { MenuItem } from "primereact/menuitem";

import DTSMap from "~/frontend/dtsmap/dtsmap";

import { NavSettings } from "~/frontend/components/NavSettings";
import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";

type DivisionBreadcrumbSourceRow = {
	id: string;
	parentId: string | null;
	name: Record<string, string> | null;
};

function buildDivisionBreadcrumbRows(
	rows: DivisionBreadcrumbSourceRow[],
	divisionId: string,
): DivisionBreadcrumbRow[] {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const breadcrumbs: DivisionBreadcrumbRow[] = [];
	let currentId: string | null = divisionId;

	while (currentId) {
		const row = byId.get(currentId);
		if (!row) {
			break;
		}

		const nameMap = (row.name || {}) as Record<string, string>;
		const nameLang = nameMap.en ? "en" : (Object.keys(nameMap)[0] || "");

		breadcrumbs.unshift({
			id: row.id,
			parentId: row.parentId,
			nameLang,
			name: nameLang ? nameMap[nameLang] || "" : "",
		});

		currentId = row.parentId;
	}

	return breadcrumbs;
}

type BreadcrumbProps = {
	ctx: ViewContext;
	rows: DivisionBreadcrumbRow[] | null;
	linkLast?: boolean;
};

function Breadcrumb({ ctx, rows, linkLast }: BreadcrumbProps) {
	if (!rows) {
		return null;
	}

	const home: MenuItem = {
		label: "Root",
		template: (item, options) => (
			<LangLink
				lang={ctx.lang}
				to="/settings/geography"
				className={options.className}
			>
				{item.label}
			</LangLink>
		),
	};

	const model: MenuItem[] = rows.map((row, index) => {
		const isLink = index < rows.length - 1 || linkLast;
		return {
			label: row.name,
			template: (item, options) => {
				if (!isLink) {
					return <span className={options.className}>{item.label}</span>;
				}
				return (
					<LangLink
						lang={ctx.lang}
						to={`/settings/geography?parent=${row.id}`}
						className={options.className}
					>
						{item.label}
					</LangLink>
				);
			},
		};
	});

	return (
		<PrimeBreadCrumb
			className="mb-2"
			home={home}
			model={model}
		/>
	);
}

export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { id } = loaderArgs.params;
		const { request } = loaderArgs;
		if (!id) {
			throw new Response("Missing item ID", { status: 400 });
		}

		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const item = await DivisionRepository.getById(id, countryAccountsId);

		if (!item) {
			throw new Response("Item not found", { status: 404 });
		}

		let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
		if (item.parentId) {
			const allRows = (await DivisionRepository.getByCountryAccountsId(
				countryAccountsId,
			)) as DivisionBreadcrumbSourceRow[];
			breadcrumbs = buildDivisionBreadcrumbRows(allRows, item.parentId);
		}

		return {
			division: item,
			breadcrumbs: breadcrumbs,
		};
	},
);

type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;
interface CommonProps {
	loaderData: LoaderData;
}

function Common({ loaderData }: CommonProps) {
	const ctx = new ViewContext();

	const { division, breadcrumbs } = loaderData;
	const names = Object.entries(division.name || {}).map(([lang, name]) => ({
		lang,
		name: name || "N/A",
	}));

	return (
		<Card>
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h1 className="m-0">
						{ctx.t({
							code: "geographies.division_details",
							msg: "Division details",
						})}
					</h1>
					<div className="flex items-center gap-2">
						<LangLink
							lang={ctx.lang}
							to={`/settings/geography${division.parentId ? "?parent=" + division.parentId + "&view=table" : "?view=table"}`}
						>
							<Button
								icon="pi pi-arrow-left"
								label={ctx.t({ code: "common.back_to_list", msg: "Back to list" })}
								outlined
								size="small"
							/>
						</LangLink>
						<LangLink lang={ctx.lang} to={`/settings/geography/edit/${division.id}`}>
							<Button
								icon="pi pi-pencil"
								label={ctx.t({ code: "common.edit", msg: "Edit" })}
								size="small"
							/>
						</LangLink>
					</div>
				</div>

				<Breadcrumb ctx={ctx} rows={breadcrumbs} linkLast={true} />

				<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
					<div>
						<strong>{ctx.t({ code: "common.id", msg: "ID" })}:</strong> {division.id}
					</div>
					<div>
						<strong>
							{ctx.t({
								code: "common.parent_id",
								desc: "ID of the parent node in a hierarchical structure.",
								msg: "Parent ID",
							})}
							:
						</strong>{" "}
						{division.parentId || "-"}
					</div>
				</div>

				<h2 className="m-0">{ctx.t({ code: "common.names", msg: "Names" })}</h2>
				<DataTable value={names} size="small" stripedRows className="w-full">
					<Column header="Language" field="lang" />
					<Column header={ctx.t({ code: "common.name", msg: "Name" })} field="name" />
				</DataTable>
			</div>
		</Card>
	);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	// only render in the browser, not server
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<MainContainer
			title={ctx.t({
				code: "geographies.geographic_levels",
				msg: "Geographic levels",
			})}
			headerExtra={<NavSettings ctx={ctx} userRole={ctx.user?.role} />}
		>
			<Common loaderData={loaderData} />
			{isClient &&
				(loaderData.division.geojson ? (
					<DTSMap geoData={loaderData.division.geojson} />
				) : (
					<Message
						severity="info"
						text={ctx.t({
							code: "geographies.no_geodata_for_division",
							msg: "No geodata for this division",
						})}
					/>
				))}
		</MainContainer>
	);
}
