import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

import { MetaFunction } from "@remix-run/node";
import { ViewContext } from "~/frontend/context";

export const meta: MetaFunction = () => {
	return [
		{ title: "List of disaster events - DELTA Resilience" },
		{ name: "description", content: "Disaster events." },
	];
};

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	}
);

export default function Data() {
	const ctx = new ViewContext();
	return ListView({ctx});
}
