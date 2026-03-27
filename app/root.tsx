import type { LinksFunction } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import {
	useLoaderData,
	Links,
	Meta,
	Outlet,
	Scripts,
	useNavigation,
	useFetcher,
} from "react-router";

import { ToastContainer } from "react-toastify/unstyled";

import {
	sessionCookie,
	getFlashMessage,
	getUserFromSession,
	getCountrySettingsFromSession,
	getSuperAdminSession,
	getCountryAccountsIdFromSession,
} from "~/utils/session";

import { useEffect, useRef, useState } from "react";

import allStylesHref from "./styles/all.css?url";

import { configAuthSupportedForm } from "~/utils/config";

import {
	sessionActivityTimeoutMinutes,
	sessionActivityWarningBeforeTimeoutMinutes,
} from "~/utils/session-activity-config";
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
import MainMenuBar from "./components/MainMenuBar";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Footer } from "./frontend/footer/footer";

import { getUserRoleFromSession } from "~/utils/session";

export const links: LinksFunction = () => [
	{ rel: "stylesheet", href: "/assets/css/style-dts.css?asof=20250630" },
	{ rel: "stylesheet", href: allStylesHref },
	{ rel: "stylesheet", href: "/assets/themes/lara-light-blue/theme.css" },
];

export const loader = async (
	routeArgs: LoaderFunctionArgs,
): Promise<Response> => {
	const { request } = routeArgs;

	const user = await getUserFromSession(request);
	const superAdminSession = await getSuperAdminSession(request);
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	const message = getFlashMessage(session);

	const userRole = await getUserRoleFromSession(request);
	const isCountryAccountSelected = await getCountryAccountsIdFromSession(request) ? true : false;
	const isFormAuthSupported = configAuthSupportedForm();

	// Determine if this is a super admin session and on an admin route
	const isSuperAdmin = !!superAdminSession && isAdminRoute(request);
	const effectiveUserRole = isSuperAdmin ? "super_admin" : userRole;

	// Use different settings for super admin routes
	let settings;
	if (isSuperAdmin) {
		// For super admin routes, use default global settings
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
	let userForFrontend = await authLoaderGetOptionalUserForFrontend(routeArgs);

	const translations = loadTranslations(lang);

	return Response.json(
		{
			common: {
				lang,
				user: userForFrontend,
			},
			translations,
			isLoggedIn: !!user || (!!superAdminSession && isAdminRoute(request)),
			isCountryAccountSelected,
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
			},
		},
		{
			headers: {
				"Set-Cookie": await sessionCookie().commitSession(session),
			},
		},
	);
};

interface InactivityWarningProps {
	ctx: ViewContext;
	loggedIn: boolean;
}
function InactivityWarning(props: InactivityWarningProps) {
	const ctx = props.ctx;
	const navigation = useNavigation();
	const [lastActivity, setLastActivity] = useState(new Date());
	const [showWarning, setShowWarning] = useState(false);
	const [expiresInMinutes, setExpiresInMinutes] = useState(0);

	useEffect(() => {
		console.log("navigation state changed", navigation.state);
		setLastActivity(new Date());
	}, [navigation.state]);

	useEffect(() => {
		const update = () => {
			console.log("Checking login session expiration");
			const now = new Date();
			const minutesSinceLastActivity =
				(now.getTime() - lastActivity.getTime()) / (1000 * 60);

			if (
				minutesSinceLastActivity >
				sessionActivityTimeoutMinutes -
				sessionActivityWarningBeforeTimeoutMinutes
			) {
				setShowWarning(true);
				setExpiresInMinutes(
					Math.max(0, sessionActivityTimeoutMinutes - minutesSinceLastActivity),
				);
			} else {
				setShowWarning(false);
			}
		};
		update();
		const interval = setInterval(update, 10 * 1000);
		return () => clearInterval(interval);
	}, [lastActivity]);

	const fetcher = useFetcher();

	if (!props.loggedIn) {
		return null;
	}
	const handleRefreshSession = () => {
		setLastActivity(new Date());
		fetcher.load(ctx.url("/user/refresh-session"));
	};

	return (
		<>
			{showWarning ? (
				<div className="fixed top-0 left-0 w-full z-50">
					<div className="container mx-auto">
						<div className="dts-alert dts-alert--error">
							<div className="dts-alert__icon">
								<svg
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<span>
								{expiresInMinutes > 0.1 ? (
									<div className="flex flex-col gap-4">
										<p className="text-base">
											Login session expires in {Math.round(expiresInMinutes)}{" "}
											minutes due to inactivity.
										</p>
										<div>
											<button
												onClick={handleRefreshSession}
												className="mg-button mg-button-outline mg-button-sm"
											>
												Refresh session
											</button>
										</div>
									</div>
								) : (
									<p>Session expired</p>
								)}
							</span>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}

export default function Screen() {
	const loaderData = useLoaderData();
	let ctx = new ViewContext();

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
		isCountryAccountSelected
	} = loaderData;
	const firstName = loaderData.common?.user?.firstName || "";
	const lastName = loaderData.common?.user?.lastName || "";
	// Display toast for flash messages
	const toast = useRef<Toast>(null);
	useEffect(() => {
		if (flashMessage) {
			toast?.current?.show({ severity: flashMessage.type, detail: flashMessage.text });
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
				<ToastContainer
					position="top-center"
					autoClose={5000}
					hideProgressBar={false}
					newestOnTop={true}
					closeOnClick={true}
					pauseOnHover={true}
					draggable={false}
					toastClassName="custom-toast"
				/>
				<Toast ref={toast} />
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
								<h1 className="text-xl font-semibold text-gray-900">
									<MainMenuBar
										isLoggedIn={isLoggedIn}
										userRole={userRole}
										isCountryAccountSelected={isCountryAccountSelected}
										siteName={confSiteName}
										firstName={firstName}
										lastName={lastName} />
								</h1>
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
						<div className="mt-8 border-t pt-6 text-sm text-gray-600">
							If the problem persists, please contact support at{" "}
							<a
								href="mailto:support@example.org"
								className="text-blue-600 hover:underline font-medium"
							>
								support@example.org
							</a>
							.
						</div>

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
