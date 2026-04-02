import { useActionData, MetaFunction, Form, useNavigation } from "react-router";
import { configAuthSupportedForm } from "~/utils/config";
import {
	Errors as FormErrors,
} from "~/frontend/form";
import { formStringData } from "~/utils/httputil";
import { authAction, authActionGetAuth } from "~/utils/auth";
import {
	ChangePasswordFields,
	changePassword,
} from "~/backend.server/models/user/password";
import { redirectWithMessage } from "~/utils/session";
import { MainContainer } from "~/frontend/container";
import { redirectLangFromRoute } from "~/utils/url.backend";
import { LoaderFunctionArgs } from "react-router";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Password } from "primereact/password";

// Add loader to check if form auth is supported
export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	// If form authentication is not supported, redirect to login or settings
	if (!configAuthSupportedForm()) {
		return redirectLangFromRoute(loaderArgs, "/user/settings"); // or wherever appropriate
	}
	return {};
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

		return redirectWithMessage(actionArgs, "/hazardous-event", {
			type: "info",
			text: ctx.t({ code: "user.password_changed", msg: "Password changed." }),
		});
	},
);

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.reset_password",
					msg: "Reset Password",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.changing_password",
				msg: "Changing password",
			}),
		},
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
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<MainContainer
			title={ctx.t({ code: "user.reset_password", msg: "Reset password" })}
		>
			<div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
				<Card className="w-full max-w-xl rounded-2xl shadow-xl p-8">

					{/* Back Button */}
					{/* <div className="mb-6">
						<LangLink lang={ctx.lang} to="/user/settings">
							<Button
								type="button"
								label={ctx.t({ code: "common.back", msg: "Back" })}
								icon="pi pi-arrow-left"
								severity="secondary"
								outlined
							/>
						</LangLink>
					</div> */}

					{/* Intro */}
					<div className="mb-6 space-y-2">
						<p className="text-gray-700">
							{ctx.t({
								code: "user.enter_current_and_new_password",
								msg: "Please enter current and new password in the input field below.",
							})}
						</p>

						<p className="text-sm text-red-500">
							*{" "}
							{ctx.t({
								code: "common.required_info",
								msg: "Required information",
							})}
						</p>
					</div>

					<Form method="post" className="space-y-6">

						{/* Current Password */}
						<div className="flex flex-col gap-2">
							<label className="font-semibold">
								{ctx.t({ code: "user.current_password_required", msg: "Current password" })}
								<span className="text-red-500"> *</span>
							</label>

							<div className="p-inputgroup login-inputgroup w-full">
								<span className="p-inputgroup-addon">
									<i className="pi pi-lock"></i>
								</span>
								<Password
									name="currentPassword"
									className="w-full"
									style={{ width: "100%", flex: 1 }}
									inputClassName="w-full"
									inputStyle={{ width: "100%" }}
									toggleMask
									feedback={false}
									defaultValue={data?.currentPassword}
									pt={{
										root: { className: "w-full", style: { width: "100%", flex: 1 } },
										iconField: { root: { className: "w-full" } },
										input: { className: "w-full" },
										hideIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
										showIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
									}}
									invalid={!!errors?.fields?.currentPassword}
								/>
							</div>

							{errors?.fields?.currentPassword?.[0] && (
								<small className="text-sm text-red-500">
									{typeof errors.fields.currentPassword[0] === "string"
										? errors.fields.currentPassword[0]
										: errors.fields.currentPassword[0].message}
								</small>
							)}
						</div>

						{/* New Password */}
						<div className="flex flex-col gap-2">
							<label className="font-semibold">
								{ctx.t({ code: "user.new_password_required", msg: "New password" })}
								<span className="text-red-500"> *</span>
							</label>

							<div className="p-inputgroup login-inputgroup w-full">
								<span className="p-inputgroup-addon">
									<i className="pi pi-lock"></i>
								</span>
								<Password
									name="newPassword"
									className="w-full"
									style={{ width: "100%", flex: 1 }}
									inputClassName="w-full"
									inputStyle={{ width: "100%" }}
									toggleMask
									feedback={false}
									defaultValue={data?.newPassword}
									pt={{
										root: { className: "w-full", style: { width: "100%", flex: 1 } },
										iconField: { root: { className: "w-full" } },
										input: { className: "w-full" },
										hideIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
										showIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
									}}
									invalid={!!errors?.fields?.newPassword}
								/>
							</div>

							{errors?.fields?.newPassword?.[0] && (
								<small className="text-sm text-red-500">
									{typeof errors.fields.newPassword[0] === "string"
										? errors.fields.newPassword[0]
										: errors.fields.newPassword[0].message}
								</small>
							)}
						</div>

						{/* Confirm Password */}
						<div className="flex flex-col gap-2">
							<label className="font-semibold">
								{ctx.t({ code: "user.confirm_password_required", msg: "Confirm password" })}
								<span className="text-red-500"> *</span>
							</label>

							<div className="p-inputgroup login-inputgroup w-full">
								<span className="p-inputgroup-addon">
									<i className="pi pi-lock"></i>
								</span>
								<Password
									name="confirmPassword"
									className="w-full"
									style={{ width: "100%", flex: 1 }}
									inputClassName="w-full"
									inputStyle={{ width: "100%" }}
									toggleMask
									feedback={false}
									defaultValue={data?.confirmPassword}
									pt={{
										root: { className: "w-full", style: { width: "100%", flex: 1 } },
										iconField: { root: { className: "w-full" } },
										input: { className: "w-full" },
										hideIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
										showIcon: { className: "ltr:!right-3 rtl:left-3 rtl:right-auto" },
									}}
									invalid={!!errors?.fields?.confirmPassword}
								/>
							</div>

							{errors?.fields?.confirmPassword?.[0] && (
								<small className="text-sm text-red-500">
									{typeof errors.fields.confirmPassword[0] === "string"
										? errors.fields.confirmPassword[0]
										: errors.fields.confirmPassword[0].message}
								</small>
							)}
						</div>

						{/* Password Rules */}
						<div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
							<ul className="list-disc space-y-1 pl-5">
								<li>{ctx.t({ code: "user.password_requirements.at_least_12_characters_long", msg: "At least 12 characters long" })}</li>
								<li>
									{ctx.t({ code: "user.password_requirements.must_include_two_of_following", msg: "Must include two of the following:" })}
									<ul className="list-disc pl-5 mt-1 space-y-1">
										<li>{ctx.t({ code: "user.password_requirements.uppercase_letters", msg: "Uppercase letters" })}</li>
										<li>{ctx.t({ code: "user.password_requirements.lowercase_letters", msg: "Lowercase letters" })}</li>
										<li>{ctx.t({ code: "user.password_requirements.numbers", msg: "Numbers" })}</li>
										<li>{ctx.t({ code: "user.password_requirements.special_characters", msg: "Special characters" })}</li>
									</ul>
								</li>
								<li>{ctx.t({ code: "user.password_requirements.must_be_different_from_default", msg: "Must be different from the default password" })}</li>
								<li>{ctx.t({ code: "user.password_requirements.cannot_be_same_as_username", msg: "Cannot be the same as the username" })}</li>
								<li>{ctx.t({ code: "user.password_requirements.should_not_be_simple_or_common", msg: "Should not be a simple or commonly used password" })}</li>
							</ul>
						</div>

						{/* Submit */}
						<Button
							type="submit"
							label={ctx.t({
								code: "user.reset_password",
								msg: "Reset password",
							})}
							icon="pi pi-lock-open"
							className="w-full"
							loading={isSubmitting}
							disabled={isSubmitting}
						/>
					</Form>
				</Card>
			</div>
		</MainContainer>
	);
}
