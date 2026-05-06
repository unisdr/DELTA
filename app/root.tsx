import type { LinksFunction } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import {
	useLoaderData,
	Links,
	Meta,
	Outlet,
	Scripts,
	useLocation,
} from "react-router";

import {
	sessionCookie,
	getFlashMessage,
	getUserFromSession,
	getCountrySettingsFromSession,
	getSuperAdminSession,
	getCountryAccountsIdFromSession,
} from "~/utils/session";

import { useEffect, useRef } from "react";

import allStylesHref from "./styles/all.css?url";

import { configAuthSupportedForm } from "~/utils/config";

import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { PrimeReactProvider } from "primereact/api";

import { loadTranslations } from "./backend.server/translations";
import { createTranslationScript } from "./frontend/translations";
import { getLanguageAllowDefault } from "./utils/lang.backend";
import { ViewContext } from "./frontend/context";
import { isAdminRoute } from "./utils/url.backend";
import { authLoaderGetOptionalUserForFrontend } from "./utils/auth";
import { Toast } from "primereact/toast";
import RegularMenuBar from "./components/RegularMenuBar";
import SuperAdminMenuBar from "./components/SuperAdminMenuBar";
import InactivityWarning from "./components/InactivityWarning";
import { isRouteErrorResponse, useRouteError, useRouteLoaderData } from "react-router";
import { Footer } from "./frontend/footer/footer";

import { getUserRoleFromSession } from "~/utils/session";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: "/assets/css/style-dts.css?asof=20250630" },
	{ rel: "stylesheet", href: allStylesHref },
	{ rel: "stylesheet", href: "/assets/themes/lara-light-blue/theme.css" },
];

export const loader = async (
	routeArgs: LoaderFunctionArgs,
): Promise<Response> => {
	const { request } = routeArgs;
	const onAdminRoute = isAdminRoute(request);

	const user = await getUserFromSession(request);
	const superAdminSession = await getSuperAdminSession(request);
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	const message = getFlashMessage(session);
	const userForRoute = onAdminRoute ? undefined : user;
	const superAdminSessionForRoute = onAdminRoute ? superAdminSession : undefined;

	const userRole = await getUserRoleFromSession(request);
	const isCountryAccountSelected = onAdminRoute
		? false
		: (await getCountryAccountsIdFromSession(request))
			? true
			: false;
	const isFormAuthSupported = configAuthSupportedForm();

	let activeInstanceCount = 0;
	if (userForRoute) {
		activeInstanceCount = await UserCountryAccountRepository.countActiveByUserId(userForRoute.user.id);
	}

	// Admin routes only honor super admin sessions.
	const isSuperAdmin = !!superAdminSessionForRoute;
	const effectiveUserRole = onAdminRoute
		? isSuperAdmin
			? "super_admin"
			: ""
		: userRole;

	// Use different settings for super admin routes
	let settings;
	if (onAdminRoute) {
		// Admin routes always use default global settings.
		settings = null; // This will cause defaults to be used below
	} else {
		// For regular user routes, use country-specific settings
		settings = await getCountrySettingsFromSession(request);
	}

	const websiteName = settings ? settings.websiteName : undefined;
	const websiteLogo = settings
		? settings.websiteLogo
		: "/assets/country-instance-logo.png";
	const footerUrlPrivacyPolicy = settings
		? settings.footerUrlPrivacyPolicy
		: "";
	const footerUrlTermsConditions = settings
		? settings.footerUrlTermsConditions
		: "";
	const dtsInstanceCtryIso3 = settings ? settings.dtsInstanceCtryIso3 : "USA";
	const currencyCode = settings ? settings.currencyCode : "USD";

	const lang = getLanguageAllowDefault(routeArgs);
	const userForFrontend = onAdminRoute
		? isSuperAdmin
			? {
				role: "super_admin",
				firstName: "Super",
				lastName: "Admin",
			}
			: null
		: await authLoaderGetOptionalUserForFrontend(routeArgs);

	const translations = loadTranslations(lang);

	return Response.json(
		{
			common: {
				lang,
				user: userForFrontend,
			},
			translations,
			isLoggedIn: onAdminRoute ? isSuperAdmin : !!userForRoute,
			isCountryAccountSelected,
			activeInstanceCount,
			userRole: effectiveUserRole || "",
			isSuperAdmin: isSuperAdmin,
			isFormAuthSupported: isFormAuthSupported,
			flashMessage: message,
			confSiteName: websiteName,
			confSiteLogo: websiteLogo,
			confFooterURLPrivPolicy: footerUrlPrivacyPolicy,
			confFooterURLTermsConds: footerUrlTermsConditions,
			env: {
				CURRENCY_CODES: currencyCode,
				DTS_INSTANCE_CTRY_ISO3: dtsInstanceCtryIso3,
				SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "",
				SUPPORT_URL: process.env.SUPPORT_URL || "",
			},
		},
		{
			headers: {
				"Set-Cookie": await sessionCookie().commitSession(session),
			},
		},
	);
};

export default function Screen() {
	const loaderData = useLoaderData();
	const location = useLocation();
	let ctx = new ViewContext();
	const onAdminRoute = location.pathname.startsWith(ctx.url("/admin/"));

	const {
		isLoggedIn,
		flashMessage,
		confSiteName,
		// confSiteLogo,
		confFooterURLPrivPolicy,
		confFooterURLTermsConds,
		userRole,
		// isSuperAdmin,
		// isFormAuthSupported,
		lang,
		translations,
		isCountryAccountSelected,
		activeInstanceCount
	} = loaderData;
	const firstName = loaderData.common?.user?.firstName || "";
	const lastName = loaderData.common?.user?.lastName || "";
	const toast = useRef<Toast>(null);

	useEffect(() => {
		if (flashMessage) {
			toast?.current?.show({
				severity: flashMessage.type,
				detail: flashMessage.text,
				life: 3000,
			});
		}
	}, [flashMessage]);

	return (
		<html
			lang={loaderData.common.lang}
			dir={loaderData.common.lang === "ar" ? "rtl" : "ltr"}
		>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<link rel="icon" type="image/x-icon" href="/favicon.ico" />
				<Meta />
				<Links />
				<script
					dangerouslySetInnerHTML={{
						__html: createTranslationScript(lang, translations),
					}}
				/>
			</head>
			<body>
				<Toast ref={toast} position={loaderData.common.lang === "ar" ? "top-left" : "top-right"} />
				<PrimeReactProvider
					value={{
						ripple: true,
					}}
				>
					<InactivityWarning ctx={ctx} loggedIn={isLoggedIn} />
					<div className="min-h-screen flex flex-col  bg-gray-50">

						{/* Header */}
						<header className="w-full bg-white border-b border-gray-200">
							<div className="mx-auto max-w-8xl px-4 md:px-6 lg:px-8 py-4">
								{onAdminRoute ? (
									<SuperAdminMenuBar
										isLoggedIn={isLoggedIn}
										siteName={confSiteName}
										firstName={firstName}
										lastName={lastName}
									/>
								) : (
									<RegularMenuBar
										isLoggedIn={isLoggedIn}
										userRole={userRole}
										isCountryAccountSelected={isCountryAccountSelected}
										activeInstanceCount={activeInstanceCount}
										siteName={confSiteName}
										firstName={firstName}
										lastName={lastName}
									/>
								)}
							</div>
						</header>

						{/* Main Content */}
						<main className="flex-1 w-full">
							<div className="w-full py-8">
								<Outlet />
							</div>
						</main>

						{/* Footer */}
						<footer>
							<Footer
								ctx={ctx}
								siteName={confSiteName}
								urlPrivacyPolicy={confFooterURLPrivPolicy}
								urlTermsConditions={confFooterURLTermsConds}
							/>
						</footer>
					</div>


				</PrimeReactProvider>
				<Scripts />
			</body>
		</html>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();

	const isDev = process.env.NODE_ENV === "development";
	// Runtime env vars unavailable client-side via process.env — must be serialised through the root loader
	const rootData = useRouteLoaderData("root") as any;
	const supportUrl = rootData?.env?.SUPPORT_URL || "";
	const supportEmail = rootData?.env?.SUPPORT_EMAIL || "";

	let title = "Unexpected Error";
	let message = "Something went wrong. Please try again later.";

	if (isRouteErrorResponse(error)) {
		title = `${error.status} ${error.statusText}`;
		if (isDev) {
			message = String(error.data);
		}
	} else if (error instanceof Error) {
		if (isDev) {
			message = error.message;
		}
	}

	return (
		<html>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<title>Error</title>
				<Meta />
				<Links />
			</head>
			<body>
				<div className="min-h-screen bg-gray-50 px-8 py-12">
					<div className="w-full bg-white shadow-sm border border-gray-200 rounded-xl p-8">

						<div className="flex items-start gap-4 mb-6">
							<i className="pi pi-exclamation-triangle text-3xl text-red-500"></i>

							<div>
								<h1 className="text-2xl font-semibold text-gray-900">
									{title}
								</h1>

								<p className="text-gray-600 mt-2">
									{message}
								</p>
							</div>
						</div>

						<a
							href="/"
							className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
						>
							Return to Home
						</a>

						{/* Support Contact */}
						{(supportUrl || supportEmail) && (
							<div className="mt-8 border-t pt-6 text-sm text-gray-600">
								If the problem persists, please contact support at{" "}
								<a
									href={supportUrl ? supportUrl : `mailto:${supportEmail}`}
									className="text-blue-600 hover:underline font-medium"
								>
									Contact Us
								</a>
								.
							</div>
						)}

						{isDev && error instanceof Error && (
							<pre className="mt-8 text-xs bg-gray-100 p-4 rounded overflow-auto border">
								{error.stack}
							</pre>
						)}

					</div>
				</div>

				<Scripts />
			</body>
		</html>
	);
}
