import { redirect, useActionData, useLoaderData } from "react-router";

import {
	makeGetHazardousEventByIdUseCase,
	makeUpdateHazardousEventUseCase,
} from "~/modules/hazardous-event/hazardous-event-module.server";
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

export const loader = authLoaderWithPerm("EditData", async ({ request, params }) => {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const item = await makeGetHazardousEventByIdUseCase().execute({
		id: params.id,
		countryAccountsId,
	});
	if (!item) {
		throw new Response("Hazardous event not found", { status: 404 });
	}

	// Fetch HIP data options
	const hipTypes = await dr.query.hipTypeTable.findMany();
	const hipClusters = await dr.query.hipClusterTable.findMany();
	const hipHazards = await dr.query.hipHazardTable.findMany();

	return {
		item,
		hipTypes: hipTypes.map((t) => ({ label: t.name_en, value: t.id })),
		hipClusters: hipClusters.map((c) => ({ label: c.name_en, value: c.id, typeId: c.typeId })),
		hipHazards: hipHazards.map((h) => ({ label: h.name_en, value: h.id, clusterId: h.clusterId })),
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request, params } = actionArgs;
	const userSession = authActionGetAuth(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const formData = await request.formData();
	const updatedByUserId = userSession?.user?.id || "";

	const result = await makeUpdateHazardousEventUseCase().execute({
		id: params.id,
		countryAccountsId,
		data: {
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
			updatedByUserId,
		},
	});

	if (!result.ok) {
		return {
			error: result.fieldErrors ? undefined : result.error,
			fieldErrors: result.fieldErrors,
		};
	}

	return redirect("/hazardous-event");
});

export default function HazardousEventEditRoute() {
	const { item, hipTypes, hipClusters, hipHazards } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<HazardousEventForm
			title="Edit Hazardous Event"
			submitLabel="Save"
			actionError={actionData?.error}
			fieldErrors={actionData?.fieldErrors}
			initialValues={item}
			hipTypes={hipTypes}
			hipClusters={hipClusters}
			hipHazards={hipHazards}
		/>
	);
}
