import type { LinksFunction } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

import {
	useLoaderData,
	Links,
	Meta,
	Outlet,
	Scripts,
	useLocation,
	useNavigation,
	useFetcher,
	useSubmit,
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
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import MainMenuBar from "./components/MainMenuBar";
import { isRouteErrorResponse, useRouteError } from "react-router";
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

	const user = await getUserFromSession(request);
	const superAdminSession = await getSuperAdminSession(request);
	const session = await sessionCookie().getSession(
		request.headers.get("Cookie"),
	);
	const message = getFlashMessage(session);

	const userRole = await getUserRoleFromSession(request);
	const isCountryAccountSelected = await getCountryAccountsIdFromSession(request) ? true : false;
	const isFormAuthSupported = configAuthSupportedForm();

	let activeInstanceCount = 0;
	if (user) {
		activeInstanceCount = await UserCountryAccountRepository.countActiveByUserId(user.user.id);
	}

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
	const location = useLocation();
	const navigation = useNavigation();
	const submit = useSubmit();
	const [lastActivity, setLastActivity] = useState(new Date());
	const [showWarning, setShowWarning] = useState(false);
	const [expiresInMinutes, setExpiresInMinutes] = useState(0);

	useEffect(() => {
		setLastActivity(new Date());
	}, [navigation.state]);

	useEffect(() => {
		const update = () => {
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

	const handleRefreshSession = () => {
		setLastActivity(new Date());
		fetcher.load(ctx.url("/user/refresh-session"));
	};

	const logoutAction = location.pathname.startsWith(ctx.url("/admin/"))
		? ctx.url("/admin/logout")
		: ctx.url("/user/logout");

	const handleGoToLogin = () => {
		submit(null, { method: "post", action: logoutAction });
	};

	const isExpired = expiresInMinutes <= 0.1;

	if (!props.loggedIn) {
		return null;
	}

	return (
		<>
			<Dialog
				visible={showWarning}
				onHide={() => { }}
				modal
				closable={false}
				draggable={false}
				resizable={false}
				style={{ width: "92%", maxWidth: "560px" }}
				header={
					<div className="flex items-center gap-2">
						<i
							className={`pi ${isExpired ? "pi-times-circle text-red-600" : "pi-exclamation-triangle text-amber-600"}`}
						/>
						<span className="font-semibold text-base text-gray-900">
							{isExpired ? "Session expired" : "Session expiration warning"}
						</span>
					</div>
				}
			>
				<div className="flex flex-col gap-4">
					{isExpired ? (
						<p className="text-sm text-gray-700 leading-relaxed">
							{ctx.t({ code: "session.expired_message", msg: "Your session has expired due to inactivity. Please sign in again to continue." })}
						</p>
					) : (
						<p className="text-sm text-gray-700 leading-relaxed">
							{ctx.t(
								{
									code: "session.expiry_warning_minutes",
									msgs: {
										one: "For your security, your session will expire in {n} minute due to inactivity.",
										other: "For your security, your session will expire in {n} minutes due to inactivity.",
									},
								},
								{ n: Math.round(expiresInMinutes) },
							)}
						</p>
					)}

					<div className="flex items-center justify-end gap-2">
						{!isExpired ? (
							<Button
								type="button"
								label="Refresh session"
								icon="pi pi-refresh"
								onClick={handleRefreshSession}
								loading={fetcher.state !== "idle"}
								severity="warning"
							/>
						) : null}
						<Button
							type="button"
							label="Go to Sign in"
							icon="pi pi-arrow-right"
							onClick={handleGoToLogin}
							outlined={!isExpired}
							severity={isExpired ? "danger" : "secondary"}
						/>
					</div>
				</div>
			</Dialog>
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
		isCountryAccountSelected,
		activeInstanceCount
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
								<MainMenuBar
									isLoggedIn={isLoggedIn}
									userRole={userRole}
									isCountryAccountSelected={isCountryAccountSelected}
									activeInstanceCount={activeInstanceCount}
									siteName={confSiteName}
									firstName={firstName}
									lastName={lastName} />
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
