import { useLoaderData, useActionData } from "react-router";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	FieldErrors
} from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import {
	authAction,
	authActionGetAuth,
	authLoader,
	authLoaderGetAuth,
} from "~/utils/auth";
import {
	setTotpEnabled
} from "~/backend.server/models/user/totp";
import {
	getCountrySettingsFromSession,
	redirectWithMessage
} from "~/utils/session";

import { MainContainer } from "~/frontend/container";
import { redirectLangFromRoute } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/utils/link";
import { BackendContext } from "~/backend.server/context";

interface Fields {
	code: string
}

export const action = authAction(async (actionArgs) => {
	const ctx = new BackendContext(actionArgs);
	const { request } = actionArgs;
	const { user } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());

	const token = formData.code || "";

	const settings = await getCountrySettingsFromSession(request);
	const res = await setTotpEnabled(user.id, token, false, settings?.totpIssuer);

	let errors: FormErrors<Fields> = {}
	if (!res.ok) {
		errors.form = [res.error];
		return { ok: false, errors: errors }
	}

	return redirectWithMessage(actionArgs, "/", {
		type: "info",
		text: ctx.t({
			"code": "common.totp_disabled",
			"msg": "TOTP disabled"
		}),
	})
});

export const loader = authLoader(async (loaderArgs) => {
	const { user } = authLoaderGetAuth(loaderArgs)
	if (!user.totpEnabled) {
		return redirectLangFromRoute(loaderArgs, "/user/totp-enable")
	}
	return {

		enabled: user.totpEnabled
	}
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	const ad = useActionData<typeof action>();
	const errors = ad?.errors || {};
	const data = { code: "" };

	if (!ld.enabled) {
		return (
			<>
				<p>{ctx.t({ "code": "user.totp_already_disabled", "msg": "TOTP already disabled" })}</p>
			</>
		)
	}
	return (
		<MainContainer title={ctx.t({ "code": "user.disable_totp", "msg": "Disable TOTP" })}>
			<>
				<Form ctx={ctx} errors={errors}>
					<Field label={ctx.t({ "code": "user.generated_code", "msg": "Generated Code" })}>
						<input
							type="text"
							name="code"
							defaultValue={data.code}
						/>
						<FieldErrors errors={errors} field="code"></FieldErrors>
					</Field>
					<SubmitButton className="mg-button mg-button-primary" label={ctx.t({ "code": "user.disable_totp_button", "msg": "Disable TOTP" })} />
				</Form>
				<LangLink lang={ctx.lang} to="/user/settings">{ctx.t({ "code": "user.back_to_user_settings", "msg": "Back to user settings" })}</LangLink>
			</>
		</MainContainer>
	);
}

