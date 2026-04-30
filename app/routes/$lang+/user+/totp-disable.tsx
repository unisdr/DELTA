import { Form, useLoaderData, useActionData, useNavigation } from "react-router";
import { formStringData } from "~/utils/httputil";
import {
	authAction,
	authActionGetAuth,
	authLoader,
	authLoaderGetAuth,
} from "~/utils/auth";
import { setTotpEnabled } from "~/backend.server/models/user/totp";
import {
	getCountrySettingsFromSession,
	redirectWithMessage,
} from "~/utils/session";
import { MainContainer } from "~/frontend/container";
import { redirectLangFromRoute } from "~/utils/url.backend";
import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { Card } from "primereact/card";
import { InputMask } from "primereact/inputmask";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

interface TotpDisableErrors {
	form?: string[];
	code?: string[];
}

export const action = authAction(async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());

	const token = formData.code || "";

	const settings = await getCountrySettingsFromSession(request);
	const totpIssuer = settings?.totpIssuer || "";
	const res = await setTotpEnabled(user.id, token, false, totpIssuer);

	let errors: TotpDisableErrors = {};
	if (!res.ok) {
		errors.form = [res.error];
		return { ok: false, errors: errors };
	}

	return redirectWithMessage(actionArgs, "/", {
		type: "info",
		text: ctx.t({
			code: "common.totp_disabled",
			msg: "TOTP disabled",
		}),
	});
});

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs);
	if (!user.totpEnabled) {
		return redirectLangFromRoute(loaderArgs, "/user/totp-enable");
	}
	return {
		enabled: user.totpEnabled,
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const ad = useActionData<typeof action>();
	const navigation = useNavigation();

	const errors = ad?.errors || {};
	const isSubmitting = navigation.state === "submitting";

	if (!ld.enabled) {
		return (
			<MainContainer
				title={ctx.t({ code: "user.disable_totp", msg: "Disable TOTP" })}
			>
				<div className="mx-auto w-full max-w-2xl">
					<Card className="w-full">
						<p className="text-center text-gray-600">
							{ctx.t({
								code: "user.totp_already_disabled",
								msg: "TOTP already disabled",
							})}
						</p>
					</Card>
				</div>
			</MainContainer>
		);
	}

	return (
		<MainContainer
			title={ctx.t({ code: "user.disable_totp", msg: "Disable TOTP" })}
		>
			<div className="mx-auto w-full max-w-2xl">
				<Card className="w-full">
					<Form method="post" className="flex flex-col gap-6">
						<div>
							<h2 className="mb-2 text-lg font-semibold text-gray-900">
								{ctx.t({
									code: "user.disable_totp",
									msg: "Disable TOTP",
								})}
							</h2>
							<p className="text-sm text-gray-600">
								{ctx.t({
									code: "user.disable_totp_description",
									msg: "Enter your TOTP code to confirm disabling two-factor authentication",
								})}
							</p>
						</div>

						{errors.form?.map((error, idx) => (
							<Message
								key={idx}
								severity="error"
								text={error}
								className="w-full"
							/>
						))}

						<div className="flex flex-col gap-2">
							<label
								htmlFor="code"
								className="text-sm font-medium text-gray-700"
							>
								{ctx.t({
									code: "user.generated_code",
									msg: "Generated Code",
								})}
							</label>
							<InputMask
								id="code"
								name="code"
								type="text"
								autoComplete="one-time-code"
								mask="999999"
								slotChar="-"
								onInput={(e) => {
									const input = e.currentTarget;
									input.value = input.value.replace(/\D/g, "").slice(0, 6);
								}}
								className={`${errors.code ? "ng-invalid ng-touched" : ""
									}`}
							/>
							{errors.code?.map((error, idx) => (
								<small key={idx} className="text-red-500">
									{error}
								</small>
							))}
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Button
								type="submit"
								severity="danger"
								label={ctx.t({
									code: "user.disable_totp_button",
									msg: "Disable TOTP",
								})}
								loading={isSubmitting}
								className="flex-1"
							/>
							<Button
								type="button"
								severity="secondary"
								label={ctx.t({
									code: "common.cancel",
									msg: "Cancel",
								})}
								outlined
								onClick={() => window.history.back()}
								className="flex-1"
							/>
						</div>
					</Form>
				</Card>
			</div>
		</MainContainer>
	);
}
