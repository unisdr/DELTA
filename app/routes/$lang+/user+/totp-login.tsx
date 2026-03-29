import { Form, useActionData, useNavigation } from "react-router";
import { formStringData } from "~/utils/httputil";
import {
	loginTotp,
	authActionGetAuth,
	authLoaderGetAuth,
	authLoaderAllowNoTotp,
	authActionAllowNoTotp,
} from "~/utils/auth";
import { getCountrySettingsFromSession } from "~/utils/session";
import { redirectLangFromRoute } from "~/utils/url.backend";
import { ViewContext } from "~/frontend/context";
import { Card } from "primereact/card";
import { InputMask } from "primereact/inputmask";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

type TotpLoginErrors = {
	form?: string[];
	code?: string[];
};

export const action = authActionAllowNoTotp(async (actionArgs) => {
	const { request } = actionArgs;
	const url = new URL(request.url);
	const redirectTo = url.searchParams.get("redirectTo");
	let safeRedirectTo =
		redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";

	const langPrefix = actionArgs.params.lang
		? `/${actionArgs.params.lang}`
		: "";
	if (
		langPrefix &&
		(safeRedirectTo === langPrefix ||
			safeRedirectTo.startsWith(`${langPrefix}/`))
	) {
		safeRedirectTo = safeRedirectTo.slice(langPrefix.length) || "/";
	}
	const { user, sessionId } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());
	const code = formData.code || "";
	const settings = await getCountrySettingsFromSession(request);
	const totpIssuer = settings?.totpIssuer || "";
	const res = await loginTotp(user.id, sessionId, code, totpIssuer);
	if (!res.ok) {
		let errors: TotpLoginErrors = {
			form: [res.error],
		};
		return { errors };
	}
	return redirectLangFromRoute(actionArgs, safeRedirectTo);
});

export const loader = authLoaderAllowNoTotp(async (loaderArgs) => {
	const { user, session } = authLoaderGetAuth(loaderArgs);
	if (!user.totpEnabled) {
		return redirectLangFromRoute(loaderArgs, "/");
	}
	if (session.totpAuthed) {
		return redirectLangFromRoute(loaderArgs, "/");
	}
	return {};
});

export default function Screen() {
	const ctx = new ViewContext();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	const actionData = useActionData<typeof action>();
	const errors: TotpLoginErrors = actionData?.errors || {};
	return (
		<section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-4 py-8">
			<div className="w-full max-w-md">
				<Card className="w-full shadow-lg">
					<Form method="post" className="flex flex-col gap-5">
						<div className="text-center">
							<h1 className="text-2xl font-semibold text-gray-900">
								{ctx.t({
									code: "users.login_with_totp",
									msg: "Login with TOTP",
								})}
							</h1>
							<p className="mt-2 text-sm text-gray-600">
								{ctx.t({
									code: "users.enter_totp_generated_code",
									msg: "Enter the code from your authenticator app to continue.",
								})}
							</p>
						</div>

						{errors.form?.map((error, idx) => (
							<Message
								key={`form-error-${idx}`}
								severity="error"
								text={error}
							/>
						))}

						<div className="flex flex-col gap-2">
							<label htmlFor="code" className="font-semibold text-gray-800">
								{ctx.t({
									code: "users.totp_generated_code",
									msg: "Generated code",
								})}
							</label>
							<InputMask
								id="code"
								name="code"
								autoFocus
								type="text"
								autoComplete="one-time-code"
								mask="999999"
								slotChar="-"
								className="w-full"
								onInput={(e) => {
									const input = e.currentTarget;
									input.value = input.value.replace(/\D/g, "").slice(0, 6);
								}}
								invalid={Boolean(errors.code?.length)}
							/>
							{errors.code?.map((error, idx) => (
								<Message
									key={`code-error-${idx}`}
									severity="error"
									text={error}
								/>
							))}
						</div>

						<Button
							type="submit"
							label={ctx.t({
								code: "users.login_with_totp",
								msg: "Login with TOTP",
							})}
							loading={isSubmitting}
							className="w-full"
						/>
					</Form>
				</Card>
			</div>
		</section>
	);
}
