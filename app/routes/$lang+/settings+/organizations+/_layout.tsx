import { Outlet } from "react-router";

import { getCommonData } from "~/backend.server/handlers/commondata";
import OrganizationManagementPage from "~/pages/OrganizationManagementPage";
import { OrganizationService } from "~/services/organizationService";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

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

export default function OrganizationsLayoutPage() {
    return (
        <>
            <OrganizationManagementPage />
            <Outlet />
        </>
    );
}