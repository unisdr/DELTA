import { useLoaderData } from "react-router";

import { createUserSession, sessionCookie } from "~/utils/session";

import { configSsoAzureB2C } from "~/utils/config";

import {
	SSOAzureB2C as interfaceSSOAzureB2C,
	baseURL,
	decodeToken,
	loginGetCode,
} from "~/utils/ssoauzeb2c";
import { loginAzureB2C } from "~/backend.server/models/user/auth";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { redirectLangFromRoute } from "~/utils/url.backend";
import { proxiedFetch } from "~/utils/proxied-fetch";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";
import { LoaderFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";

type LoaderData = { ok: false; errors: string } | { ok: true };

export const loader = async (
	loaderArgs: LoaderFunctionArgs,
): Promise<LoaderData | Response> => {
	const { request } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);

	const jsonAzureB2C: interfaceSSOAzureB2C = configSsoAzureB2C();
	const urlSSOCode2Token = `${baseURL()}/token?p=${jsonAzureB2C.login_userflow}`;
	const url = new URL(request.url);
	const queryStringCode = url.searchParams.get("code") || "";
	const queryStringDesc = url.searchParams.get("error_description") || "";
	let data: { [key: string]: string } = {};
	data["email"] = "";
	data["password"] = "";
	data["firstName"] = "";
	data["lastName"] = "";

	let token: object = {};
	let token_idp: object = {};

	// https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
	if (queryStringDesc) {
		return { ok: false, errors: queryStringDesc };
	} else if (queryStringCode) {
		try {
			// WORKING
			const response = await proxiedFetch(urlSSOCode2Token, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					client_id: jsonAzureB2C.client_id,
					client_secret: jsonAzureB2C.client_secret,
					code: queryStringCode,
					grant_type: "authorization_code",
				}),
			});

			const result: any = await response.json();
			// console.log(result);
			if ("id_token" in result) {
				token = decodeToken(result.id_token);
				// console.log(token);
				if ("idp_access_token" in token) {
					// console.log(token.idp_access_token);
					token_idp = decodeToken(String(token.idp_access_token));
					// console.log(token_idp);
					if ("family_name" in token_idp) {
						data["lastName"] = String(token_idp.family_name);
					}
					if ("given_name" in token_idp) {
						data["firstName"] = String(token_idp.given_name);
					}
					if ("unique_name" in token_idp) {
						data["email"] = String(token_idp.unique_name);
					}
				} else {
					if ("family_name" in token) {
						data["lastName"] = String(token.family_name);
					}
					if ("given_name" in token) {
						data["firstName"] = String(token.given_name);
					}
					if ("emails" in token) {
						data["email"] = String(token.emails);
					}
				}
			} else if ("error" in result && "error_description" in result) {
				return Response.json(
					{
						errors: result.error_description,
					},
					{ status: 500 },
				);
			}

			let retLogin = await loginAzureB2C(
				data["email"],
				data["firstName"],
				data["lastName"],
			);
			if (!retLogin.ok) {
				return {
					ok: false,
					errors: String(retLogin.error),
				};
			}

			const headers = await createUserSession(retLogin.userId);
			const userCountryAccounts = await getUserCountryAccountsByUserId(
				retLogin.userId,
			);

			if (userCountryAccounts && userCountryAccounts.length === 1) {
				const countrySettings =
					await getInstanceSystemSettingsByCountryAccountId(
						userCountryAccounts[0].countryAccountsId,
					);

				const session = await sessionCookie().getSession(headers["Set-Cookie"]);
				session.set(
					"countryAccountsId",
					userCountryAccounts[0].countryAccountsId,
				);
				session.set("userRole", userCountryAccounts[0].role);
				session.set("countrySettings", countrySettings);
				const setCookie = await sessionCookie().commitSession(session);

				return redirectLangFromRoute(loaderArgs, ctx.url("/"), {
					headers: { "Set-Cookie": setCookie },
				});
			} else if (userCountryAccounts && userCountryAccounts.length > 1) {
				return redirectLangFromRoute(
					loaderArgs,
					ctx.url("/user/select-instance"),
					{ headers: headers },
				);
			}

			return redirectLangFromRoute(loaderArgs, ctx.url("/"), { headers });
			// }
		} catch (error) {
			console.error("Error:", error);
			return {
				ok: false,
				errors:
					error instanceof Error
						? error.message
						: "Unexpected authentication error",
			};
		}
	} else {
		// Check if this is an admin login request (via query first, then cookie fallback)
		const url = new URL(request.url);
		const origin = url.searchParams.get("origin") || "";
		const redirectTo = url.searchParams.get("redirectTo") || "";
		const isAdmin = url.searchParams.get("isAdmin") === "true";
		const adminLogin = url.searchParams.get("adminLogin") === "1";

		// Fallback to session cookie if query params are missing
		const cookieHeader = request.headers.get("Cookie") || "";
		const session = await sessionCookie().getSession(cookieHeader);
		const loginOrigin = session.get("loginOrigin");

		const adminIntent =
			origin === "admin" || isAdmin || adminLogin || loginOrigin === "admin";

		// console.log("DEBUG SSO Login: request.url=", request.url);
		// console.log("DEBUG SSO Login: cookies=", cookieHeader);
		// console.log("DEBUG SSO Login: origin=", origin, "redirectTo=", redirectTo, "isAdmin=", isAdmin, "adminLogin=", adminLogin, "loginOrigin=", loginOrigin, "adminIntent=", adminIntent);

		// Create a state parameter that includes origin and redirectTo when admin
		let state: string | object = {
			action: "azure_sso_b2c-login",
			lang: ctx.lang,
		};
		state = JSON.stringify(state);
		if (adminIntent) {
			const stateObj = {
				action: "azure_sso_b2c-login",
				origin: "admin",
				isAdmin: true,
				adminLogin: 1,
				redirectTo: redirectTo || ctx.url("/admin/country-accounts"),
				lang: ctx.lang,
			} as const;
			state = JSON.stringify(stateObj);
			// console.log("DEBUG SSO Login: Using admin state:", state);
		}

		return loginGetCode(state);
	}
};

// https://app.dts.ddev.site/sso/azure-b2c/callback
export default function SsoAzureB2cCallback() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	if (!loaderData.ok) {
		return (
			<>
				<div>
					<h1>Error: received server error response</h1>
					<p>{loaderData.errors}</p>
				</div>
				<div>
					<LangLink lang={ctx.lang} to="/setup/admin-account-sso">
						Setup using SSO
					</LangLink>
				</div>
			</>
		);
	}

	return (
		<div>
			<p></p>
		</div>
	);
}
