import { LoaderFunctionArgs, ActionFunctionArgs, Form } from "react-router";
import { useActionData, useLoaderData } from "react-router";
import { configAuthSupportedForm } from "~/utils/config";


import { resetPassword } from "~/backend.server/models/user/password";

import { formStringData } from "~/utils/httputil";
import { redirectWithMessage } from "~/utils/session";
import { redirectLangFromRoute } from "~/utils/url.backend";



import { Card } from "primereact/card";
import { Password } from "primereact/password";
import { Button } from "primereact/button";

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
			error: "Invalid password reset link",
		};
	}
	return {};
};

interface FormData {
	newPassword: string;
	confirmPassword: string;
}

export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;


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
		email,
		token,
		data.newPassword,
		data.confirmPassword,
	);
	if (!res.ok) {
		return { ok: false, data, errors: res.errors };
	}
	return redirectWithMessage(actionArgs, "/user/login", {
		type: "info",
		text: "Password changed successfully!",
	});
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();

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
		<div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
			<Card className="w-full max-w-xl rounded-2xl shadow-xl p-8">

				{/* Headings */}
				<div className="mb-6 space-y-2">
					<h2 className="text-2xl font-bold">
						{"Reset your password"}
					</h2>

					<p className="text-gray-600">
						{"Please enter new password in the input field below."}
					</p>

					<p className="text-sm text-red-500">
						*{" "}
						{"Required information"}
					</p>
				</div>

				<Form method="post" className="space-y-6">
					{/* Hidden Fields */}
					<input name="email" type="hidden" defaultValue="data.email" />
					<input name="token" type="hidden" defaultValue="data.token" />

					{/* New Password */}
					<div className="flex flex-col gap-2">
						<label className="font-semibold">
							{"New password"}
							<span className="text-red-500"> *</span>
						</label>

						<Password
							name="newPassword"
							toggleMask
							feedback={false}
							pt={{
								iconField: { root: { className: "w-full" } },
								input: { className: "w-full" },
							}}
							invalid={!!errors?.fields?.newPassword}
						/>

						{errors?.fields?.newPassword?.map((err, index) => (
							<small key={index} className="text-sm text-red-500 block">
								{typeof err === "string" ? err : err.message}
							</small>
						))}
					</div>

					{/* Confirm Password */}
					<div className="flex flex-col gap-2">
						<label className="font-semibold">
							{"Confirm password"}
							<span className="text-red-500"> *</span>
						</label>

						<Password
							name="confirmPassword"
							toggleMask
							feedback={false}
							pt={{
								iconField: { root: { className: "w-full" } },
								input: { className: "w-full" },
							}}
							invalid={!!errors?.fields?.confirmPassword}
						/>

						{errors?.fields?.confirmPassword?.map((err, index) => (
							<small key={index} className="text-sm text-red-500 block">
								{typeof err === "string" ? err : err.message}
							</small>
						))}
					</div>

					{/* Password Requirements */}
					<div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
						<ul className="list-disc space-y-1 pl-5">
							<li>
								{"At least 12 characters long"}
							</li>
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

					{/* Submit Button */}
					<Button
						type="submit"
						label={"Recover account"}
						className="w-full"
					/>
				</Form>
			</Card>
		</div>
	);
}
