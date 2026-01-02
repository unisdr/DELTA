import {
	authActionWithPerm,
	authLoaderWithPerm
} from "~/util/auth";

import type {} from "@remix-run/node";

import {
	useActionData,
} from "@remix-run/react";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { handleRequest } from "~/backend.server/handlers/geography_upload";

import { getCountryAccountsIdFromSession } from "~/util/session";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";


export const loader = authLoaderWithPerm("ManageCountrySettings", async () => {
	return {
	};
});

export const action = authActionWithPerm("ManageCountrySettings", async (actionArgs) => {
	const { request } = actionArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	return handleRequest(request, countryAccountsId)
});


export default function Screen() {
	const ctx = new ViewContext();

	let error = ""
	const actionData = useActionData<typeof action>();
	let submitted = false
	let imported = 0
	let failed = 0
	let failedDetails: Record<string, string> = {}

	if (actionData) {
		submitted = true
		if (!actionData.ok) {
			error = actionData.error || "Server error"
		} else {
			imported = actionData.imported
			failed = actionData.failed
			failedDetails = actionData.failedDetails || {}
		}
	}

	const navSettings = <NavSettings ctx={ctx} userRole={ctx.user?.role} />;

	return (
		<MainContainer
			title={ctx.t({ "code": "geographies.geographic_levels", "msg": "Geographic levels" })}
			headerExtra={navSettings}
		>
			<>
				<form method="post" encType="multipart/form-data">
					{submitted && (
						<div className="dts-form-component">
							<p className="dts-body-text">
								{ctx.t(
									{ "code": "geographies.successfully_imported_records", "msg": "Successfully imported {imported} records" },
									{ imported }
								)}
								{failed > 0 &&
									` (${ctx.t(
										{ "code": "geographies.records_failed", "msg": "{failed} records failed" },
										{ failed }
									)})`
								}
							</p>

							{/* Display validation errors for failed imports */}
							{failed > 0 && Object.keys(failedDetails).length > 0 && (
								<div className="dts-message dts-message--error">
									<h3 className="dts-body-text-bold">Failed imports:</h3>
									<ul className="dts-list dts-list--bullet">
										{Object.entries(failedDetails).map(([divisionId, errorMsg]) => (
											<li key={divisionId}>
												<strong>{divisionId}:</strong> {errorMsg}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}

					{error ? (
						<p className="dts-message dts-message--error">{error}</p>
					) : null}

					<div className="dts-form-component">
						<label>
							<span className="dts-form-component__label">
								{ctx.t({ "code": "geographies.upload_division_zip_file", "msg": "Upload division ZIP file" })}
							</span>
							<input
								name="file"
								type="file"
								accept=".zip"
								className="dts-form-component__input"
							/>
						</label>
					</div>

					<div className="mg-grid mg-grid__col-6 dts-form__actions">
						<input
							className="mg-button mg-button-primary"
							type="submit"
							value={ctx.t({ "code": "common.upload_and_import", "msg": "Upload and import" })}
						/>
						<LangLink
							lang={ctx.lang}
							to="/settings/geography"
							className="mg-button mg-button-secondary"
						>
							{ctx.t({ "code": "common.back_to_list", "msg": "Back to list" })}
						</LangLink>
					</div>
				</form>
			</>
		</MainContainer>
	);
}
