import { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { configAuthSupportedAzureSSOB2C, configAuthSupportedForm } from "~/util/config";

import { validateInviteCode } from "~/backend.server/models/user/invite";

import { LangLink } from "~/util/link";
import { ViewContext } from "~/frontend/context";


export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;

	const confAuthSupportedAzureSSOB2C: boolean =
		configAuthSupportedAzureSSOB2C();
	const confAuthSupportedForm: boolean =
		configAuthSupportedForm();
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
	const ctx = new ViewContext();

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
			<div className="mg-container">
				<form className="dts-form dts-form--vertical">
					<div className="dts-form__header">&nbsp;</div>
					<div className="dts-form__intro">
						<h1 className="dts-heading-1">
							{ctx.t({
								"code": "user.welcome_to_delta_resilience",
								"msg": "Welcome to the DELTA Resilience system."
							})}
						</h1>
						<p>
							{ctx.t({
								"code": "user.track_disaster_impacts_description",
								"msg": "Track disaster impacts, including damages, losses, and human effects, to support better recovery and resilience."
							})}
						</p>
					</div>

					<div className="dts-form__actions">
						{loaderData.confAuthSupportedForm && (
							<LangLink
								lang={ctx.lang}
								className="mg-button mg-button-primary"
								to={`/user/accept-invite?inviteCode=${inviteCode}`}
							>
								{ctx.t({
									"code": "user.setup_account",
									"msg": "Set up account"
								})}
							</LangLink>
						)}

						{loaderData.confAuthSupportedAzureSSOB2C && (
							<>
								<LangLink
									lang={ctx.lang}
									className="mg-button mg-button-outline"
									to={`/sso/azure-b2c/invite?inviteCode=${inviteCode}&action=sso_azure_b2c-register`}
								>
									{ctx.t({
										"code": "user.setup_using_sso",
										"msg": "Set up using SSO"
									})}
								</LangLink>
								<p>
									{ctx.t({
										"code": "user.setup_sso_email_requirement_please_use_same_email_as_invitation",
										"msg": "Note: For setup using SSO, please use the same email address where you received the invitation email."
									})}
								</p>
							</>
						)}
					</div>
				</form>
			</div>
		</>
	);
}
