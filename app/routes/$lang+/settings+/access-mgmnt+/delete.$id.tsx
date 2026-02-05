import {
	authActionWithPerm,
} from "~/utils/auth";
import { getCountryAccountsIdFromSession, redirectWithMessage } from "~/utils/session";
import { deleteUserCountryAccountsByUserIdAndCountryAccountsId, getUserCountryAccountsByUserIdAndCountryAccountsId } from "~/db/queries/userCountryAccounts";
import { BackendContext } from "~/backend.server/context";

export const action = authActionWithPerm("EditUsers", async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request, params } = actionArgs;
	const { id } = params;

	if (!id) {
		return Response.json(
			{ ok: false, error: "Missing user ID" },
			{ status: 400 }
		);
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		return Response.json(
			{ ok: false, error: "Unauthorized – no tenant context" },
			{ status: 401 }
		);
	}

	const userToDelete = await getUserCountryAccountsByUserIdAndCountryAccountsId(id, countryAccountsId);

	if (!userToDelete) {
		return Response.json(
			{ ok: false, error: "User not found or you don't have permission to delete this user." },
			{ status: 404 }
		);
	}

	if (userToDelete.user_country_accounts.isPrimaryAdmin) {
		return Response.json(
			{ ok: false, error: "You cannot delete the primary admin user." },
			{ status: 403 }
		);
	}

	try {
		await deleteUserCountryAccountsByUserIdAndCountryAccountsId(id, countryAccountsId);

		return redirectWithMessage(
			actionArgs,
			"/settings/access-mgmnt/",
			{
				type: "info",
				text: ctx.t({
					"code": "common.user_deleted_successfully",
					"msg": "User deleted successfully."
				})
			}
		);

	} catch (err) {
		console.error("Delete user error:", err);
		return Response.json(
			{ ok: false, error: "Failed to delete user. Please try again." },
			{ status: 500 }
		);
	}
})
