import { useLoaderData } from "react-router";

import { damagesTable } from "~/drizzle/schema/damagesTable";

import { dr } from "~/db.server";

import { sql, and, desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { route2 } from "~/frontend/damages";
import { authLoaderWithPerm } from "~/utils/auth";
import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";
import { getSectorFullPathById } from "~/backend.server/models/sector";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";


import { LangLink } from "~/utils/link";

import { sectorTable } from "~/drizzle/schema/sectorTable";
import { assetTable } from "~/drizzle/schema/assetTable";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	let ctx = { t: (message: any) => message.msg, lang: "en", url: (p: string) => p, fullUrl: (p: string) => p, rootUrl: () => "/" };

	let { params, request } = loaderArgs;
	let recordId = params.disRecId;
	if (!recordId) {
		throw new Error("Route does not have disRecId param");
	}
	let url = new URL(request.url);
	let sectorId = url.searchParams.get("sectorId") || "";
	if (!sectorId) {
		console.log("sectorId was not provided in the url");
		throw new Response("Not Found", { status: 404 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "DELTA Resilience";
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}

	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.damagesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
			},
			with: {
				asset: {
					columns: { id: true },
					extras: {
						name: sql<string>`
        CASE
					WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${ctx.lang})
          ELSE ${assetTable.customName}
        END
      `.as("name"),
					},
				},
				sector: {
					columns: { id: true },
					extras: {
						name: sql<string>`dts_jsonb_localized(${sectorTable.name}, ${ctx.lang})`.as(
							"name",
						),
					},
				},
			},
			where: and(
				eq(damagesTable.sectorId, sectorId),
				eq(damagesTable.recordId, recordId!),
			),
			orderBy: [desc(damagesTable.id)],
		});
	};

	let countFetcher = async () => {
		return dr.$count(
			damagesTable,
			and(
				eq(damagesTable.sectorId, sectorId),
				eq(damagesTable.recordId, recordId!),
			),
		);
	};

	const count = await countFetcher();

	const res = await executeQueryForPagination3(request, count, dataFetcher, [
		"sectorId",
	]);

	const sectorFullPath = (await getSectorFullPathById(sectorId)) as string;

	return {
		data: res,
		recordId,
		sectorId,
		sectorFullPath,
		instanceName,
	};
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();


	const { items, pagination } = ld.data;

	return DataScreen({
		headerElement: (
			<LangLink lang="en" to={"/disaster-record/edit/" + ld.recordId}>
				{"Back to disaster record"}
			</LangLink>
		),
		title: "Damages: Sector effects: {path}",
		addNewLabel: "Add new damage",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			"ID",
			"Asset",
			"Sector",
			"Actions",
		],
		listName: "damages",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		hideLegends: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<LangLink lang="en" to={`${route}/${item.id}`}>
						{item.id.slice(0, 8)}
					</LangLink>
				</td>
				<td>{item.asset.name}</td>
				<td>{item.sector.name}</td>
				<td className="dts-table__actions">
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
