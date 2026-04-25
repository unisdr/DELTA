import { useLoaderData } from "react-router";

import { makeListDisasterEventsUseCase } from "~/modules/disaster-event/disaster-event-module.server";
import DisasterEventsPage from "~/modules/disaster-event/presentation/disaster-events-page";
import { PERMISSIONS } from "~/frontend/user/roles";
import { configDisasterEventUiV2 } from "~/utils/config";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderPublicOrWithPerm(
    PERMISSIONS.DISASTER_EVENT_LIST,
    async ({ request }) => {
        const countryAccountsId = await getCountryAccountsIdFromSession(request);
        if (!countryAccountsId) {
            throw new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const pageRaw = parseInt(url.searchParams.get("page") || "1", 10);
        const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "25", 10);
        const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);
        const pageSize = Math.max(1, Number.isNaN(pageSizeRaw) ? 25 : pageSizeRaw);
        const search = (url.searchParams.get("search") || "").trim();
        const approvalStatus = (url.searchParams.get("approvalStatus") || "").trim();
        const fromDate = (url.searchParams.get("fromDate") || "").trim();
        const toDate = (url.searchParams.get("toDate") || "").trim();

        const result = await makeListDisasterEventsUseCase().execute({
            countryAccountsId,
            page,
            pageSize,
            search,
            approvalStatus,
            fromDate,
            toDate,
        });

        return {
            ...result,
            usePrimeUiV2: configDisasterEventUiV2(),
        };
    },
);

export default function DisasterEventIndexRoute() {
    const { data, filters, usePrimeUiV2 } = useLoaderData<typeof loader>();
    return (
        <DisasterEventsPage
            data={data}
            filters={filters}
            usePrimeUiV2={usePrimeUiV2}
        />
    );
}
