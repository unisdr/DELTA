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

import {
	authActionGetAuth,
	authActionWithPerm,
} from "~/util/auth";
import { updateHazardousEventStatus } from "~/services/hazardousEventService";
import { emailValidationWorkflowStatusChangeNotifications } from "~/backend.server/services/emailValidationWorkflowService";
import { saveValidationWorkflowRejectionComments } from "~/services/validationWorkflowRejectionService";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";

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

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userSession = authActionGetAuth(actionArgs);
	const formData = await request.formData();
	
	const rejectionComments = formData.get('rejection-comments');
	const actionType = String(formData.get("action") || "");
   	const id = String(formData.get("id") || "");
	const ctx = new BackendContext(actionArgs);

	// Basic validation
	if (!id || request.url.indexOf(id) === -1) {
		return Response.json({ ok: false, message: 
			ctx.t({
				code: "common.invalid_id_provided",
				msg: "Invalid ID provided."
			})
		});
	}

	// Business rules: map action -> status
	const actionStatusMap: Record<string, string> = {
		"submit-validate": "validated",
		"submit-publish": "published",
		"submit-reject": "needs-revision",
	};

	const newStatus = actionStatusMap[actionType] as approvalStatusIds;
	if (!newStatus) {
		return { ok: false, message: 
			ctx.t({
				code: "common.invalid_action_provided",
				msg: "Invalid action provided."
			})
		};
	}

	// Delegate to service
  	let result = await updateHazardousEventStatus({ 
		ctx: ctx,
		id: id,  approvalStatus: newStatus, countryAccountsId: countryAccountsId 
	});

	if (result.ok && newStatus === 'needs-revision') {
		// Delegate to service to handle save rejection comments to DB
		result = await saveValidationWorkflowRejectionComments({
			ctx: ctx,
			approvalStatus: newStatus,
			recordId: id,
			recordType: 'hazardous_event',
			rejectedByUserId: userSession?.user.id,
			rejectionMessage: rejectionComments ? String(rejectionComments) : "",
		});
	}
	
	if (result.ok) {
		// Delegate to service to send email notification
		try {
			await emailValidationWorkflowStatusChangeNotifications({
				ctx: ctx,
				recordId: id,
				recordType: 'hazardous_event',
				newStatus,
				rejectionComments: rejectionComments ? String(rejectionComments) : undefined,
			});
		} catch (err) {
			console.error('Failed to send status change email notifications:', err);
		}
	}

	return Response.json(result);
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	return (
		<ViewScreenPublicApproved
			loaderData={ld as any}
			ctx={ctx}
			viewComponent={HazardousEventView}
		/>
	);
}
