import { redirect, useActionData, useLoaderData } from "react-router";

import { makeCreateHazardousEventUseCase } from "~/modules/hazardous-event/hazardous-event-module.server";
import HazardousEventForm from "~/modules/hazardous-event/presentation/hazardous-event-form";
import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { dr } from "~/db.server";

function optionalField(formData: FormData, name: string): string | null {
	const value = String(formData.get(name) || "").trim();
	return value || null;
}

export const loader = authLoaderWithPerm("EditData", async () => {
	// Fetch HIP data options
	const hipTypes = await dr.query.hipTypeTable.findMany();
	const hipClusters = await dr.query.hipClusterTable.findMany();
	const hipHazards = await dr.query.hipHazardTable.findMany();

	return {
		hipTypes: hipTypes.map((t) => ({ label: t.name_en, value: t.id })),
		hipClusters: hipClusters.map((c) => ({ label: c.name_en, value: c.id, typeId: c.typeId })),
		hipHazards: hipHazards.map((h) => ({ label: h.name_en, value: h.id, clusterId: h.clusterId })),
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const userSession = authActionGetAuth(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw redirect("/user/select-instance");
	}

	const formData = await request.formData();
	const createdByUserId = userSession?.user?.id || "";

	const result = await makeCreateHazardousEventUseCase().execute({
		countryAccountsId,
		hipHazardId: optionalField(formData, "hipHazardId"),
		hipClusterId: optionalField(formData, "hipClusterId"),
		hipTypeId: optionalField(formData, "hipTypeId"),
		nationalSpecification: optionalField(formData, "nationalSpecification"),
		startDate: String(formData.get("startDate") || "").trim(),
		endDate: optionalField(formData, "endDate"),
		recordOriginator: String(formData.get("recordOriginator") || "").trim(),
		description: optionalField(formData, "description"),
		dataSource: optionalField(formData, "dataSource"),
		magnitude: optionalField(formData, "magnitude"),
		hazardousEventStatus: optionalField(formData, "hazardousEventStatus") as
			| "forecasted"
			| "ongoing"
			| "passed"
			| null,
		createdByUserId,
		updatedByUserId: createdByUserId,
	});

	if (!result.ok) {
		return {
			error: result.fieldErrors ? undefined : result.error,
			fieldErrors: result.fieldErrors,
		};
	}

	return redirect("/hazardous-event");
});

export default function HazardousEventNewRoute() {
	const actionData = useActionData<typeof action>();
	const loaderData = useLoaderData<typeof loader>();

	return (
		<HazardousEventForm
			title="Create Hazardous Event"
			submitLabel="Save"
			actionError={actionData?.error}
			fieldErrors={actionData?.fieldErrors}
			hipTypes={loaderData?.hipTypes}
			hipClusters={loaderData?.hipClusters}
			hipHazards={loaderData?.hipHazards}
		/>
	);
}
