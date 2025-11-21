import {
	apiKeyById,
	ApiSecurityAudit,
	TokenAssignmentParser
} from "~/backend.server/models/api_key";

import {
	ApiKeyView,
} from "~/frontend/api_key";

import {
	authLoaderGetAuth,
	authLoaderWithPerm,
} from "~/util/auth";

import {
	getItem2,
} from "~/backend.server/handlers/view";
import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { useLoaderData } from "@remix-run/react";

export const loader = authLoaderWithPerm("ViewData", async (args) => {
	const { params, request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request)

	const item = await getItem2(params, apiKeyById);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	if (item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
	}
	const auth = authLoaderGetAuth(args);
	if (item.managedByUserId != auth.user.id) {
		item.secret = "Secret is only visible to the user who owns this API key"
	}

	// Get token assignment and validation status
	const auditResult = await ApiSecurityAudit.auditSingleKeyEnhanced(item);
	const assignment = TokenAssignmentParser.getTokenAssignment(item);

	// Add status information to the item
	const enhancedItem = {
		...item,
		assignedUserId: assignment.assignedUserId,
		cleanName: assignment.cleanName,
		isActive: auditResult.issues.length === 0,
		tokenType: assignment.isUserAssigned ? 'user_assigned' : 'admin_managed',
		issues: auditResult.issues,
		assignedUserEmail: auditResult.assignedUserEmail
	};

	return {
		common: await getCommonData(args),
		item: enhancedItem
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw new Error("no item")
	}
	const ctx = new ViewContext(ld);
	return ApiKeyView({
		ctx,
		item: ld.item,
	});
}

