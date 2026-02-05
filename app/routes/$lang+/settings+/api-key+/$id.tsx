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
} from "~/utils/auth";

import {
	getItem2,
} from "~/backend.server/handlers/view";
import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";

import { useLoaderData } from "react-router";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderWithPerm("EditAPIKeys", async (args) => {
	const ctx = new BackendContext(args);
	const { params, request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request)

	const item = await getItem2(ctx, params, apiKeyById);
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

		item: enhancedItem
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw new Error("no item")
	}
	const ctx = new ViewContext();
	return ApiKeyView({
		ctx,
		item: ld.item,
	});
}

