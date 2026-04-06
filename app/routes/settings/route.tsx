import { Outlet, useLoaderData } from "react-router";

import { authLoader } from "~/utils/auth";
import { NavSettings } from "./nav";
import { getLanguage } from "~/utils/lang.backend";
import { redirectLangFromRoute } from "~/utils/url.backend";



export const loader = authLoader(async (loaderArgs) => {
	const url = new URL(loaderArgs.request.url);

	const lang = getLanguage(loaderArgs);

	if (
		url.pathname === `/${lang}/settings` ||
		url.pathname === `/${lang}/settings/`
	) {
		return redirectLangFromRoute(loaderArgs, "/settings/system", 303);
	}

	const isSettingsPage =
		url.pathname.startsWith(`/${lang}/settings`) &&
		!url.pathname.startsWith(`/${lang}/settings/`);

	return {
		isSettingsPage,
	};
});

export default function SettingsLayout() {
	const ld = useLoaderData<typeof loader>();


	return (
		<>
			{/* Render NavSettings dynamically */}
			{ld.isSettingsPage && <NavSettings />}
			<Outlet />
		</>
	);
}
