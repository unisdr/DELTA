import { HazardousEventView } from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { hazardousEventById } from "~/backend.server/models/event";
import { getTableName } from "drizzle-orm";
import { hazardousEventTable } from "~/drizzle/schema";
import { LoaderFunctionArgs } from "@remix-run/node";
import { optionalUser } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { useLoaderData } from "@remix-run/react";
import { ViewContext } from "~/frontend/context";
import { CommonData, getCommonData } from "~/backend.server/handlers/commondata";

interface LoaderData extends CommonData {
	item: any;
	isPublic: boolean;
	auditLogs?: any[];
}

export const loader = async (loaderArgs: LoaderFunctionArgs): Promise<LoaderData> => {
	const { request, params, context } = loaderArgs;

	const { id } = params;

	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}
	
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	
	const userSession = await optionalUser(loaderArgs);
	const loaderFunction = userSession ? 
	createViewLoaderPublicApprovedWithAuditLog({
		getById: hazardousEventById,
		recordId: id,
		tableName: getTableName(hazardousEventTable),
	}) :
	createViewLoaderPublicApproved({
		getById: hazardousEventById,
	});
	
	const result = await loaderFunction({request, params, context});
	if(result.item.countryAccountsId!== countryAccountsId){
		throw new Response("Unauthorized access", { status: 401 });
	}

	return {
		common: await getCommonData(loaderArgs),
		...result
	};
};

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	return (
		<ViewScreenPublicApproved
			loaderData={ld}
			ctx={ctx}
			viewComponent={HazardousEventView}
		/>
	);
}
