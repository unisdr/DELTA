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


		const data: ChangePasswordFields = {
			currentPassword: formData.currentPassword || "",
			newPassword: formData.newPassword || "",
			confirmPassword: formData.confirmPassword || "",
		};

		const res = await changePassword(user.id, data);

		if (!res.ok) {
			return { ok: false, data, errors: res.errors };
		}

		return redirectWithMessage(actionArgs, "/hazardous-event", {
			type: "info",
			text: "Password changed.",
		});
	},
);

export const meta: MetaFunction = () => {


	return [
		{
			title: htmlTitle(
				"Change Password",
			),
		},
		{
			name: "description",
			content: "Changing password",
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


	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors || {};
	const data = actionData?.data || changePasswordFieldsCreateEmpty();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<MainContainer
			title={"Change password"}
		>
			<div className="flex min-h-screen items-center justify-center px-4 py-10">
				<Card className="w-full max-w-xl rounded-2xl shadow-xl p-8">

					{/* Intro */}
					<div className="mb-6 space-y-2">
						<p className="text-gray-700">
							{"Please enter current and new password in the input field below."}
						</p>

						<p className="text-sm text-red-500">
							*{" "}
							{"Required information"}
						</p>
					</div>

					<Form method="post" className="space-y-6">

						{/* Current Password */}
						<div className="flex flex-col gap-2">
							<label className="font-semibold">
								{"Current password"}
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
								{"New password"}
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
								{"Confirm password"}
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
								<li>{"At least 12 characters long"}</li>
								<li>
									{"Must include two of the following:"}
									<ul className="list-disc pl-5 mt-1 space-y-1">
										<li>{"Uppercase letters"}</li>
										<li>{"Lowercase letters"}</li>
										<li>{"Numbers"}</li>
										<li>{"Special characters"}</li>
									</ul>
								</li>
								<li>{"Must be different from the default password"}</li>
								<li>{"Cannot be the same as the username"}</li>
								<li>{"Should not be a simple or commonly used password"}</li>
							</ul>
						</div>

						{/* Submit */}
						<Button
							type="submit"
							label={"Change password"}
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
