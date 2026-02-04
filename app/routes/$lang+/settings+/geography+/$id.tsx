
import {
	authLoaderWithPerm
} from "~/util/auth";

import { divisionTable } from "~/drizzle/schema";

import { useLoaderData } from "react-router";

import { dr } from "~/db.server";

import {
	eq,
	and
} from "drizzle-orm";

import { Breadcrumb } from "~/frontend/division";

import { divisionBreadcrumb, DivisionBreadcrumbRow } from "~/backend.server/models/division";

import { useState, useEffect } from "react";

import DTSMap from "~/frontend/dtsmap/dtsmap";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";


export const loader = authLoaderWithPerm("ManageCountrySettings", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	const { request } = loaderArgs;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const res = await dr.select().from(divisionTable).where(
		and(
			eq(divisionTable.id, id),
			eq(divisionTable.countryAccountsId, countryAccountsId)
		)
	);

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];
	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (item.parentId) {
		breadcrumbs = await divisionBreadcrumb(["en"], item.parentId, countryAccountsId)
	}

	return {

		division: item,
		breadcrumbs: breadcrumbs,
	};

});

type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;
interface CommonProps {
	loaderData: LoaderData
}


function Common({ loaderData }: CommonProps) {
	const ctx = new ViewContext();

	const { division, breadcrumbs } = loaderData
	return (
		<>
			<h1>
				{ctx.t({
					"code": "geographies.division_details",
					"msg": "Division details"
				})}
			</h1>
			<LangLink lang={ctx.lang} to={`/settings/geography/edit/${division.id}`}>
				{ctx.t({
					"code": "common.edit",
					"msg": "Edit"
				})}
			</LangLink>
			<p>{ctx.t({ "code": "common.id", "msg": "ID" })}: {division.id}</p>
			<Breadcrumb ctx={ctx} rows={breadcrumbs} linkLast={true} />
			<p>{ctx.t({ "code": "common.parent_id", "desc": "ID of the parent node in a hierarchical structure.", "msg": "Parent ID" })}: {division.parentId || "-"}</p>
			<h2>{ctx.t({ "code": "common.names", "msg": "Names" })}:</h2>
			<ul>
				{Object.entries(division.name).map(([lang, name]) => (
					<li key={lang}>
						<strong>{lang}:</strong> {name || "N/A"}
					</li>
				))}
			</ul>
		</>
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
			title={ctx.t({ "code": "geographies.geographic_levels", "msg": "Geographic levels" })}
			headerExtra={<NavSettings ctx={ctx} />}
		>
			<Common loaderData={loaderData} />
			{isClient && (
				loaderData.division.geojson ? (
					<DTSMap geoData={loaderData.division.geojson} />
				) : (
					<p>{ctx.t({ "code": "geographies.no_geodata_for_division", "msg": "No geodata for this division" })}</p>
				)
			)}
		</MainContainer>
	);
}
