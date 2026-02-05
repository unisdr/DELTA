import { useLoaderData } from "react-router";
import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";
import { configAuthSupportedForm } from "~/util/config";

import { LangLink } from "~/util/link";
import { ViewContext } from "~/frontend/context";



export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	return {

		totpEnabled: user.totpEnabled,
		isFormAuthSupported: configAuthSupportedForm()
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	return (
		<>
			<ul>
				<li>
					<LangLink lang={ctx.lang} to="/settings/access-mgmnt">
						{ctx.t({ "code": "user.manage_users", "msg": "Manage users" })}
					</LangLink>
				</li>

				{/* Only show Change Password link if form authentication is supported */}
				{ld.isFormAuthSupported && (
					<li>
						<LangLink lang={ctx.lang} to="/user/change-password">
							{ctx.t({ "code": "user.change_password", "msg": "Change password" })}
						</LangLink>
					</li>
				)}

				{!ld.totpEnabled ? (
					<li>
						<LangLink lang={ctx.lang} to="/user/totp-enable">
							{ctx.t({ "code": "user.enable_totp_link", "msg": "Enable TOTP" })}
						</LangLink>
					</li>

				) : (
					<li>
						<LangLink lang={ctx.lang} to="/user/totp-disable">
							{ctx.t({ "code": "user.disable_totp_link", "msg": "Disable TOTP" })}
						</LangLink>
					</li>
				)}
			</ul>
		</>
	);
}
