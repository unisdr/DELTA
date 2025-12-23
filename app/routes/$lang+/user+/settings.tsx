import {
	useLoaderData,
} from "@remix-run/react";
import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";
import { configAuthSupportedForm } from "~/util/config";

import { LangLink } from "~/util/link";
import { ViewContext } from "~/frontend/context";

import { getCommonData } from "~/backend.server/handlers/commondata";

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	return {
		common: await getCommonData(loaderArgs),
		totpEnabled: user.totpEnabled,
		isFormAuthSupported: configAuthSupportedForm()
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	return (
		<>
			<ul>
				<li><LangLink lang={ctx.lang} to="/settings/access-mgmnt">Manage Users</LangLink></li>

				{/* Only show Change Password link if form authentication is supported */}
				{ld.isFormAuthSupported && (
					<li><LangLink lang={ctx.lang} to="/user/change-password">Change Password</LangLink></li>
				)}

				{!ld.totpEnabled ? (
					<li><LangLink lang={ctx.lang} to="/user/totp-enable">Enable TOTP</LangLink></li>
				) : (
					<li><LangLink lang={ctx.lang} to="/user/totp-disable">Disable TOTP</LangLink></li>
				)}
			</ul>
		</>
	);
}
