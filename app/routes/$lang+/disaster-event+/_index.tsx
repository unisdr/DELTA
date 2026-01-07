import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/util/auth";

import { MetaFunction } from "@remix-run/node";
import { ViewContext } from "~/frontend/context";
import { htmlTitle } from "~/util/htmlmeta";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.list_of_disaster_events",
				"msg": "List of disaster events"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.list_of_disaster_events",
				"msg": "List of disaster events"
			}),
		}
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
