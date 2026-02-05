import { MainContainer } from "~/frontend/container";
import { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useActionData, useLoaderData } from "react-router";
import { configAuthSupportedForm } from "~/utils/config";
import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	FormMessage,
} from "~/frontend/form";

import { resetPassword } from "~/backend.server/models/user/password";

import { formStringData } from "~/utils/httputil";
import PasswordInput from "~/components/PasswordInput";
import { redirectWithMessage } from "~/utils/session";
import { redirectLangFromRoute } from "~/utils/url.backend";
import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";

function getData(request: Request) {
	const url = new URL(request.url);
	const token = url.searchParams.get("token") || "";
	const email = url.searchParams.get("email") || "";
	return { token, email };
}

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;

	// Check if form authentication is supported
	if (!configAuthSupportedForm()) {
		return redirectLangFromRoute(loaderArgs, "/user/login");
	}

	const { token, email } = getData(request);
	if (!token || !email) {
		return {

			error: "Invalid password reset link"
		};
	}
	return {

	}
};

interface FormData {
	newPassword: string;
	confirmPassword: string;
}


export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);

	// Check if form authentication is supported
	if (!configAuthSupportedForm()) {
		return redirectLangFromRoute(actionArgs, "/user/login");
	}

	const { token, email } = getData(request);
	const formData = formStringData(await request.formData());
	const data: FormData = {
		newPassword: formData.newPassword || "",
		confirmPassword: formData.confirmPassword || "",
	};

	let res = await resetPassword(
		ctx,
		email,
		token,
		data.newPassword,
		data.confirmPassword
	);
	if (!res.ok) {
		return { ok: false, data, errors: res.errors };
	}
	return redirectWithMessage(actionArgs, "/user/login", {
		type: "info",
		text: ctx.t({
			"code": "users.password_changed_successfully",
			"msg": "Password changed successfully!"
		})
	});
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors;

	if (loaderData?.error) {
		return (
			<>
				<p>{loaderData.error}</p>
			</>
		);
	}

	return (
		<MainContainer title="">
			<div className="dts-form dts-form--vertical">
				<h2>
					{ctx.t({
						"code": "users.reset_your_password",
						"msg": "Reset your password"
					})}
				</h2>
				<h3>
					{ctx.t({
						"code": "users.enter_new_password_below",
						"msg": "Please enter new password in the input field below."
					})}
				</h3>
				<h4>
					{"* " + ctx.t({
						"code": "users.required_information",
						"msg": "Required information"
					})}
				</h4>
				<Form ctx={ctx} className="dts-form dts-form--vertical" errors={errors}>
					<div className="dts-form-component">
						{false ? (
							<FormMessage>
								<p>
									{ctx.t({
										"code": "users.password_reminder_sent",
										"msg": "Password reminder sent"
									})}
								</p>
							</FormMessage>
						) : null}
						<input name="email" type="hidden" defaultValue="data.email"></input>
						<input name="token" type="hidden" defaultValue="data.token"></input>
						<Field label="">
							<PasswordInput
								placeholder={"*" + ctx.t({
									"code": "users.new_password",
									"msg": "New password"
								})}
								name="newPassword"
								errors={errors}
							/>
							<FieldErrors errors={errors} field="newPassword"></FieldErrors>
						</Field>
						<Field label="">
							<PasswordInput
								placeholder={"*" + ctx.t({
									"code": "users.confirm_password",
									"msg": "Confirm password"
								})}
								name="confirmPassword"
								errors={errors}
							/>
							<FieldErrors
								errors={errors}
								field="confirmPassword"
							></FieldErrors>
						</Field>
					</div>
					<div>
						<ul>
							<li>{ctx.t({ "code": "user.password_requirements.at_least_12_characters_long", "msg": "At least 12 characters long" })}</li>
							<li>
								{ctx.t({ "code": "user.password_requirements.must_include_two_of_following", "msg": "Must include two of the following:" })}
								<ul>
									<li>{ctx.t({ "code": "user.password_requirements.uppercase_letters", "msg": "Uppercase letters" })}</li>
									<li>{ctx.t({ "code": "user.password_requirements.lowercase_letters", "msg": "Lowercase letters" })}</li>
									<li>{ctx.t({ "code": "user.password_requirements.numbers", "msg": "Numbers" })}</li>
									<li>{ctx.t({ "code": "user.password_requirements.special_characters", "msg": "Special characters" })}</li>
								</ul>
							</li>
							<li>{ctx.t({ "code": "user.password_requirements.must_be_different_from_default", "msg": "Must be different from the default password" })}</li>
							<li>{ctx.t({ "code": "user.password_requirements.cannot_be_same_as_username", "msg": "Cannot be the same as the username" })}</li>
							<li>{ctx.t({ "code": "user.password_requirements.should_not_be_simple_or_common", "msg": "Should not be a simple or commonly used password" })}</li>
						</ul>
					</div>

					<SubmitButton
						label={ctx.t({
							"code": "users.recover_account",
							"msg": "Recover account"
						})}
						style={{
							paddingRight: "1rem",
							width: "100%",
						}}
					></SubmitButton>
				</Form>
			</div>
		</MainContainer>
	);
}
