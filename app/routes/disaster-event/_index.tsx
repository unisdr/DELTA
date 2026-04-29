import { Outlet, useLoaderData } from "react-router";

import { makeListDisasterEventsUseCase } from "~/modules/disaster-event/disaster-event-module.server";
import DisasterEventsPage from "~/modules/disaster-event/presentation/disaster-events-page";
import { dr } from "~/db.server";
import { eq } from "drizzle-orm";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { PERMISSIONS } from "~/frontend/user/roles";
import { configDisasterEventUiV2 } from "~/utils/config";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, getUserIdFromSession } from "~/utils/session";

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
        const workflowStatus =
            (url.searchParams.get("workflowStatus") ||
                url.searchParams.get("approvalStatus") ||
                "").trim();
        const fromDate = (url.searchParams.get("fromDate") || "").trim();
        const toDate = (url.searchParams.get("toDate") || "").trim();

        const myRecords = url.searchParams.get("myRecords") === "true";
        const loggedInUserId = myRecords ? await getUserIdFromSession(request) : undefined;

        const [hipTypes, hipClusters, hipHazards] = await Promise.all([
            dr.query.hipTypeTable.findMany(),
            dr.query.hipClusterTable.findMany(),
            dr.query.hipHazardTable.findMany(),
        ]);

        const countryAccount = await dr.query.countryAccountsTable.findFirst({
            where: eq(countryAccountsTable.id, countryAccountsId),
            with: {
                country: true,
            },
        });

        const result = await makeListDisasterEventsUseCase().execute({
            countryAccountsId,
            page,
            pageSize,
            search,
            recordingInstitution,
            hazardTypeId,
            hazardClusterId,
            hazardId,
            workflowStatus,
            fromDate,
            toDate,
            createdByUserId: loggedInUserId ?? undefined,
        });

        return {
            ...result,
            countryName: countryAccount?.country?.name || "Current Country",
            usePrimeUiV2: configDisasterEventUiV2(),
            hipTypes: hipTypes.map((t) => ({ id: t.id, name_en: t.name_en })),
            hipClusters: hipClusters.map((c) => ({ id: c.id, typeId: c.typeId, name_en: c.name_en })),
            hipHazards: hipHazards.map((h) => ({ id: h.id, clusterId: h.clusterId, name_en: h.name_en })),
        };
    },
);

export default function DisasterEventIndexRoute() {
    const { data, countryName, filters, usePrimeUiV2, hipTypes, hipClusters, hipHazards } = useLoaderData<typeof loader>();
    return (
        <>
            <DisasterEventsPage
                data={data}
                countryName={countryName}
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
