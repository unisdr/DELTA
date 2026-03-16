import { ActionFunctionArgs } from "react-router";

import { authActionWithPerm, authLoaderPublicOrWithPerm } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { OrganizationService } from "~/services/organizationService";

export const loader = authLoaderPublicOrWithPerm(
	"ManageOrganizations",
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const countryAccountsId = (await getCountryAccountsIdFromSession(request))!;
		const { filters, data } = await OrganizationService.getOrganizationsPageData({
			request,
			countryAccountsId,
		});

		return {
			common: await getCommonData(loaderArgs),
			filters,
			data,
		};
	},
);

export const action = authActionWithPerm(
	"ManageOrganizations",
	async (actionArgs: ActionFunctionArgs) => {
		const { request } = actionArgs;
		const formData = await request.formData();
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		const backendCtx = new BackendContext(actionArgs);

		return OrganizationService.organizationAction({
			backendCtx,
			countryAccountsId,
			formData,
		});
	},
);

export { default } from "~/pages/OrganizationManagementPage";
