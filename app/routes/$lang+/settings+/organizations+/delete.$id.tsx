import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";

import { BackendContext } from "~/backend.server/context";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { OrganizationService } from "~/services/organizationService";
import { authActionWithPerm, authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, redirectWithMessage } from "~/utils/session";
import { ViewContext } from "~/frontend/context";

export const loader = authLoaderPublicOrWithPerm(
	"ManageOrganizations",
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const countryAccountsId = (await getCountryAccountsIdFromSession(request))!;
		const selectedOrganization =
			(await OrganizationRepository.getByIdAndCountryAccountsId(
				loaderArgs.params.id!,
				countryAccountsId,
			)) ?? null;

		if (!selectedOrganization) {
			throw new Response("Not Found", { status: 404 });
		}

		return { selectedOrganization };
	},
);

export const action = authActionWithPerm("ManageOrganizations", async (args) => {
	const { request } = args;
	const formData = await request.formData();
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const backendCtx = new BackendContext(args);

	formData.set("intent", "delete");
	if (args.params.id) {
		formData.set("id", args.params.id);
	}

	const result = await OrganizationService.organizationAction({
		backendCtx,
		countryAccountsId,
		formData,
	});

	if (result.ok) {
		return redirectWithMessage(args, "/settings/organizations", {
			type: "success",
			text: backendCtx.t({ code: "common.record_deleted", msg: "Record deleted" }),
		});
	}

	return result;
});

export default function OrganizationsDeletePage() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const selectedItem = ld.selectedOrganization;
	const toast = useRef<Toast>(null);
	const [dialogVisible, setDialogVisible] = useState(true);

	useEffect(() => {
		if (actionData && !actionData.ok) {
			toast.current?.show({
				severity: "error",
				summary: ctx.t({ code: "common.error", msg: "Error" }),
				detail: actionData.error,
				life: 6000,
			});
		}
	}, [actionData]);

	return (
		<>
			<Toast ref={toast} />
			<Dialog
				header={ctx.t({ code: "common.record_deletion", msg: "Record Deletion" })}
				visible={dialogVisible}
				modal
				onHide={() => navigate(ctx.url("/settings/organizations/"))}
				className="w-[30rem] max-w-full"
			>
				<Form method="post" onSubmit={() => setDialogVisible(false)}>
					<p>
						{ctx.t({
							code: "common.confirm_deletion",
							msg: "Please confirm deletion.",
						})}
					</p>
					{selectedItem?.name ? <p>{selectedItem.name}</p> : null}
					<div className="mt-4 flex justify-end gap-2">
						<Button
							type="button"
							outlined
							label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
							onClick={() => navigate(ctx.url("/settings/organizations/"))}
						/>
						<Button
							type="submit"
							severity="danger"
							label={ctx.t({ code: "common.delete", msg: "Delete" })}
							icon="pi pi-trash"
							loading={isSubmitting}
							disabled={isSubmitting}
						/>
					</div>
				</Form>
			</Dialog>
		</>
	);
}