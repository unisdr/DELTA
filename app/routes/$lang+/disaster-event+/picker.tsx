import { disasterEventsLoader } from "~/backend.server/handlers/events/disasterevent";

import { ListView } from "~/frontend/events/disastereventlist";

import { authLoaderPublicOrWithPerm } from "~/utils/auth";

import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/utils/link";


export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return disasterEventsLoader({ loaderArgs });
	}
);

export default function Data() {
	const ctx = new ViewContext();

	return ListView({
		ctx,
		titleOverride: ctx.t({
			"code": "disaster_event.select_related_disaster_event",
			"msg": "Select related disaster event"
		}),
		hideMainLinks: true,
		linksNewTab: true,
		actions: (item) => (
			<LangLink
				lang={ctx.lang}
				to="#"
				onClick={
					() => {
						if (window.opener) {
							window.opener.postMessage({ selected: item, type: "select_disaster" }, "*");
							window.close();
						} else {
							alert("Can't get window that opened this window. Close and try again.")
						}
					}}
			>
				{ctx.t({
					"code": "common.select",
					"msg": "Select"
				})}
			</LangLink>

		)

	})
}
