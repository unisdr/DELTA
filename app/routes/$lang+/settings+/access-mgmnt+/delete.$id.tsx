import { Form, MetaFunction, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	redirectWithMessage,
} from "~/utils/session";
import {
	deleteUserCountryAccountsByUserIdAndCountryAccountsId,
	getUserCountryAccountsByUserIdAndCountryAccountsId,
} from "~/db/queries/userCountryAccountsRepository";
import { BackendContext } from "~/backend.server/context";
import { UserRepository } from "~/db/queries/UserRepository";
import { ViewContext } from "~/frontend/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

type DeleteActionData = {
	ok: false;
	error: string;
};

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "settings.access_mgmnt.delete_user_title",
					msg: "Delete User",
				}),
			),
		},
	];
};

export const loader = authLoaderWithPerm("EditUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const { id } = params;

	if (!id) {
		throw new Response("Missing user ID", { status: 404 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userToDelete = await getUserCountryAccountsByUserIdAndCountryAccountsId(
		id,
		countryAccountsId,
	);

	if (!userToDelete) {
		throw new Response(
			"User not found or you don't have permission to delete this user.",
			{ status: 404 },
		);
	}

	const user = await UserRepository.getById(id);
	if (!user) {
		throw new Response(`User not found with id: ${id}`, { status: 404 });
	}

	return {
		id,
		name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
		email: user.email,
		isPrimaryAdmin: userToDelete.isPrimaryAdmin,
	};
});

export const action = authActionWithPerm("EditUsers", async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request, params } = actionArgs;
	const { id } = params;

	if (!id) {
		return Response.json(
			{ ok: false, error: "Missing user ID" },
			{ status: 400 },
		);
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		return Response.json(
			{ ok: false, error: "Unauthorized – no tenant context" },
			{ status: 401 },
		);
	}

	const userToDelete = await getUserCountryAccountsByUserIdAndCountryAccountsId(
		id,
		countryAccountsId,
	);

	if (!userToDelete) {
		return Response.json(
			{
				ok: false,
				error:
					"User not found or you don't have permission to delete this user.",
			},
			{ status: 404 },
		);
	}

	if (userToDelete.isPrimaryAdmin) {
		return Response.json(
			{ ok: false, error: "You cannot delete the primary admin user." },
			{ status: 403 },
		);
	}

	try {
		await deleteUserCountryAccountsByUserIdAndCountryAccountsId(
			id,
			countryAccountsId,
		);

		return redirectWithMessage(actionArgs, "/settings/access-mgmnt/", {
			type: "info",
			text: ctx.t({
				code: "common.user_deleted_successfully",
				msg: "User deleted successfully.",
			}),
		});
	} catch (err) {
		console.error("Delete user error:", err);
		return Response.json(
			{ ok: false, error: "Failed to delete user. Please try again." },
			{ status: 500 },
		);
	}
});

export default function DeleteUserDialog() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>() as DeleteActionData | undefined;
	const ctx = new ViewContext();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<Dialog
			visible
			modal
			header={ctx.t({
				code: "settings.access_mgmnt.delete_user_title",
				msg: "Are you sure you want to delete this user?",
			})}
			onHide={() => navigate(ctx.url("/settings/access-mgmnt/"))}
			className="w-[32rem] max-w-full"
		>
			<Form method="post" className="flex flex-col gap-4">
				<p>
					{ctx.t({
						code: "settings.access_mgmnt.delete_user_confirmation",
						msg: "This data cannot be recovered after being deleted.",
					})}
				</p>
				<p className="font-medium text-gray-900">{loaderData.name}</p>
				<p className="text-sm text-gray-600">{loaderData.email}</p>
				{actionData?.error ? (
					<p className="text-sm text-red-600">{actionData.error}</p>
				) : null}
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						outlined
						label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
						onClick={() => navigate(ctx.url("/settings/access-mgmnt/"))}
					/>
					<Button
						type="submit"
						severity="danger"
						label={ctx.t({
							code: "user.delete_user",
							msg: "Delete user",
						})}
						loading={isSubmitting}
						disabled={isSubmitting || loaderData.isPrimaryAdmin}
					/>
				</div>
			</Form>
		</Dialog>
	);
}
