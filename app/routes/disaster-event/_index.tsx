import { Outlet, useLoaderData } from "react-router";

import { makeListDisasterEventsUseCase } from "~/modules/disaster-event/disaster-event-module.server";
import DisasterEventsPage from "~/modules/disaster-event/presentation/disaster-events-page";
import { dr } from "~/db.server";
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
        const recordingInstitution = (url.searchParams.get("recordingInstitution") || "").trim();
        const hazardTypeId = (url.searchParams.get("hazardTypeId") || "").trim();
        const hazardClusterId = (url.searchParams.get("hazardClusterId") || "").trim();
        const hazardId = (url.searchParams.get("hazardId") || "").trim();
        const approvalStatus = (url.searchParams.get("approvalStatus") || "").trim();
        const fromDate = (url.searchParams.get("fromDate") || "").trim();
        const toDate = (url.searchParams.get("toDate") || "").trim();

        const [hipTypes, hipClusters, hipHazards] = await Promise.all([
            dr.query.hipTypeTable.findMany(),
            dr.query.hipClusterTable.findMany(),
            dr.query.hipHazardTable.findMany(),
        ]);

        const result = await makeListDisasterEventsUseCase().execute({
            countryAccountsId,
            page,
            pageSize,
            search,
            recordingInstitution,
            hazardTypeId,
            hazardClusterId,
            hazardId,
            approvalStatus,
            fromDate,
            toDate,
        });

        return {
            ...result,
            usePrimeUiV2: configDisasterEventUiV2(),
            hipTypes: hipTypes.map((t) => ({ id: t.id, name_en: t.name_en })),
            hipClusters: hipClusters.map((c) => ({ id: c.id, typeId: c.typeId, name_en: c.name_en })),
            hipHazards: hipHazards.map((h) => ({ id: h.id, clusterId: h.clusterId, name_en: h.name_en })),
        };
    },
);

export default function DisasterEventIndexRoute() {
    const { data, filters, usePrimeUiV2, hipTypes, hipClusters, hipHazards } = useLoaderData<typeof loader>();
    return (
        <>
            <DisasterEventsPage
                data={data}
                filters={filters}
                usePrimeUiV2={usePrimeUiV2}
                hipTypes={hipTypes}
                hipClusters={hipClusters}
                hipHazards={hipHazards}
            />
            <Outlet />
        </>
    );
}
