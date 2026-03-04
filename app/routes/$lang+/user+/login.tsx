import type { MetaFunction } from "react-router";
import {
	ActionFunctionArgs,
	Link,
	LoaderFunctionArgs,
	redirectDocument,
	useNavigation,
} from "react-router";
import { useLoaderData, useActionData } from "react-router";
import { errorToString, Form, Errors as FormErrors } from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import {
	getUserFromSession,
	createUserSession,
	sessionCookie,
	getCountryAccountsIdFromSession,
} from "~/utils/session";
import { login } from "~/backend.server/models/user/auth";
import {
	configAuthSupportedAzureSSOB2C,
	configAuthSupportedForm,
} from "~/utils/config";
import { getCountryAccountWithCountryById } from "~/db/queries/countryAccounts";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { createCSRFToken } from "~/utils/csrf";
import { redirectLangFromRoute, replaceLang } from "~/utils/url.backend";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";
import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";
import { urlLang } from "~/utils/url";
import { countryAccountStatuses } from "~/drizzle/schema";

interface LoginFields {
	email: string;
	password: string;
}
type ActionData = {
	data?: LoginFields;
	errors?: FormErrors<LoginFields> & {
		general?: string[];
	};
};

type LoaderData = {
	redirectTo: string;
	isFormAuthSupported: boolean;
	isSSOAuthSupported: boolean;
	csrfToken: string;
};

export const action = async (routeArgs: ActionFunctionArgs) => {
	let { request } = routeArgs;
	const ctx = new BackendContext(routeArgs);

	// Check if form authentication is supported
	if (!configAuthSupportedForm()) {
		return Response.json(
			{
				data: {},
				errors: {
					general: [
						"Form-based authentication is not available. Please use SSO.",
					],
				},
			},
			{ status: 400 },
		);
	}

	const formData = formStringData(await request.formData());
	const data: LoginFields = {
		email: formData.email || "",
		password: formData.password || "",
	};

	const cookieHeader = request.headers.get("Cookie") || "";
	const sessionCurrent = await sessionCookie().getSession(cookieHeader);

	if (formData.csrfToken !== sessionCurrent.get("csrfToken")) {
		return Response.json(
			{
				data,
				errors: {
					general: [
						ctx.t({
							code: "common.csrf_validation_failed",
							msg: "CSRF validation failed. Please ensure you're submitting the form from a valid session. For your security, please restart your browser and try again.",
						}),
					],
				},
			},
			{ status: 400 },
		);
	}

	const res = await login(data.email, data.password);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			general: [
				ctx.t({
					code: "user_login.email_or_password_do_not_match",
					msg: "Email or password do not match",
				}),
			],
		};
		return Response.json({ data, errors }, { status: 400 });
	}

	// Check if user's country accounts is inactive, then show error message and redirect to login
	const countryAccountId = res.countryAccountId;
	if (countryAccountId) {
		const countryAccount =
			await getCountryAccountWithCountryById(countryAccountId);
		if (
			countryAccount &&
			countryAccount.status === countryAccountStatuses.INACTIVE
		) {
			return Response.json(
				{
					data,
					errors: { general: ["Your country account is inactive"] },
				},
				{ status: 400 },
			);
		}
	}

	//check if he has more than one instance assosiated, redirect to select-instance page,
	//otherwise take him to first page.
	const userCountryAccounts = await getUserCountryAccountsByUserId(res.userId);
	const headerSession = await createUserSession(res.userId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(ctx, redirectTo);

	if (userCountryAccounts && userCountryAccounts.length === 1) {
		const countrySettings = await getInstanceSystemSettingsByCountryAccountId(
			userCountryAccounts[0].countryAccountsId,
		);

		const session = await sessionCookie().getSession(
			headerSession["Set-Cookie"],
		);
		session.set("countryAccountsId", userCountryAccounts[0].countryAccountsId);
		session.set("userRole", userCountryAccounts[0].role);
		session.set("countrySettings", countrySettings);
		const setCookie = await sessionCookie().commitSession(session);

		redirectTo =
			replaceLang(redirectTo, countrySettings?.language || "en")
		console.log("redirectTo=", redirectTo)
		return redirectDocument(redirectTo, {
			headers: { "Set-Cookie": setCookie },
		});
	} else if (userCountryAccounts && userCountryAccounts.length > 1) {
		return redirectLangFromRoute(routeArgs, "/user/select-instance", {
			headers: headerSession,
		});
	}
	return redirectLangFromRoute(routeArgs, redirectTo, {
		headers: headerSession,
	});
};

export const loader = async (args: LoaderFunctionArgs) => {
	const ctx = new BackendContext(args);
	const { request } = args;

	const user = await getUserFromSession(request);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(ctx, redirectTo);

	const csrfToken = createCSRFToken();

	// Ensure SSO origin is explicitly set for user login
	const cookieHeader = request.headers.get("Cookie") || "";
	const session = await sessionCookie().getSession(cookieHeader);
	session.set("loginOrigin", "user");
	session.set("csrfToken", csrfToken);
	const setCookie = await sessionCookie().commitSession(session);

	if (user) {
		const userCountryAccounts = await getUserCountryAccountsByUserId(
			user.user.id,
		);
		if (userCountryAccounts.length > 1) {
			const countryAccountsId = await getCountryAccountsIdFromSession(request);
			if (countryAccountsId) {
				return redirectLangFromRoute(args, redirectTo, {
					headers: { "Set-Cookie": setCookie },
				});
			} else {
				return redirectLangFromRoute(args, "/user/select-instance", {
					headers: { "Set-Cookie": setCookie },
				});
			}
		}

		return redirectLangFromRoute(args, redirectTo, {
			headers: { "Set-Cookie": setCookie },
		});
	}

	const isFormAuthSupported = configAuthSupportedForm();
	const isSSOAuthSupported = configAuthSupportedAzureSSOB2C();

	// If no authentication methods are configured, show error
	if (!isFormAuthSupported && !isSSOAuthSupported) {
		throw new Error(
			"No authentication methods configured. Please check AUTHENTICATION_SUPPORTED environment variable.",
		);
	}

	return Response.json(
		{
			redirectTo: redirectTo,
			isFormAuthSupported: isFormAuthSupported,
			isSSOAuthSupported: isSSOAuthSupported,
			csrfToken: csrfToken,
		},
		{ headers: { "Set-Cookie": setCookie } },
	);
};

export function getSafeRedirectTo(
	ctx: BackendContext,
	redirectTo: string | null,
): string {
	if (redirectTo && redirectTo.startsWith("/")) {
		return redirectTo;
	}
	return ctx.url("");
}

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "common.sign-in",
					msg: "Sign-in",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "common.login",
				msg: "Login",
			}),
		},
	];
};

export default function Screen() {
	const loaderData = useLoaderData<LoaderData>();
	const ctx = new ViewContext();
	const actionData = useActionData<ActionData>();

	const errors = actionData?.errors || {};
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting" &&
		navigation.formData?.get("email") != null;

	const { isFormAuthSupported, isSSOAuthSupported } = loaderData;

	return (
		<main className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
			<div className="w-full md:w-1/2 lg:w-1/3">
				<div className="flex flex-col gap-4">
					{isFormAuthSupported && (
						<Card className="w-full drop-shadow-xl rounded-2xl">
							<div className="text-center mb-4">
								<i
									className="pi pi-lock block mb-4 text-gray-700"
									style={{ fontSize: "2rem" }}
								></i>

								<h2 className="text-2xl font-semibold mb-2">
									{ctx.t({
										code: "user_login.sign_in",
										msg: "Sign in",
									})}
								</h2>
							</div>
							<div className="mb-2 text-red-500">
								{`* ${ctx.t({
									code: "common.required_information",
									msg: "Required information",
								})}`}
							</div>

							<div className="flex flex-col gap-1 items-start text-left w-full mb-2">
								{errors.general && (
									<Message
										className="mb-2"
										severity="error"
										text={errors.general}
									/>
								)}
							</div>

							<Form ctx={ctx} id="login-form" errors={errors}>
								<div className="flex flex-col gap-4">
									<input type="hidden" name="redirectTo" value={loaderData.redirectTo} />
									<input type="hidden" name="csrfToken" value={loaderData.csrfToken} />

									{/* Email */}
									<div className="flex flex-col gap-2">
										<label htmlFor="email" className="font-semibold">
											{ctx.t({ code: "user_login.email_address", msg: "Email address" })}
											<span className="text-red-500"> *</span>
										</label>

										<InputText
											id="email"
											type="email"
											name="email"
											className="w-full"
											placeholder={ctx.t({
												code: "user_login.enter_your_email",
												msg: "Enter your email",
											})}
											required
										/>

										{errors?.fields?.email && (
											<div className="text-sm text-red-500">
												{errorToString(errors.fields.email[0])}
											</div>
										)}
									</div>

									{/* Password */}
									<div className="flex flex-col gap-2">
										<label htmlFor="password" className="font-semibold">
											{ctx.t({ code: "user_login.password", msg: "Password" })}
											<span className="text-red-500"> *</span>
										</label>

										<Password
											id="password"
											name="password"
											toggleMask
											pt={{
												iconField: { root: { className: "w-full" } },
												input: { className: "w-full" },
											}}
											feedback={false}
											placeholder={ctx.t({
												code: "user_login.enter_your_password",
												msg: "Enter your password",
											})}
											required
										/>

										{errors?.fields?.password && (
											<div className="text-sm text-red-500">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</div>

									<u>
										<LangLink lang={ctx.lang} to="/user/forgot-password">
											{ctx.t({
												code: "user_login.forgot_password",
												msg: "Forgot password?",
											})}
										</LangLink>
									</u>

									<Button
										type="submit"
										label={ctx.t({ code: "user_login.sign_in", msg: "Sign in" })}
										icon="pi pi-sign-in"
										loading={isSubmitting}
										className="w-full mt-2"
									/>
								</div>
							</Form>
						</Card>
					)}

					{/* Divider */}
					{isFormAuthSupported && isSSOAuthSupported && (
						<Divider align="center">
							<span className="uppercase">
								{ctx.t({ code: "common.or", msg: "Or" })}
							</span>
						</Divider>
					)}

					{isSSOAuthSupported && (
						<div className="flex flex-col gap-4 text-center mb-5">
							{ctx.t({
								code: "user_login.intro_sso_only",
								msg: "Use your organization's Single Sign-On to access your account.",
							})}

							<Link to={urlLang(ctx.lang, "/sso/azure-b2c/login")}>
								<Button
									label={ctx.t({
										code: "user_login.sign_in_with_azure_b2c_sso",
										msg: "Sign in with Azure B2C SSO",
									})}
									severity="secondary"
									className="w-full"
									outlined
								/>
							</Link>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
