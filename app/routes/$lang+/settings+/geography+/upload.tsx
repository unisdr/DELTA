import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import { useActionData, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";

import { NavSettings } from "~/frontend/components/NavSettings";
import { MainContainer } from "~/frontend/container";
import { handleRequest } from "~/backend.server/handlers/geography_upload";

import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";

export const loader = authLoaderWithPerm("ManageCountrySettings", async () => {
	return {};
});

export const action = authActionWithPerm(
	"ManageCountrySettings",
	async (actionArgs) => {
		const { request } = actionArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		return handleRequest(request, countryAccountsId);
	},
);

export default function Screen() {
	const ctx = new ViewContext();
	const navigate = useNavigate();

	let error = "";
	const actionData = useActionData<typeof action>();
	let submitted = false;
	let imported = 0;
	let failed = 0;
	let failedDetails: Record<string, string> = {};

	if (actionData) {
		submitted = true;
		if (!actionData.ok) {
			error = actionData.error || "Server error";
		} else {
			imported = actionData.imported;
			failed = actionData.failed;
			failedDetails = actionData.failedDetails || {};
		}
	}

	const failedRows = Object.entries(failedDetails).map(
		([divisionId, errorMsg]) => ({
			divisionId,
			errorMsg,
		}),
	);

	const navSettings = <NavSettings ctx={ctx} userRole={ctx.user?.role} />;

	return (
		<MainContainer
			title={ctx.t({
				code: "geographies.geographic_levels",
				msg: "Geographic levels",
			})}
			headerExtra={navSettings}
		>
			<Card className="w-full">
				<form method="post" encType="multipart/form-data" className="flex flex-col gap-4">
					{submitted && (
						<>
							<Message
								severity={failed > 0 ? "warn" : "success"}
								text={`${ctx.t(
									{
										code: "geographies.successfully_imported_records",
										msg: "Successfully imported {imported} records",
									},
									{ imported },
								)}${failed > 0
									? ` (${ctx.t(
										{
											code: "geographies.records_failed",
											msg: "{failed} records failed",
										},
										{ failed },
									)})`
									: ""
									}`}
							/>

							{failed > 0 && failedRows.length > 0 && (
								<div>
									<Message
										severity="error"
										text={ctx.t({
											code: "geographies.failed_imports",
											msg: "Failed imports",
										})}
									/>
									<DataTable
										value={failedRows}
										size="small"
										stripedRows
										className="mt-2 w-full"
									>
										<Column
											header={ctx.t({ code: "common.id", msg: "ID" })}
											field="divisionId"
										/>
										<Column
											header={ctx.t({ code: "common.error", msg: "Error" })}
											field="errorMsg"
										/>
									</DataTable>
								</div>
							)}
						</>
					)}

					{error ? <Message severity="error" text={error} /> : null}

					<div className="flex flex-col gap-2">
						<label htmlFor="geography-upload-file" className="font-semibold">
							{ctx.t({
								code: "geographies.upload_division_zip_file",
								msg: "Upload division ZIP file",
							})}
						</label>
						<input
							id="geography-upload-file"
							name="file"
							type="file"
							accept=".zip"
							className="p-inputtext w-full md:w-30rem"
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button
							type="submit"
							label={ctx.t({
								code: "common.upload_and_import",
								msg: "Upload and import",
							})}
						/>
						<Button
							type="button"
							outlined
							label={ctx.t({ code: "common.back_to_list", msg: "Back to list" })}
							onClick={() => navigate(ctx.url("/settings/geography?view=table"))}
						/>
					</div>
				</form>
			</Card>
		</MainContainer>
	);
}
