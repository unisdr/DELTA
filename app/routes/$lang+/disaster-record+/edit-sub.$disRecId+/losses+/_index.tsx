import { useLoaderData } from "@remix-run/react";

import { lossesTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { sql, and, desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { route2 } from "~/frontend/losses";
import { authLoaderWithPerm } from "~/util/auth";
import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";
import { getSectorFullPathById } from "~/backend.server/models/sector";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";
import { BackendContext } from "~/backend.server/context";
import { sectorTable } from "~/drizzle/schema";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);

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
		return dr.query.lossesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
			},
			with: {
				sector: {
					columns: { id: true },
					extras: {
						name: sql<string>`${sectorTable.name}->>${ctx.lang}`.as('name'),
					},
				},
			},
			where: and(
				eq(lossesTable.sectorId, sectorId),
				eq(lossesTable.recordId, recordId)
			),
			orderBy: [desc(lossesTable.id)],
		});
	};

	let countFetcher = async () => {
		return dr.$count(
			lossesTable,
			and(
				eq(lossesTable.sectorId, sectorId),
				eq(lossesTable.recordId, recordId)
			)
		);
	};

	const count = await countFetcher();

	const res = await executeQueryForPagination3(request, count, dataFetcher, [
		"sectorId",
	]);

	const sectorFullPath = (await getSectorFullPathById(ctx, sectorId)) as string;

	return {
		data: res,
		recordId,
		sectorId,
		sectorFullPath,
		instanceName
	};
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	const { items, pagination } = ld.data;

	return DataScreen({
		ctx,
		headerElement: (
			<LangLink lang={ctx.lang} to={"/disaster-record/edit/" + ld.recordId}>
				{ctx.t({ "code": "disaster_records.back_to_disaster_record", "msg": "Back to disaster record" })}
			</LangLink>
		),
		title: ctx.t({
			"code": "disaster_records.losses.sector_effects",
			"msg": "Losses: Sector effects: {sectorFullPath}"
		}, {
			sectorFullPath: ld.sectorFullPath
		}),
		addNewLabel: ctx.t({ "code": "disaster_records.losses.add_new", "msg": "Add new losses" }),
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			ctx.t({ "code": "common.id", "msg": "ID" }),
			ctx.t({ "code": "disaster_records.disaster_record_id", "msg": "Disaster record ID" }),
			ctx.t({ "code": "common.sector", "msg": "Sector" }),
			ctx.t({ "code": "common.actions", "msg": "Actions" })
		],
		listName: "losses",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		hideLegends: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>{item.id.slice(0, 8)}</LangLink>
				</td>
				<td>{item.recordId.slice(0, 8)}</td>
				<td>{item.sector.name}</td>
				<td className="dts-table__actions">
					<ActionLinks ctx={ctx} route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
