import { Form, useLoaderData, useActionData, useNavigation } from "react-router";
import { formStringData } from "~/utils/httputil";
import {
	authAction,
	authActionGetAuth,
	authLoader,
	authLoaderGetAuth,
} from "~/utils/auth";
import {
	setTotpEnabled,
	generateTotpIfNotSet,
} from "~/backend.server/models/user/totp";
import {
	getCountrySettingsFromSession,
	redirectWithMessage,
} from "~/utils/session";
import { MainContainer } from "~/frontend/container";
import { redirectLangFromRoute } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

type TotpFormErrors = {
	form?: string[];
	code?: string[];
};

export const action = authAction(async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());
	const settings = await getCountrySettingsFromSession(request);

	const token = formData.code || "";

	const totpIssuer = settings?.totpIssuer || "";
	const res = await setTotpEnabled(user.id, token, true, totpIssuer);

	let errors: TotpFormErrors = {};
	if (!res.ok) {
		errors.form = [res.error];
		return { ok: false, errors: errors };
	}

	return redirectWithMessage(actionArgs, "/", {
		type: "info",
		text: ctx.t({
			code: "common.totp_enabled",
			msg: "TOTP enabled",
		}),
	});
});

export const loader = authLoader(async (loaderArgs) => {
	const { request } = loaderArgs;
	const { user } = authLoaderGetAuth(loaderArgs);
	if (user.totpEnabled) {
		return redirectLangFromRoute(loaderArgs, "/user/totp-disable");
	}

	const settings = await getCountrySettingsFromSession(request);
	let totpIssuer = "";
	if (settings) {
		totpIssuer = settings.totpIssuer;
	}

	const res = await generateTotpIfNotSet(user.id, totpIssuer);

	return {
		...res,
	};
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	const ad = useActionData<typeof action>();
	const errors: TotpFormErrors = ad?.errors || {};
	const data = { code: "" };
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	if (!ld.ok) {
		return (
			<>
				<p>
					{ctx.t({
						code: "user.totp_already_enabled",
						msg: "TOTP already enabled",
					})}
				</p>
			</>
		);
	}

	const qrCodeUrl = ctx.url(
		`/api/qrcode?text=` + encodeURIComponent(ld.secretUrl),
	);

	return (
		<MainContainer
			title={ctx.t({ code: "user.enable_totp", msg: "Enable TOTP" })}
		>
			<Form method="post" className="mx-auto w-full max-w-2xl">
				<Card className="w-full">
					<div className="flex flex-col gap-6">
						{errors.form?.map((error, idx) => (
							<Message
								key={`form-error-${idx}`}
								severity="error"
								text={error}
							/>
						))}

						<div className="flex flex-col items-center gap-3 text-center sm:gap-4">
							<p className="break-all text-sm sm:text-base">{ld.secret}</p>
							<p className="break-all text-xs text-gray-600 sm:text-sm">
								{ld.secretUrl}
							</p>
							<img
								src={qrCodeUrl}
								alt="QR Code"
								className="h-auto w-full max-w-[220px]"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<label htmlFor="code" className="font-semibold">
								{ctx.t({
									code: "user.generated_code",
									msg: "Generated Code",
								})}
							</label>
							<InputText
								id="code"
								name="code"
								defaultValue={data.code}
								className="w-full"
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

						<div className="flex justify-end">
							<Button
								type="submit"
								label={ctx.t({
									code: "user.enable_totp_button",
									msg: "Enable TOTP",
								})}
								loading={isSubmitting}
							/>
						</div>
					</div>
				</Card>
			</Form>
		</MainContainer>
	);
}
