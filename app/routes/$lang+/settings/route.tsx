import {
	Outlet,
	useLoaderData,
} from "@remix-run/react";

import {
	authLoader
} from "~/util/auth";
import { NavSettings } from "./nav";
import { getLanguage } from "~/util/lang.backend";
import { redirectLangFromRoute } from "~/util/url.backend";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

export const loader = authLoader(async (loaderArgs) => {
	const url = new URL(loaderArgs.request.url);

	const lang = getLanguage(loaderArgs)

	if (url.pathname === `/${lang}/settings` || url.pathname === `/${lang}/settings/`) {
		return redirectLangFromRoute(loaderArgs, "/settings/system", 303);
	}

	const isSettingsPage = url.pathname.startsWith(`/${lang}/settings`) && !url.pathname.startsWith(`/${lang}/settings/`);

	return {
		common: await getCommonData(loaderArgs),
		isSettingsPage
	};
});

export default function SettingsLayout() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	return (
		<>
			{/* Render NavSettings dynamically */}
			{ld.isSettingsPage && <NavSettings ctx={ctx} />}
			<Outlet />
		</>
	);
}
