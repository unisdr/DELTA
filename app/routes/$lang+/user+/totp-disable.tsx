import {
	useLoaderData,
	useActionData,
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	FieldErrors
} from "~/frontend/form";
import {formStringData} from "~/util/httputil";
import {
	authAction,
	authActionGetAuth,
	authLoader,
	authLoaderGetAuth,
} from "~/util/auth";
import {
	setTotpEnabled
} from "~/backend.server/models/user/totp";
import {
	getCountrySettingsFromSession,
	redirectWithMessage
} from "~/util/session";

import {MainContainer} from "~/frontend/container";
import { redirectLangFromRoute } from "~/util/url.backend";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";

interface Fields {
	code: string
}

export const action = authAction(async (actionArgs) => {
	const {request} = actionArgs;
	const {user} = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());

	const token = formData.code || "";

	const settings = await getCountrySettingsFromSession(request);
	const res = await setTotpEnabled(user.id, token, false, settings?.totpIssuer);

	let errors: FormErrors<Fields> = {}
	if (!res.ok) {
		errors.form = [res.error];
		return {ok: false, errors: errors}
	}

	return redirectWithMessage(actionArgs, "/", {type: "info", text: "TOTP disabled"})
});

export const loader = authLoader(async (loaderArgs) => {
	const {user} = authLoaderGetAuth(loaderArgs)
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
	const data = {code: ""};

	if (!ld.enabled) {
		return (
			<>
				<p>TOTP already disabled</p>
			</>
		)
	}
	return (
		<MainContainer title="Disable TOTP">
			<>
				<Form ctx={ctx} errors={errors}>
					<Field label="Generated Code">
						<input
							type="text"
							name="code"
							defaultValue={data.code}
						/>
						<FieldErrors errors={errors} field="code"></FieldErrors>
					</Field>
					<SubmitButton className="mg-button mg-button-primary" label="Disable TOTP" />
				</Form>
				<LangLink lang={ctx.lang} to="/user/settings">Back to User Settings</LangLink>
			</>
		</MainContainer>
	);
}

