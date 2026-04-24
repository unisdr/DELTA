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
import DeleteAssetDialog from "~/modules/assets/presentation/delete-asset-dialog";

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

		return redirectWithMessage(args, `/settings/assets`, {
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
		<DeleteAssetDialog
			name={ld.item.name}
			error={actionData?.error}
			isSubmitting={isSubmitting}
			onCancel={() => navigate(`/settings/assets`)}
		/>
	);
}
