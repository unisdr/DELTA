import { DataMainLinks } from "~/frontend/data_screen";

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";

import { ListView } from "~/frontend/events/hazardeventlist";
import { HazardEventHeader } from "~/components/EventCounter";

import { MetaFunction, useLoaderData } from "react-router";

import { authLoaderPublicOrWithPerm } from "~/utils/auth";

import { getCountrySettingsFromSession } from "~/utils/session";

import { MainContainer } from "~/frontend/container";

import { htmlTitle } from "~/utils/htmlmeta";

export const meta: MetaFunction = () => {


	return [
		{
			title: htmlTitle(
				"List of hazardous events",
			),
		},
		{
			name: "description",
			content: "Hazardous events",
		},
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


	return (
		<MainContainer
			title={"Hazardous events"}
		>
			<>
				{/* Header with count and instance name */}
				<HazardEventHeader
					totalCount={ld.data.pagination.totalItems}
					instanceName={ld.instanceName}
				/>
				<DataMainLinks
					relLinkToNew="/new"
					isPublic={ld.isPublic}
					baseRoute="/hazardous-event"
					addNewLabel={"Add new event"}
					csvExportLinks={false} /* CSV Export and Import buttons disabled */
				/>
				<ListView
					isPublic={ld.isPublic}
					basePath="/hazardous-event"
				></ListView>
			</>
		</MainContainer>
	);
}
