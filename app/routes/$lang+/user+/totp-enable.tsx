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
	setTotpEnabled,
	generateTotpIfNotSet
} from "~/backend.server/models/user/totp";
import {
	getCountrySettingsFromSession,
	redirectWithMessage,
} from "~/util/session";
import {MainContainer} from "~/frontend/container";
import { redirectLangFromRoute } from "~/util/url.backend";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

export const action = authAction(async (actionArgs) => {
	const {request} = actionArgs;
	const {user} = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());
	const settings = await getCountrySettingsFromSession(request);

	const token = formData.code || "";

	const res = await setTotpEnabled(user.id, token, true, settings.totpIssuer);

	let errors: FormErrors<{}> = {}
	if (!res.ok) {
		errors.form = [res.error];
		return {ok: false, errors: errors}
	}

	return redirectWithMessage(actionArgs, "/", {type: "info", text: "TOTP enabled"})
});

export const loader = authLoader(async (loaderArgs) => {
	const {request} = loaderArgs;
	const {user} = authLoaderGetAuth(loaderArgs)
	if (user.totpEnabled) {
		return redirectLangFromRoute(loaderArgs, "/user/totp-disable")
	}
	
	const settings = await getCountrySettingsFromSession(request);
	let totpIssuer = "";
	if(settings){
		totpIssuer = settings.totpIssuer;
	}
	console.log( totpIssuer );

	const res = await generateTotpIfNotSet(user.id, totpIssuer)

	console.log( res );
	
	return {
		common: await getCommonData(loaderArgs),
		...res
	}
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	const ad = useActionData<typeof action>();
	const errors = ad?.errors || {};
	const data = {code: ""};

	if (!ld.ok) {
		return (
			<>
				<p>TOTP already enabled</p>
			</>
		)
	}

	// TODO: fix the link to include lang
	const qrCodeUrl = ctx.url(`/api/qrcode?text=` + encodeURIComponent(ld.secretUrl));

	return (
		<MainContainer title="Enable TOTP"><>
			<Form className="dts-form dts-form--vertical" ctx={ctx} errors={errors}>
				<div>
					<p>{ld.secret}</p>
					<p>{ld.secretUrl}</p>
					<img src={qrCodeUrl} alt="QR Code" />
				</div>
				<Field label="Generated Code">
					<input
						type="text"
						name="code"
						defaultValue={data.code}
					/>
					<FieldErrors errors={errors} field="code"></FieldErrors>
				</Field>
				<div className="dts-form__actions">
					<SubmitButton className="mg-button mg-button-primary" label="Enable TOTP" />
				</div>
			</Form>
			
		</></MainContainer>
	);
}

