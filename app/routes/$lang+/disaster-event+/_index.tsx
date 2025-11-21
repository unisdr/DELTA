import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

import { MetaFunction } from "@remix-run/node";
import { ViewContext } from "~/frontend/context";
import { useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
	return [
		{ title: "List of Disaster Events - DELTA Resilience" },
		{ name: "description", content: "Disaster Events." },
	];
};

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	}
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	return ListView({ctx});
}
