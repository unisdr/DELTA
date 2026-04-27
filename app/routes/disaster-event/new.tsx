import { redirect, useActionData, useLoaderData } from "react-router";

import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { PERMISSIONS } from "~/frontend/user/roles";
import {
    makeCreateDisasterEventUseCase,
    makeListDisasterEventsUseCase,
} from "~/modules/disaster-event/disaster-event-module.server";
import DisasterEventForm from "~/modules/disaster-event/presentation/disaster-event-form";
import {
    parseStepState,
    toDisasterEventWriteModel,
} from "~/modules/disaster-event/presentation/step-state";
import { hazardousEventTable } from "~/modules/hazardous-event/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import {
    authActionWithPerm,
    authLoaderWithPerm,
} from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm(PERMISSIONS.DISASTER_EVENT_CREATE, async ({ request }) => {
    const countryAccountsId = await getCountryAccountsIdFromSession(request);
    if (!countryAccountsId) {
        throw new Response("Unauthorized", { status: 401 });
    }

    const [hipTypes, hipClusters, hipHazards, divisions, responseTypes, assessmentTypes, disasters, hazardous] =
        await Promise.all([
            dr.query.hipTypeTable.findMany(),
            dr.query.hipClusterTable.findMany(),
            dr.query.hipHazardTable.findMany(),
            dr.query.divisionTable.findMany({
                where: eq(divisionTable.countryAccountsId, countryAccountsId),
            }),
            dr.query.responseTypeTable.findMany(),
            dr.query.assessmentTypeTable.findMany(),
            makeListDisasterEventsUseCase().execute({ countryAccountsId, page: 1, pageSize: 200 }),
            dr.select({ id: hazardousEventTable.id, nationalSpecification: hazardousEventTable.nationalSpecification, startDate: hazardousEventTable.startDate })
                .from(hazardousEventTable)
                .where(eq(hazardousEventTable.countryAccountsId, countryAccountsId)),
        ]);

    return {
        hipTypes: hipTypes.map((t) => ({ label: t.name_en, value: t.id })),
        hipClusters: hipClusters.map((c) => ({ label: c.name_en, value: c.id })),
        hipHazards: hipHazards.map((h) => ({ label: h.name_en, value: h.id })),
        divisions: divisions.map((d) => ({ label: d.nationalId || d.id, value: d.id })),
        responseTypes: responseTypes.map((r) => ({ label: r.type, value: r.id })),
        assessmentTypes: assessmentTypes.map((a) => ({ label: a.type, value: a.id })),
        disasterOptions: disasters.data.items.map((d) => ({ label: d.nameNational, value: d.id, startDate: d.startDate ? String(d.startDate) : null })),
        hazardousOptions: hazardous.map((h) => ({ label: h.nationalSpecification || h.id, value: h.id, startDate: h.startDate ? String(h.startDate) : null })),
    };
});

export const action = authActionWithPerm(PERMISSIONS.DISASTER_EVENT_CREATE, async ({ request }) => {
    const countryAccountsId = await getCountryAccountsIdFromSession(request);
    if (!countryAccountsId) {
        throw new Response("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const stepState = parseStepState(formData.get("stepState"));
    const payload = toDisasterEventWriteModel(countryAccountsId, stepState);
    const result = await makeCreateDisasterEventUseCase().execute(payload);
    if (!result.ok) {
        return { error: result.error };
    }

    return redirect("/disaster-event");
});

export default function DisasterEventNewRoute() {
    const actionData = useActionData<typeof action>();
    const loaderData = useLoaderData<typeof loader>();

    return (
        <DisasterEventForm
            title="Create Disaster Event"
            submitLabel="Save"
            actionError={actionData?.error}
            hipTypes={loaderData.hipTypes}
            hipClusters={loaderData.hipClusters}
            hipHazards={loaderData.hipHazards}
            divisions={loaderData.divisions}
            disasterOptions={loaderData.disasterOptions}
            hazardousOptions={loaderData.hazardousOptions}
            responseTypes={loaderData.responseTypes}
            assessmentTypes={loaderData.assessmentTypes}
        />
    );
}
