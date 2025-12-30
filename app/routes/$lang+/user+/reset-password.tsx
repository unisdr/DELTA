import { MainContainer } from "~/frontend/container";
import {
	LoaderFunctionArgs,
	ActionFunctionArgs,
} from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { configAuthSupportedForm } from "~/util/config";
import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	FormMessage,
} from "~/frontend/form";

import { resetPassword } from "~/backend.server/models/user/password";

import { formStringData } from "~/util/httputil";
import PasswordInput from "~/components/PasswordInput";
import { redirectWithMessage } from "~/util/session";
import { redirectLangFromRoute } from "~/util/url.backend";
import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";

function getData(request: Request) {
	const url = new URL(request.url);
	const token = url.searchParams.get("token") || "";
	const email = url.searchParams.get("email") || "";
	return { token, email };
}

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const {request} = loaderArgs;

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
	const {request} = actionArgs;
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
		text: "Password changed successfully!"
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
				<h2>Reset your password</h2>
				<h3>Please enter new password in the input field below.</h3>
				<h4>* Required information</h4>
				<Form ctx={ctx} className="dts-form dts-form--vertical" errors={errors}>
					<div className="dts-form-component">
						{false ? (
							<FormMessage>
								<p>Password reminder sent to xxxx</p>
							</FormMessage>
						) : null}
						<input name="email" type="hidden" defaultValue="data.email"></input>
						<input name="token" type="hidden" defaultValue="data.token"></input>

						<Field label="">
							<PasswordInput
								placeholder="*New password"
								name="newPassword"
								errors={errors}
							/>
							<FieldErrors errors={errors} field="newPassword"></FieldErrors>
						</Field>
						<Field label="">
							<PasswordInput
								placeholder="*Confirm password"
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
							<li>At least 12 characters long</li>
							<li>Must include two of the following:</li>
							<ul>
								<li>Uppercase letters</li>
								<li>Lowercase letters</li>
								<li>Numbers letters</li>
								<li>Special characters</li>
							</ul>
							<li>Cannot be the same as the username</li>
							<li>Should not be a simple or commonly used password</li>
						</ul>
					</div>

					<SubmitButton
						label="Recover account"
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
