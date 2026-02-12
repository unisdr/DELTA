import { DisasterRecordsView } from "~/frontend/disaster-record/form";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import {
	disasterRecordsById,
} from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import { getTableName } from "drizzle-orm";

import { dr } from "~/db.server";
import { contentPickerConfig } from "./content-picker-config";
import { sql, eq } from "drizzle-orm";
import { optionalUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { useLoaderData } from "react-router";
import { ViewContext } from "~/frontend/context";

import { LoaderFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request, params } = args;
	const ctx = new BackendContext(args);
	const { id } = params;
	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const userSession = await optionalUser(args);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	// Create a wrapper function that includes tenant context
	const getByIdWithTenant = async (_ctx: BackendContext, idStr: string) => {
		return disasterRecordsById(idStr);
	};

	const loaderFunction = userSession
		? createViewLoaderPublicApprovedWithAuditLog({
			getById: getByIdWithTenant,
			recordId: id,
			tableName: getTableName(disasterRecordsTable),
		})
		: createViewLoaderPublicApproved({
			getById: getByIdWithTenant,
		});

	const result = await loaderFunction(args);
	if (result.item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	const cpDisplayName =
		(await contentPickerConfig(ctx).selectedDisplay(
			ctx,
			dr,
			result.item.disasterEventId
		)) ?? "";

	const disasterId = id;
	const disasterRecord = await dr
		.select({
			disaster_id: disasterRecordsTable.id,
			disaster_spatial_footprint: disasterRecordsTable.spatialFootprint,
			disruptions: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${disruptionTable.id},
              'spatial_footprint', ${disruptionTable.spatialFootprint}
            )
          ) FILTER (WHERE ${disruptionTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("disruptions"),
			losses: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${lossesTable.id},
              'spatial_footprint', ${lossesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${lossesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("losses"),
			damages: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${damagesTable.id},
              'spatial_footprint', ${damagesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${damagesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("damages"),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			disruptionTable,
			eq(disasterRecordsTable.id, disruptionTable.recordId)
		)
		.leftJoin(lossesTable, eq(disasterRecordsTable.id, lossesTable.recordId))
		.leftJoin(damagesTable, eq(disasterRecordsTable.id, damagesTable.recordId))
		.where(eq(disasterRecordsTable.id, disasterId))
		.groupBy(disasterRecordsTable.id, disasterRecordsTable.spatialFootprint);

	const extendedItem = { ...result.item, cpDisplayName, disasterRecord };

	return {
		...result,

		item: extendedItem
	};
};

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	return (
		<>
			<ViewScreenPublicApproved
				loaderData={ld}
				ctx={ctx}
				viewComponent={DisasterRecordsView} />
		</>
	);
}
