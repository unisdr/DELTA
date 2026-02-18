import { useActionData } from "react-router";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
} from "~/frontend/form";
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

interface LoginFields {
	email: string;
	password: string;
}

export const action = authActionAllowNoTotp(async (actionArgs) => {
	const { request } = actionArgs;
	const { user, sessionId } = authActionGetAuth(actionArgs);
	const formData = formStringData(await request.formData());
	const code = formData.code || "";
	const settings = await getCountrySettingsFromSession(request);
	const res = await loginTotp(user.id, sessionId, code, settings.totpIssuer);
	if (!res.ok) {
		let errors: FormErrors<LoginFields> = {
			form: [res.error],
		};
		return { errors };
	}
	return redirectLangFromRoute(actionArgs, "/");
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

	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors;
	return (
		<>
			<section>
				<div className="mg-container">
					<Form ctx={ctx} errors={errors}>
						<Field
							label={ctx.t({
								code: "users.totp_generated_code",
								msg: "Generated code",
							})}
						>
							<input type="text" name="code" />
						</Field>
						<SubmitButton
							className="mg-button mg-button-primary"
							label={ctx.t({
								code: "users.login_with_totp",
								msg: "Login with TOTP",
							})}
						/>
					</Form>
				</div>
			</section>
		</>
	);
}
