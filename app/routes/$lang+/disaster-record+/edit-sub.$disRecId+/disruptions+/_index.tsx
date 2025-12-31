import { useLoaderData } from "@remix-run/react";

import { disruptionTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { and, desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { route2 } from "~/frontend/disruption";
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
		return dr.query.disruptionTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
				durationDays: true,
				durationHours: true,
				usersAffected: true,
				comment: true,
				responseOperation: true,
				responseCost: true,
				responseCurrency: true,
			},
			with: {
				sector: true,
			},
			where: and(
				eq(disruptionTable.sectorId, sectorId),
				eq(disruptionTable.recordId, recordId!)
			),
			orderBy: [desc(disruptionTable.durationDays)],
		});
	};

	let countFetcher = async () => {
		return dr.$count(
			disruptionTable,
			and(
				eq(disruptionTable.sectorId, sectorId),
				eq(disruptionTable.recordId, recordId!)
			)
		);
	};
	const count = await countFetcher();

	const res = await executeQueryForPagination3(request, count, dataFetcher, [
		"sectorId",
	]);

	for (const row of res.items) {
		if (row.sector) {
			row.sector.sectorname = ctx.dbt({
				type: "sector.name",
				id: row.sector.id,
				msg: row.sector.sectorname,
			});
		}
	}

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
		plural: ctx.t({ "code": "disaster_records.disruptions.sector_effects", "msg": "Disruptions: Sector effects: {sectorFullPath}" }, { sectorFullPath: ld.sectorFullPath }),
		resourceName: ctx.t({ "code": "disaster_records.disruption", "msg": "Disruption" }),
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			ctx.t({ "code": "common.id", "msg": "ID" }),
			ctx.t({ "code": "disaster_records.disaster_record_id", "msg": "Disaster record ID" }),
			ctx.t({ "code": "common.sector", "msg": "Sector" }),
			ctx.t({ "code": "disaster_records.disruption.duration_days", "msg": "Duration (days)" }),
			ctx.t({ "code": "disaster_records.disruption.duration_hours", "msg": "Duration (hours)" }),
			ctx.t({ "code": "disaster_records.disruption.users_affected", "msg": "Users affected" }),
			ctx.t({ "code": "disaster_records.disruption.comment", "msg": "Comment" }),
			ctx.t({ "code": "disaster_records.disruption.response_operation", "msg": "Response operation" }),
			ctx.t({ "code": "disaster_records.disruption.response_cost", "msg": "Response cost" }),
			ctx.t({ "code": "disaster_records.disruption.response_currency", "msg": "Response currency" }),
			ctx.t({ "code": "common.actions", "msg": "Actions" })
		],
		listName: "disruptions",
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
				<td>{item.sector.sectorname}</td>
				<td>{item.durationDays ?? "-"}</td>
				<td>{item.durationHours ?? "-"}</td>
				<td>{item.usersAffected ?? "-"}</td>
				<td>{item.comment ?? "-"}</td>
				<td>{item.responseOperation ?? "-"}</td>
				<td>{item.responseCost ?? "-"}</td>
				<td>{item.responseCurrency ?? "-"}</td>
				<td className="dts-table__actions">
					<ActionLinks ctx={ctx} route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
