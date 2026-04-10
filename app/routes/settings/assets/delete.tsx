import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
	useActionData,
	useLoaderData,
	useNavigate,
	useNavigation,
} from "react-router";

import { PERMISSIONS } from "~/frontend/user/roles";
import { authActionWithPerm, requirePermission } from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	redirectWithMessage,
} from "~/utils/session";
import {
	makeDeleteAssetUseCase,
	makeGetAssetByIdUseCase,
} from "~/modules/assets/assets-module.server";
import { ASSETS_ROUTE } from "~/modules/assets/presentation/asset-form";

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requirePermission(request, PERMISSIONS.ASSETS_DELETE);
	const id = params.id ?? "";
	const item = await makeGetAssetByIdUseCase().execute({ id });
	if (!item) {
		throw new Response("Asset not found", { status: 404 });
	}
	return { item };
}

export const action = authActionWithPerm(
	PERMISSIONS.ASSETS_DELETE,
	async (args: ActionFunctionArgs) => {
		const id = args.params.id ?? "";
		const countryAccountsId = await getCountryAccountsIdFromSession(
			args.request,
		);

		const result = await makeDeleteAssetUseCase().execute({
			id,
			countryAccountsId,
		});

		if (!result.ok) {
			return { error: result.error };
		}

		return redirectWithMessage(args, ASSETS_ROUTE, {
			type: "success",
			text: "Asset deleted",
		});
	},
);

export default function AssetDeletePage() {
	const ld = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>() as
		| { error?: string }
		| undefined;
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<div className="p-4">
			<h2 className="text-lg font-semibold mb-4">
				{"Delete asset"}: {ld.item.name}
			</h2>
			{actionData?.error && (
				<p className="text-red-600 mb-4">{actionData.error}</p>
			)}
			<form method="post">
				<p className="mb-4">
					{"Are you sure you want to delete this asset? This action cannot be undone."}
				</p>
				<div className="flex gap-3">
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => navigate(ASSETS_ROUTE)}
						disabled={isSubmitting}
					>
						{"Cancel"}
					</button>
					<button
						type="submit"
						className="btn btn-danger"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Deleting..." : "Delete"}
					</button>
				</div>
			</form>
		</div>
	);
}
