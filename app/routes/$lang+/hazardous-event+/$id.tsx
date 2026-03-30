import { HazardousEventView } from "~/frontend/events/hazardeventform";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { hazardousEventById } from "~/backend.server/models/event";
import { getTableName } from "drizzle-orm";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { LoaderFunctionArgs } from "react-router";
import { optionalUser } from "~/utils/auth";
import { getCountryAccountsIdFromSession, getUserIdFromSession } from "~/utils/session";
import { useLoaderData } from "react-router";
import { ViewContext } from "~/frontend/context";

import { authActionGetAuth, authActionWithPerm } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";
import { processApprovalStatusActionService } from "~/services/approvalStatusWorkflowService";
import { getReturnAssigneeUsers } from "~/db/queries/userCountryAccountsRepository";

interface LoaderData {
	item: any;
	isPublic: boolean;
	auditLogs?: any[];
}

export const loader = async (
	loaderArgs: LoaderFunctionArgs,
): Promise<LoaderData> => {
	const { request, params } = loaderArgs;

	const { id } = params;

	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const userSession = await optionalUser(loaderArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userId = userSession ? await getUserIdFromSession(request) : null;
	const loaderFunction = userSession
		? createViewLoaderPublicApprovedWithAuditLog({
				getById: hazardousEventById,
				recordId: id,
				tableName: getTableName(hazardousEventTable),
			})
		: createViewLoaderPublicApproved({
				getById: hazardousEventById,
			});

	const result = await loaderFunction(loaderArgs);
	if (result.item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}

	const returnAssignees =
		userSession && countryAccountsId
			? (
					await getReturnAssigneeUsers(countryAccountsId, userId)
				).map((user) => ({
					label: `${user.firstName} ${user.lastName}`.trim(),
					value: user.id,
				}))
			: [];

	return {
		...result,
		item: {
			...result.item,
			returnAssignees,
		},
	};
};

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userSession = authActionGetAuth(actionArgs);
	const formData = await request.formData();
	const ctx = new BackendContext(actionArgs);

	const result = await processApprovalStatusActionService({
		ctx,
		request,
		formData,
		countryAccountsId,
		userId: userSession.user.id,
		recordType: "hazardous_event"
	});

	return Response.json(result);
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	return (
		<ViewScreenPublicApproved
			loaderData={ld as any}
			ctx={ctx}
			viewComponent={HazardousEventView}
		/>
	);
}
