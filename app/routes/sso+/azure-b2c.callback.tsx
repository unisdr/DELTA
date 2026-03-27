import {
	createUserSession,
	sessionCookie,
	superAdminSessionCookie,
} from "~/utils/session";

import {
	configSsoAzureB2C,
} from "~/utils/config";

import {
	SSOAzureB2C as interfaceSSOAzureB2C,
	baseURL,
	decodeToken,
} from "~/utils/ssoauzeb2c";
import {
	loginAzureB2C,
	registerAzureB2C,
	checkSuperAdminByEmail,
	loginSuperAdminAzureB2C,
} from "~/backend.server/models/user/auth";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";
// import {setupAdminAccountFieldsFromMap, setupAdminAccountSSOAzureB2C} from "~/backend.server/models/user/admin";

import { LoaderFunctionArgs, redirect } from "react-router";
import { proxiedFetch } from "~/utils/proxied-fetch";

interface interfaceQueryStringState {
	action?: string;
	inviteCode?: string;
	origin?: string;
	redirectTo?: string;
	isAdmin?: boolean;
	adminLogin?: number;
	lang?: string;
}

interface interfaceAzureB2CData {
	email: string;
	firstName: string;
	lastName: string;
}

export type typeAzureB2CData =
	| {
		okay: true;
		email: string;
		firstName: string;
		lastName: string;
		errors: "";
	}
	| {
		okay: false;
		email: string;
		firstName: string;
		lastName: string;
		errors: string;
	};

async function _code2Token(paramCode: string): Promise<typeAzureB2CData> {
	const jsonAzureB2C: interfaceSSOAzureB2C = configSsoAzureB2C();
	const urlSSOCode2Token = `${baseURL()}/token?p=${jsonAzureB2C.login_userflow}`;
	let token: object = {};
	let token_idp: object = {};
	let data: interfaceAzureB2CData = {
		email: "",
		firstName: "",
		lastName: "",
	};

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
				code: paramCode,
				grant_type: "authorization_code",
			}),
		});
		const result: any = await response.json();

		if ("id_token" in result) {
			token = decodeToken(result.id_token);
			// console.log("DEBUG: Token decoded:", token);

			// Special handling for Google IDP to extract email from nested token
			// as Azure B2C does not include email in the main token for Google IDP
			// https://learn.microsoft.com/en-us/azure/active-directory-b2c/identity-provider-google?pivots=b2c-user-flow#claims
			// https://learn.microsoft.com/en-us/azure/active-directory-b2c/tokens-overview?pivots=b2c-user-flow#id-tokens
			if ("idp" in token && String(token.idp) === "google.com") {
				if ("family_name" in token) {
					data.lastName = String(token.family_name);
				}
				if ("given_name" in token) {
					data.firstName = String(token.given_name);
				}
				if ("emails" in token) {
					// data.email = String(token.emails);
					if (Array.isArray(token.emails) && token.emails.length > 0) {
						data.email = String(token.emails[0]);
					} else if (typeof token.emails === "string") {
						data.email = token.emails;
					}
				}
			}
			// Handle UN Staff login where email is in idp_access_token
			// https://learn.microsoft.com/en-us/azure/active-directory-b2c/tokens-overview?pivots=b2c-user-flow
			else if ("idp_access_token" in token) {
				// console.log( token.idp_access_token );
				token_idp = decodeToken(String(token.idp_access_token));
				// console.log( token_idp );
				if ("family_name" in token_idp) {
					data.lastName = String(token_idp.family_name);
				}
				if ("given_name" in token_idp) {
					data.firstName = String(token_idp.given_name);
				}
				if ("unique_name" in token_idp) {
					data.email = String(token_idp.unique_name);
				}
			} else {
				if ("family_name" in token) {
					data.lastName = String(token.family_name);
				}
				if ("given_name" in token) {
					data.firstName = String(token.given_name);
				}
				if ("emails" in token) {
					data.email = String(token.emails);
				}
			}
		} else if ("error" in result && "error_description" in result) {
			return {
				okay: false,
				email: data.email,
				firstName: data.firstName,
				lastName: data.lastName,
				errors: String(result.error_description),
			};
		} else {
		}

		return {
			okay: true,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			errors: "",
		};
	} catch (error) {
		return {
			okay: false,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			errors: String(error),
		};
	}
}

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;

	const url = new URL(request.url);
	const queryStringCode = url.searchParams.get("code") || "";
	const queryStringDesc = url.searchParams.get("error_description") || "";
	const queryStringState = url.searchParams.get("state") || "";
	let jsonQueryStringState: interfaceQueryStringState = {
		action: "",
		inviteCode: "",
		lang: "",
	};
	try {
		//data is a JSON encoded, data needs to be decoded
		jsonQueryStringState = JSON.parse(decodeURIComponent(queryStringState));
		if (
			jsonQueryStringState.lang == null ||
			jsonQueryStringState.lang == undefined ||
			jsonQueryStringState.lang.length == 0
		) {
			jsonQueryStringState.lang = "en";
		}
	} catch (error) {
		throw new Response("Invalid SSO callback state.", {
			status: 400,
			statusText: "Bad Request",
		});
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
	if (queryStringDesc) {
		throw new Response(queryStringDesc, {
			status: 400,
			statusText: "Bad Request",
		});
	} else if (
		jsonQueryStringState.action &&
		jsonQueryStringState.action == "sso_azure_b2c-register"
	) {
		// User opted to use Azure B2C SSO.
		const data2 = await _code2Token(queryStringCode);

		if (!data2.okay) {
			throw new Response(data2.errors || "SSO token exchange failed.", {
				status: 400,
				statusText: "Bad Request",
			});
		}

		let retLogin = await registerAzureB2C(
			data2.email,
			data2.firstName,
			data2.lastName,
		);
		if (!retLogin.ok) {
			throw new Response(retLogin.error || "Registration failed.", {
				status: 400,
				statusText: "Bad Request",
			});
		}

		const headers = await createUserSession(retLogin.userId);
		const userCountryAccounts = await UserCountryAccountRepository.getByUserId(
			retLogin.userId,
		);

		if (userCountryAccounts && userCountryAccounts.length === 1) {
			const countrySettings =
				await InstanceSystemSettingRepository.getByCountryAccountId(
					userCountryAccounts[0].countryAccountsId,
				);

			const session = await sessionCookie().getSession(headers["Set-Cookie"]);
			session.set("countryAccountsId", userCountryAccounts[0].countryAccountsId);
			session.set("countrySettings", countrySettings);
			const setCookie = await sessionCookie().commitSession(session);
			const lang = countrySettings?.language || "en";

			return redirect(`/${lang}/hazardous-event/`, {
				headers: { "Set-Cookie": setCookie },
			});
		}

		if (userCountryAccounts && userCountryAccounts.length > 1) {
			return redirect(`/${jsonQueryStringState.lang}/user/select-instance`, {
				headers: headers,
			});
		}

		throw new Response("No country account is associated with this user.", {
			status: 403,
			statusText: "Forbidden",
		});
	} else if (
		jsonQueryStringState.action == "azure_sso_b2c-login" &&
		queryStringCode.length > 0
	) {
		try {
			const data2 = await _code2Token(queryStringCode);

			if (data2.okay) {
				// First check if this is a super admin
				const superAdminCheck = await checkSuperAdminByEmail(data2.email);

				// Get the cookies to check for admin login marker
				const cookieHeader = request.headers.get("Cookie") || "";
				// console.log("DEBUG: Cookies:", cookieHeader);

				// Retrieve session from request cookies to read login origin set on /admin/login
				const session = await sessionCookie().getSession(cookieHeader);
				const sessionLoginOrigin = session.get("loginOrigin");

				// OPTION 2: Use State Parameter as Primary Source of Truth
				let isFromAdminLogin = false;
				let adminRedirectTo = `/${jsonQueryStringState.lang}/admin/country-accounts`;

				// 1. First priority: Check state parameter (most reliable)
				// If state parameter contains admin info, use that regardless of session
				if (
					jsonQueryStringState &&
					(jsonQueryStringState.adminLogin ||
						jsonQueryStringState.origin === "admin" ||
						jsonQueryStringState.isAdmin)
				) {
					isFromAdminLogin = true;
					// Get redirectTo from state if available
					if (jsonQueryStringState.redirectTo) {
						adminRedirectTo = jsonQueryStringState.redirectTo;
					}
				}

				// 2. Fallback: Check session only if state doesn't indicate admin
				if (!isFromAdminLogin) {
					isFromAdminLogin = sessionLoginOrigin === "admin";
				}

				// If this is a super admin coming from admin login
				if (superAdminCheck.ok && isFromAdminLogin) {

					// Login super admin via SSO
					const superAdminLogin = await loginSuperAdminAzureB2C(
						data2.email,
						data2.firstName,
						data2.lastName,
					);

					if (!superAdminLogin.ok) {
						throw new Response("Super admin login failed.", {
							status: 403,
							statusText: "Forbidden",
						});
					}

					// Create super admin session WITHOUT affecting existing cookies
					const session = await superAdminSessionCookie().getSession();
					session.set("superAdminId", superAdminLogin.superAdminId);
					const superAdminCookie =
						await superAdminSessionCookie().commitSession(session);

					// console.log("DEBUG: Redirecting super admin to:", adminRedirectTo);
					return redirect(`/${jsonQueryStringState.lang}${adminRedirectTo}`, {
						headers: { "Set-Cookie": superAdminCookie },
					});
				}

				// Admin-login SSO must not fall back to regular user login.
				// If the account is not a super admin, stop here and show an auth error.
				if (isFromAdminLogin && !superAdminCheck.ok) {
					throw new Response(
						"This account is not authorized for Admin Management. Please sign in with a super admin account.",
						{ status: 403, statusText: "Forbidden" },
					);
				}

				// Regular user login flow
				let retLogin = await loginAzureB2C(
					data2.email,
					data2.firstName,
					data2.lastName,
				);

				if (!retLogin.ok) {
					throw new Response(retLogin.error || "User login failed.", {
						status: 401,
						statusText: "Unauthorized",
					});
				}

				if (retLogin.userId == "0") {
					throw new Response("System error.", {
						status: 500,
						statusText: "Internal Server Error",
					});
				} else {
					const headers = await createUserSession(retLogin.userId);
					const userCountryAccounts = await UserCountryAccountRepository.getByUserId(
						retLogin.userId,
					);

					if (userCountryAccounts && userCountryAccounts.length === 1) {
						const countrySettings =
							await InstanceSystemSettingRepository.getByCountryAccountId(
								userCountryAccounts[0].countryAccountsId,
							);

						const session = await sessionCookie().getSession(
							headers["Set-Cookie"],
						);
						session.set(
							"countryAccountsId",
							userCountryAccounts[0].countryAccountsId,
						);
						session.set("countrySettings", countrySettings);
						const setCookie = await sessionCookie().commitSession(session);
						const lang = countrySettings?.language || "en";

						return redirect(`/${lang}/hazardous-event/`, {
							headers: { "Set-Cookie": setCookie },
						});
					} else if (userCountryAccounts && userCountryAccounts.length > 1) {
						return redirect(
							`/${jsonQueryStringState.lang}/user/select-instance`,
							{ headers: headers },
						);
					}

					throw new Response(
						"No country account is associated with this user.",
						{ status: 403, statusText: "Forbidden" },
					);
				}
			} else {
				throw new Response(data2.errors || "SSO token exchange failed.", {
					status: 400,
					statusText: "Bad Request",
				});
			}
		} catch (error) {
			if (error instanceof Response) {
				throw error;
			}
			console.error("Error:", error);
			throw new Response(
				error instanceof Error ? error.message : String(error),
				{ status: 500, statusText: "Internal Server Error" },
			);
		}
	} else {
		throw new Response("Invalid SSO callback request.", {
			status: 400,
			statusText: "Bad Request",
		});
	}
};

// https://app.dts.ddev.site/sso/azure-b2c/callback
export default function SsoAzureB2cCallback() {
	return null;
}
