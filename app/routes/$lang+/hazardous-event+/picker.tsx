import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";
import { MainContainer } from "~/frontend/container";
import { ListView } from "~/frontend/events/hazardeventlist";
import { authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/util/link";

export const loader = authLoaderWithPerm("ViewData", async (args) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("No selected country accounts instance ", {
			status: 404,
		});
	}
	return hazardousEventsLoader(args);
});

export default function Data() {
	const ctx = new ViewContext();

	return (
		<MainContainer
			title={ctx.t({
				"code": "hazardous_event.select_parent_for_event",
				"msg": "Select parent for event"
			})}
		>
			{ListView({
				ctx,
				isPublic: false,
				basePath: `/hazardous-event/picker`,
				linksNewTab: true,
				actions: (item) => (
					<LangLink
						lang={ctx.lang}
						to="#"
						onClick={() => {
							if (window.opener) {
								window.opener.postMessage(
									{ selected: item, type: "select_hazard" },
									"*"
								);
								window.close();
							} else {
								alert(
									"Can't get window that opened this window. Close and try again."
								);
							}
						}}
					>
						{ctx.t({
							"code": "common.select",
							"msg": "Select"
						})}
					</LangLink>
				),
			})}
		</MainContainer>
	);
}
