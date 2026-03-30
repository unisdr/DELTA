import { DisasterRecordsView } from "~/frontend/disaster-record/form";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { disasterRecordsById } from "~/backend.server/models/disaster_record";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import { getTableName } from "drizzle-orm";

import { dr } from "~/db.server";
import { contentPickerConfig } from "./content-picker-config";
import { sql, eq } from "drizzle-orm";
import {
	authActionGetAuth,
	authActionWithPerm,
	optionalUser,
} from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { getUserIdFromSession } from "~/utils/session";
import { useLoaderData } from "react-router";
import { ViewContext } from "~/frontend/context";

import { LoaderFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";
import { processApprovalStatusActionService } from "~/services/approvalStatusWorkflowService";
import { getReturnAssigneeUsers } from "~/db/queries/userCountryAccountsRepository";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request, params } = args;
	const ctx = new BackendContext(args);
	const { id } = params;
	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const userSession = await optionalUser(args);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userId = userSession ? await getUserIdFromSession(request) : null;
	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	// Create a wrapper function that includes tenant context
	const getByIdWithTenant = async (_ctx: BackendContext, idStr: string) => {
		return disasterRecordsById(idStr, countryAccountsId);
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
			result.item.disasterEventId,
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
			eq(disasterRecordsTable.id, disruptionTable.recordId),
		)
		.leftJoin(lossesTable, eq(disasterRecordsTable.id, lossesTable.recordId))
		.leftJoin(damagesTable, eq(disasterRecordsTable.id, damagesTable.recordId))
		.where(eq(disasterRecordsTable.id, disasterId))
		.groupBy(disasterRecordsTable.id, disasterRecordsTable.spatialFootprint);

	const returnAssignees = userSession
		? (await getReturnAssigneeUsers(countryAccountsId, userId)).map((user) => ({
				label: `${user.firstName} ${user.lastName}`.trim(),
				value: user.id,
		  }))
		: [];

	const extendedItem = {
		...result.item,
		cpDisplayName,
		disasterRecord,
		returnAssignees,
	};

	return {
		...result,

		item: extendedItem,
	};
};

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userSession = authActionGetAuth(actionArgs);
	const formData = await request.formData();

	const result = await processApprovalStatusActionService({
		ctx,
		request,
		formData,
		countryAccountsId,
		userId: userSession.user.id,
		recordType: "disaster_records"
	});

	return Response.json(result);
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	return (
		<>
			<ViewScreenPublicApproved
				loaderData={ld}
				ctx={ctx}
				viewComponent={DisasterRecordsView}
			/>
		</>
	);
}
