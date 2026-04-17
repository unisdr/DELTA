import type { MetaFunction } from "react-router";
import {
	ActionFunctionArgs,
	Link,
	LoaderFunctionArgs,
	redirectDocument,
	useNavigate,
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
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";
import { UserRepository } from "~/db/queries/UserRepository";
import { createCSRFToken } from "~/utils/csrf";
import { redirectLangFromRoute, replaceLang } from "~/utils/url.backend";
import { ViewContext } from "~/frontend/context";


import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";
import { urlLang } from "~/utils/url";
import { countryAccountStatuses } from "~/drizzle/schema";
import { Card } from "primereact/card";

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
			await CountryAccountsRepository.getByIdWithCountry(countryAccountId);
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
	const userCountryAccounts = await UserCountryAccountRepository.getByUserId(res.userId);
	const headerSession = await createUserSession(res.userId);
	const user = await UserRepository.getById(res.userId);

	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(ctx, redirectTo);

	if (user?.totpEnabled) {
		return redirectLangFromRoute(
			routeArgs,
			`/user/totp-login?redirectTo=${encodeURIComponent(redirectTo)}`,
			{ headers: headerSession },
		);
	}

	if (userCountryAccounts && userCountryAccounts.length === 1) {
		const countrySettings = await InstanceSystemSettingRepository.getByCountryAccountId(
			userCountryAccounts[0].countryAccountsId,
		);

		const session = await sessionCookie().getSession(
			headerSession["Set-Cookie"],
		);
		session.set("countryAccountsId", userCountryAccounts[0].countryAccountsId);
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
	return redirectDocument(redirectTo, {
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
		const userCountryAccounts = await UserCountryAccountRepository.getByUserId(
			user.user.id,
		);
		if (userCountryAccounts.length > 1) {
			const countryAccountsId = await getCountryAccountsIdFromSession(request);
			if (countryAccountsId) {
				return redirectDocument(redirectTo, {
					headers: { "Set-Cookie": setCookie },
				});
			} else {
				return redirectLangFromRoute(args, "/user/select-instance", {
					headers: { "Set-Cookie": setCookie },
				});
			}
		}

		return redirectDocument(redirectTo, {
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
	return ctx.url("/");
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

	const navigate = useNavigate();
	const { isFormAuthSupported, isSSOAuthSupported } = loaderData;

	return (
		<div className="flex items-center justify-center min-h-screen  bg-gray-50 px-4">
			<div className="w-full md:w-1/2 lg:w-1/3">
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-center gap-3 mb-4">
						{/* <div
							className="w-12 h-12 rounded-lg flex items-center justify-center"
							style={{ backgroundColor: "#004F91" }}
						>
							<i className="pi pi-globe text-white" style={{ fontSize: "1.5rem" }}></i>
						</div> */}
						<div className="flex flex-col">
							<span className="font-bold text-2xl leading-none tracking-tight text-[#004F91]">
								DELTA
							</span>
							<span className="text-xs uppercase font-bold text-gray-500 tracking-[0.1em] mt-0.5">
								Resilience
							</span>
						</div>
					</div>
					{isFormAuthSupported && (
						<Card className="w-full drop-shadow-xl rounded-2xl">
							<div className="text-center mb-4">
								<h2 className="text-2xl font-semibold mb-2">
									{ctx.t({
										code: "user_login.welcome_back",
										msg: "Welcome back",
									})}
								</h2>
								<p className="text-sm text-gray-500">
									{ctx.t({
										code: "user_login.sign_in_to_continue",
										msg: "Sign in to your account to continue",
									})}
								</p>
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
										</label>

										<div className="p-inputgroup login-inputgroup">
											<span className="p-inputgroup-addon">
												<i className="pi pi-envelope"></i>
											</span>
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
										</div>

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
										</label>

										<div className="p-inputgroup login-inputgroup">
											<span className="p-inputgroup-addon">
												<i className="pi pi-lock"></i>
											</span>
											<Password
												id="password"
												name="password"
												className="w-full"
												style={{ width: "100%", flex: 1 }}
												inputClassName="w-full"
												inputStyle={{ width: "100%" }}
												toggleMask
												autoComplete="true"
												pt={{
													root: { className: "w-full", style: { width: "100%", flex: 1 } },
													iconField: { root: { className: "w-full" } },
													input: { className: "w-full" },
													hideIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
													showIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
												}}
												feedback={false}
												placeholder={ctx.t({
													code: "user_login.enter_your_password",
													msg: "Enter your password",
												})}
												required
											/>
										</div>

										{errors?.fields?.password && (
											<div className="text-sm text-red-500">
												{errorToString(errors.fields.password[0])}
											</div>
										)}
									</div>

									<div className="self-end text-end">
										<Button
											link
											type="button"
											label={ctx.t({
												code: "user_login.forgot_password",
												msg: "Forgot password?",
											})}
											onClick={() => navigate(`/${ctx.lang}/user/forgot-password`)}
										/>
									</div>

									<Button
										type="submit"
										label={ctx.t({ code: "user_login.sign_in", msg: "Sign in" })}
										icon="pi pi-sign-in"
										loading={isSubmitting}
										className="w-full mt-2"
									/>
								</div>
							</Form>

							{/* Divider */}
							{isSSOAuthSupported && (
								<Divider align="center">
									<span>
										{ctx.t({
											code: "common.or",
											msg: "Or",
										})}
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
						</Card>
					)}

					{!isFormAuthSupported && isSSOAuthSupported && (
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
		</div>
	);
}
