import { assetTable, sectorTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import {
	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";

import { and, asc, or, ilike, sql, eq } from "drizzle-orm";

import { LoaderFunctionArgs } from "@remix-run/node";
import { stringToBoolean } from "~/util/string";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { getCommonData } from "./commondata";
import { BackendContext } from "../context";

interface assetLoaderArgs {
	loaderArgs: LoaderFunctionArgs;
}

export async function assetLoader(args: assetLoaderArgs) {
	const { loaderArgs } = args;
	const ctx = new BackendContext(loaderArgs);
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	let instanceName = "DELTA Resilience";

	if (countryAccountsId) {
		const settings = await getCountrySettingsFromSession(request);
		instanceName = settings.websiteName;
	}

	const url = new URL(request.url);
	const extraParams = ["search", "builtIn"];
	const rawBuiltIn = url.searchParams.get("builtIn");

	const filters: {
		search: string;
		builtIn?: boolean;
	} = {
		search: url.searchParams.get("search") || "",
		builtIn:
			rawBuiltIn === "" || rawBuiltIn == null
				? undefined
				: stringToBoolean(rawBuiltIn),
	};

	filters.search = filters.search.trim();
	let searchIlike = "%" + filters.search + "%";

	// Build tenant filter based on builtIn selection
	let tenantCondition;
	if (filters.builtIn === true) {
		// Show only built-in assets
		tenantCondition = eq(assetTable.isBuiltIn, true);
	} else if (filters.builtIn === false) {
		// Show only custom (instance-owned) assets
		tenantCondition = and(
			eq(assetTable.countryAccountsId, countryAccountsId),
			eq(assetTable.isBuiltIn, false)
		);
	} else {
		// Show ALL assets: both built-in AND instance-owned
		tenantCondition = or(
			eq(assetTable.isBuiltIn, true),
			eq(assetTable.countryAccountsId, countryAccountsId)
		);
	}

	// Build search condition
	let searchCondition =
		filters.search !== ""
			? or(
				sql`${assetTable.id}::text ILIKE ${searchIlike}`,
				ilike(assetTable.nationalId, searchIlike),
				ilike(assetTable.name, searchIlike),
				ilike(assetTable.category, searchIlike),
				ilike(assetTable.notes, searchIlike),
				ilike(assetTable.sectorIds, searchIlike)
			)
			: undefined;

	// Combine conditions
	let condition = and(tenantCondition, searchCondition);

	const count = await dr.$count(assetTable, condition);
	const events = async (offsetLimit: OffsetLimit) => {
		return await dr.query.assetTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				name: true,
				sectorIds: true,
				isBuiltIn: true,
			},
			extras: {
				// just a placeholder for translated names, so we can use the type of this query result
				sectorNames: sql<string>`NULL`.as("sector_names"),
				sectorData: sql<JSON>`
    (SELECT json_agg(json_build_object('id', s.id, 'name', s.sectorname))
     FROM ${sectorTable} s
     WHERE s.id = ANY(string_to_array(${assetTable.sectorIds}, ',')::uuid[]))
  `.as("sector_data"),
			},
			orderBy: [asc(assetTable.name)],
			where: condition,
		});
	};

	// TODO: TRANSLATE: BUG: the order of items is based on english names not translated names
	const res = await executeQueryForPagination3(
		request,
		count,
		events,
		extraParams
	);

	// Translate sector names and rebuild display string
	for (const item of res.items) {
		if (!item.sectorData) continue;

		const sectorList = Array.isArray(item.sectorData) ? item.sectorData : [];
		const translatedNames: string[] = [];

		for (const sector of sectorList) {
			const sectorId = String(sector.id);
			const sectorName = String(sector.name);

			translatedNames.push(
				ctx.dbt({
					type: "sector.name",
					id: sectorId,
					msg: sectorName,
				})
			);
		}

		item.sectorNames = translatedNames.join(", ");
	}

	// Translate only built-in assets
	for (const item of res.items) {
		if (item.isBuiltIn) {
			item.name = ctx.dbt({
				type: "asset.name",
				id: String(item.id),
				msg: item.name,
			});
		}
	}

	return {
		common: await getCommonData(args.loaderArgs),
		filters,
		data: res,
		instanceName,
	};
}

/**
 * Checks if a given asset (by asset ID) belongs to a specific sector within a country account.
 *
 * This function queries the asset table for a record matching the provided asset ID and country account ID,
 * and verifies if the given sectorId is present in the asset's sectorIds (comma-separated UUIDs).
 *
 * @param id - The asset's unique identifier (UUID)
 * @param sectorId - The sector's unique identifier (UUID) to check for membership
 * @param countryAccountsId - The country account's unique identifier (UUID)
 * @returns Promise<boolean> - True if the asset is in the sector, false otherwise
 */
export async function isAssetInSectorByAssetId(
	id: string,
	sectorId: string,
	countryAccountsId: string
): Promise<boolean> {
	let assetSectorChildren: string[] = [];
	const assetSectorIds = await dr.query.assetTable.findFirst({
		where: or(
			and(
				eq(assetTable.id, id),
				eq(assetTable.isBuiltIn, true),
			),
			and(
				eq(assetTable.id, id),
				eq(assetTable.isBuiltIn, false),
				eq(assetTable.countryAccountsId, countryAccountsId),
			)
		),
		columns: {
			sectorIds: true,
		},
	});

	if (assetSectorIds) {
		const sectorIdsArray = assetSectorIds.sectorIds.split(',');
		for (const itemSectorId of sectorIdsArray) {
			const children = await dr.select(
				{
					id: sectorTable.id,
					name: sectorTable.sectorname,
					childrenSectorIds: sql`(
						SELECT array_to_string(
						dts_get_sector_children_idonly(${sectorTable.id}), ',')
					)`.as('childrenSectorIds'),
				}
			).from(sectorTable).where(
				eq(sectorTable.id, itemSectorId)
			);
			if (children.length > 0) {
				const xValue = children[0].childrenSectorIds as string;
				assetSectorChildren = [...assetSectorChildren.concat(xValue.split(','))];
			}
		}

		if (assetSectorChildren.includes(sectorId)) {
			return true;
		}
	}

	return false;
}
