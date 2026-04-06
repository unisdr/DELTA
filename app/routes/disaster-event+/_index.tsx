import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/utils/auth";

import { MetaFunction } from "react-router";
import { htmlTitle } from "~/utils/htmlmeta";

export const meta: MetaFunction = () => {
	return [
		{
			title: htmlTitle(
				"List of disaster events",
			),
		},
		{
			name: "description",
			content: "List of disaster events",
		},
	];
};

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	},
);

export default function Data() {
	return ListView({});
}
