import { useActionData, MetaFunction } from "@remix-run/react";
import { configAuthSupportedForm } from "~/util/config";
import {
	Form,
	Errors as FormErrors,
	SubmitButton,
	FieldErrorsStandard,
} from "~/frontend/form";
import { formStringData } from "~/util/httputil";
import { authAction, authActionGetAuth } from "~/util/auth";
import {
	ChangePasswordFields,
	changePassword,
} from "~/backend.server/models/user/password";
import { redirectWithMessage } from "~/util/session";
import { MainContainer } from "~/frontend/container";
import PasswordInput from "~/components/PasswordInput";
import { useState, useEffect, ChangeEvent } from "react";
import { redirectLangFromRoute } from "~/util/url.backend";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";
import { BackendContext } from "~/backend.server/context";

// Add loader to check if form auth is supported
export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	// If form authentication is not supported, redirect to login or settings
	if (!configAuthSupportedForm()) {
		return redirectLangFromRoute(loaderArgs, "/user/settings"); // or wherever appropriate
	}
	return {

	};
};

export const action = authAction(
	async (actionArgs): Promise<ActionResponse> => {
		// Check if form authentication is supported
		if (!configAuthSupportedForm()) {
			throw redirectLangFromRoute(actionArgs, "/user/settings/system");
		}

		const { request } = actionArgs;
		const { user } = authActionGetAuth(actionArgs);
		const formData = formStringData(await request.formData());
		const ctx = new BackendContext(actionArgs);

		const data: ChangePasswordFields = {
			currentPassword: formData.currentPassword || "",
			newPassword: formData.newPassword || "",
			confirmPassword: formData.confirmPassword || "",
		};

		const res = await changePassword(ctx, user.id, data);

		if (!res.ok) {
			return { ok: false, data, errors: res.errors };
		}

		return redirectWithMessage(actionArgs, "/user/settings", {
			type: "info",
			text: ctx.t({ "code": "user.password_changed", "msg": "Password changed." }),
		});
	}
);

export const meta: MetaFunction = () => {
	return [
		{ title: "Reset Password - DELTA Resilience" },
		{ name: "description", content: "Changing password" },
	];
};

interface ActionResponse {
	ok: boolean;
	data?: ChangePasswordFields;
	errors?: FormErrors<ChangePasswordFields>;
}

function changePasswordFieldsCreateEmpty(): ChangePasswordFields {
	return {
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	};
}

// Rest of your component remains the same
export default function Screen() {
	const ctx = new ViewContext();

	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors || {};
	const data = actionData?.data || changePasswordFieldsCreateEmpty();

	const [currentPassword, setCurrentPassword] = useState(
		data?.currentPassword || ""
	);
	const [newPassword, setNewPassword] = useState(data?.newPassword || "");
	const [confirmPassword, setConfirmPassword] = useState(
		data?.confirmPassword || ""
	);

	const isFormValid = () => {
		const hasUppercase = /[A-Z]/.test(newPassword);
		const hasLowercase = /[a-z]/.test(newPassword);
		const hasNumber = /\d/.test(newPassword);
		const hasSpecialChar = /[@$!%*?&_]/.test(newPassword);

		const hasTwoOfTheFollowing =
			[hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean)
				.length >= 2;

		return (
			currentPassword &&
			newPassword &&
			confirmPassword &&
			newPassword === confirmPassword &&
			hasTwoOfTheFollowing &&
			newPassword.length >= 12 &&
			newPassword !== currentPassword
		);
	};

	useEffect(() => {
		const submitButton = document.querySelector(
			"button[type='submit']"
		) as HTMLButtonElement;
		if (submitButton) {
			submitButton.disabled = !isFormValid();
		}
	}, [currentPassword, newPassword, confirmPassword]);

	return (
		<MainContainer title={ctx.t({ "code": "user.reset_password", "msg": "Reset password" })}>
			<div className="mg-container">
				<Form ctx={ctx} className="dts-form dts-form--vertical" errors={errors}>
					<div className="dts-form__header">
						<LangLink
							lang={ctx.lang}
							to="/user/settings"
							className="mg-button mg-button--small mg-button-system"
						>
							{ctx.t({ "code": "common.back", "msg": "Back" })}
						</LangLink>
					</div>

					<div className="dts-form__intro">
						<p>
							{ctx.t({ "code": "user.enter_current_and_new_password", "msg": "Please enter current and new password in the input field below." })}
						</p>
					</div>

					<div className="dts-form__body">
						<p>* {ctx.t({ "code": "common.required_info", "msg": "Required information" })}</p>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__pwd">
									<PasswordInput
										placeholder={ctx.t({ "code": "user.current_password_required", "msg": "Current password" }) + " *"}
										name="currentPassword"
										defaultValue={data?.currentPassword}
										errors={errors}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setCurrentPassword(e.target.value)
										}
									/>
								</div>
								<FieldErrorsStandard errors={errors} field="currentPassword" />
							</label>
						</div>

						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__pwd">
									<PasswordInput
										placeholder={ctx.t({ "code": "user.new_password_required", "msg": "New password" }) + " *"}
										name="newPassword"
										defaultValue={data?.newPassword}
										errors={errors}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setNewPassword(e.target.value)
										}
									/>
								</div>
								<FieldErrorsStandard errors={errors} field="newPassword" />
							</label>
						</div>

						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__pwd">
									<PasswordInput
										placeholder={ctx.t({ "code": "user.confirm_password_required", "msg": "Confirm password" }) + " *"}
										name="confirmPassword"
										defaultValue={data?.confirmPassword}
										errors={errors}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setConfirmPassword(e.target.value)
										}
									/>
								</div>
								<FieldErrorsStandard errors={errors} field="confirmPassword" />
							</label>
						</div>
					</div>

					<div className="dts-form-component__hint">
						<ul id="passwordDescription">
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

					<div className="dts-form__actions">
						<SubmitButton
							className="mg-button mg-button-primary"
							label={ctx.t({ "code": "user.reset_password", "msg": "Reset password" })}
						/>
					</div>
				</Form>
			</div>
		</MainContainer>
	);
}
