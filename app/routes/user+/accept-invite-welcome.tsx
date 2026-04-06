import { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import {
	configAuthSupportedAzureSSOB2C,
	configAuthSupportedForm,
} from "~/utils/config";

import { validateInviteCode } from "~/backend.server/models/user/invite";

import { LangLink } from "~/utils/link";

import { Button } from "primereact/button";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;

	const confAuthSupportedAzureSSOB2C: boolean =
		configAuthSupportedAzureSSOB2C();
	const confAuthSupportedForm: boolean = configAuthSupportedForm();
	const url = new URL(request.url);
	const inviteCode = url.searchParams.get("inviteCode") || "";
	const state = url.searchParams.get("state") || "";
	const queryStringCode = url.searchParams.get("code") || "";
	const res = await validateInviteCode(inviteCode);

	return {
		inviteCode: inviteCode,
		inviteCodeValidation: res,
		code: queryStringCode,
		state: state,
		confAuthSupportedAzureSSOB2C: confAuthSupportedAzureSSOB2C,
		confAuthSupportedForm: confAuthSupportedForm,
	};
};

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();


	const inviteCode = loaderData.inviteCode;

	if (!loaderData.inviteCodeValidation.ok) {
		return (
			<>
				<p>{loaderData.inviteCodeValidation.error}</p>
			</>
		);
	}

	return (
		<>
			<div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
				<form className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">

					{/* Intro */}
					<div className="mb-8 text-center">
						<h1 className="mb-4 text-3xl font-bold text-gray-900">
							{"Welcome to the DELTA Resilience system."}
						</h1>

						<p className="text-gray-600 leading-relaxed">
							{"Track disaster impacts, including damages, losses, and human effects, to support better recovery and resilience."}
						</p>
					</div>

					{/* Actions */}
					<div className="flex flex-col items-center gap-4">

						{loaderData.confAuthSupportedForm && (
							<LangLink
								lang="en"
								to={`/user/accept-invite?inviteCode=${inviteCode}`}
								className="w-full max-w-sm"
							>
								<Button
									type="button"
									label={"Set up account"}
									icon="pi pi-user-plus"
									className="w-full"
								/>
							</LangLink>
						)}

						{loaderData.confAuthSupportedAzureSSOB2C && (
							<>
								<LangLink
									lang="en"
									to={`/sso/azure-b2c/invite?inviteCode=${inviteCode}&action=sso_azure_b2c-register`}
									className="w-full max-w-sm"
								>
									<Button
										type="button"
										label={"Set up using SSO"}
										icon="pi pi-sign-in"
										outlined
										className="w-full"
									/>
								</LangLink>

								<p className="mt-2 max-w-md text-center text-sm text-gray-500">
									{"Note: For setup using SSO, please use the same email address where you received the invitation email."}
								</p>
							</>
						)}
					</div>
				</form>
			</div>
		</>
	);
}
