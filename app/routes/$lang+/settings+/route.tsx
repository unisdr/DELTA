import { Outlet, redirect } from "react-router";

import { authLoader } from "~/utils/auth";
import { getLanguage } from "~/utils/lang.backend";

export const loader = authLoader(async (loaderArgs) => {
	const url = new URL(loaderArgs.request.url);
	const lang = getLanguage(loaderArgs);

	if (
		url.pathname === `/${lang}/settings` ||
		url.pathname === `/${lang}/settings/`
	) {
		return redirect(`/${lang}/settings/system`, 303);
	}

	return null;
});

export default function SettingsLayout() {
	return <Outlet />;
}
