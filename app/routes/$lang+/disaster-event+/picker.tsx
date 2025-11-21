import {disasterEventsLoader} from "~/backend.server/handlers/events/disasterevent";

import {ListView} from "~/frontend/events/disastereventlist";

import {authLoaderPublicOrWithPerm} from "~/util/auth";

import { useLoaderData} from "@remix-run/react";
import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/util/link";


export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({loaderArgs});
	}
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	return ListView({
		ctx,
		titleOverride: "Select related disaster event",
		hideMainLinks: true,
		linksNewTab: true,
		actions: (item) => (
			<LangLink
				lang={ctx.lang}
				to="#"
				onClick={
					() => {
						if (window.opener) {
							window.opener.postMessage({selected: item, type:"select_disaster"}, "*");
							window.close();
						} else {
							alert("Can't get window that opened this window. Close and try again.")
						}
					}}
			>
				Select
			</LangLink>

		)

	})
}
