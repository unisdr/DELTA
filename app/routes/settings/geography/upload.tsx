import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import { useActionData } from "react-router";

import { NavSettings } from "~/frontend/components/nav-settings";
import { MainContainer } from "~/frontend/container";
import { makeUploadGeographicLevelsZipUseCase } from "~/modules/geographic-levels/geographic-levels-module.server";

import { getCountryAccountsIdFromSession } from "~/utils/session";
import GeographicLevelUploadPage from "~/modules/geographic-levels/presentation/geographic-level-upload-page";

export const loader = authLoaderWithPerm("ManageCountrySettings", async () => {
	return {};
});

export const action = authActionWithPerm(
	"ManageCountrySettings",
	async (actionArgs) => {
		const { request } = actionArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}
		return makeUploadGeographicLevelsZipUseCase().execute({
			request,
			countryAccountsId,
		});
	},
);

export default function Screen() {
	let error = "";
	const actionData = useActionData<typeof action>();
	let submitted = false;
	let failed = 0;
	let failedDetails: Record<string, string> = {};

	if (actionData) {
		submitted = true;
		if (!actionData.ok) {
			error = actionData.error || "Server error";
		} else {
			failed = actionData.failed;
			failedDetails = actionData.failedDetails || {};
		}
	}

	const navSettings = <NavSettings userRole={undefined} />;

	return (
		<MainContainer
			title={"Geographic levels"}
			headerExtra={navSettings}
		>
			<GeographicLevelUploadPage
				submitted={submitted}
				error={error}
				imported={actionData?.ok ? actionData.imported : 0}
				failed={failed}
				failedDetails={failedDetails}
			/>
		</MainContainer>
	);
}


