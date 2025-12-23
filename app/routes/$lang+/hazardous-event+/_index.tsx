import { DataMainLinks } from "~/frontend/data_screen";

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";

import { ListView } from "~/frontend/events/hazardeventlist";
import { HazardEventHeader } from "~/components/EventCounter";

import { MetaFunction, useLoaderData } from "@remix-run/react";

import { authLoaderPublicOrWithPerm } from "~/util/auth";


import { getCountrySettingsFromSession } from "~/util/session";

import { MainContainer } from "~/frontend/container";
import { ViewContext } from "~/frontend/context";

export const meta: MetaFunction = () => {
	return [
		{ title: "List of hazardous events - DELTA Resilience" },
		{ name: "description", content: "Hazardous events." },
	];
};

export const loader = authLoaderPublicOrWithPerm("ViewData", async (args) => {
	// Get the hazardous events data
	const eventsData = await hazardousEventsLoader(args);

	// Get the instance settings to access the website name
	const settings = await getCountrySettingsFromSession(args.request);

	// Return both the events data and the instance name
	return {
		...eventsData,
		instanceName: settings?.websiteName || "DELTA Resilience",
	};
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	return (
		<MainContainer title={ctx.t({
			"code": "hazardous_events",
			"msg": "Hazardous events"
		})}>
			<>
				{/* Header with count and instance name */}
				<HazardEventHeader
					ctx={ctx}
					totalCount={ld.data.pagination.totalItems}
					instanceName={ld.instanceName}
				/>
				<DataMainLinks
					ctx={ctx}
					relLinkToNew="/new"
					isPublic={ld.isPublic}
					baseRoute="/hazardous-event"
					resourceName="event"
					addNewLabel={ctx.t({
						"code": "hazardous_event.add_new_event",
						"msg": "Add new event"
					})}
					csvExportLinks={false} /* CSV Export and Import buttons disabled */
				/>
				<ListView ctx={ctx} isPublic={ld.isPublic} basePath="/hazardous-event"></ListView>
			</>
		</MainContainer>
	);
}
