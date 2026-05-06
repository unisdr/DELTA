import {
	authActionGetAuth,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
	authActionWithPerm,
} from "~/utils/auth";
import type { ActionFunctionArgs } from "react-router";
import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
	disasterRecordsByIdTx,
	getHumanEffectRecordsById,
	DisasterRecordsFields,
} from "~/backend.server/models/disaster_record";

import { useLoaderData } from "react-router";

import {
	fieldsDef,
	DisasterRecordsForm,
	route,
} from "~/frontend/disaster-record/form";

import { nonecoLossesFilderBydisasterRecordsId } from "~/backend.server/models/noneco_losses";
import { sectorsFilterByDisasterRecordId } from "~/backend.server/models/disaster_record__sectors";
import { getAffectedByDisasterRecord } from "~/backend.server/models/analytics/affected-people-by-disaster-record";

import { FormScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName, eq, sql, and, isNotNull, isNull } from "drizzle-orm";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { divisionTable } from "~/drizzle/schema/divisionTable";

import { dr, Tx } from "~/db.server";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import { contentPickerConfig } from "./content-picker-config";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { DeleteButton } from "~/frontend/components/delete-dialog";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	getUserIdFromSession,
	getUserRoleFromSession,
} from "~/utils/session";
import { buildTree } from "~/components/TreeView";
import { DISASTER_RECORDS_UPLOAD_PATH, TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";
import { BackendContext } from "~/backend.server/context";
import {
	getUserCountryAccountsWithValidatorRole,
	getUserCountryAccountsWithAdminRole,
} from "~/db/queries/userCountryAccountsRepository";
import { handleApprovalWorkflowService } from "~/backend.server/services/approvalWorkflowService";
import { canEditDataCollectionRecord } from "~/frontend/user/roles";

type NonecoLossRow = {
	noneccoId: string;
	noneccoDesc: string;
	categoryTreeDisplay: string;
};

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userId = await getUserIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 403 });
	}
	if (!params.id) {
		throw "Route does not have $id param";
	}

	const initializeNewTreeView = async (): Promise<any[]> => {
		const idKey = "id";
		const parentKey = "parentId";
		const nameKey = "name";
		// Filter divisions by tenant context for security
		const rawData = await dr
			.select({
				id: divisionTable.id,
				parentId: divisionTable.parentId,
				name: divisionTable.name,
				importId: divisionTable.importId,
				nationalId: divisionTable.nationalId,
				level: divisionTable.level,
			})
			.from(divisionTable)
			.where(sql`country_accounts_id = ${countryAccountsId}`);
		return buildTree(rawData, idKey, parentKey, nameKey, "en", [
			"importId",
			"nationalId",
			"level",
			"name",
		]);
	};

	const hip = await dataForHazardPicker(ctx);

	let user = await authLoaderGetUserForFrontend(loaderArgs);

	const divisionGeoJSON = await dr
		.select({
			id: divisionTable.id,
			name: divisionTable.name,
			geojson: divisionTable.geojson,
		})
		.from(divisionTable)
		.where(
			and(
				isNull(divisionTable.parentId),
				isNotNull(divisionTable.geojson),
				eq(divisionTable.countryAccountsId, countryAccountsId),
			),
		);

	// Get users with validator role
	const usersWithValidatorRole =
		await getUserCountryAccountsWithValidatorRole(countryAccountsId);

	let filteredUsersWithValidatorRole: typeof usersWithValidatorRole = [];

	if (usersWithValidatorRole.length > 0) {
		// filter the usersWithValidatorRole to exclude the current user
		filteredUsersWithValidatorRole = usersWithValidatorRole.filter(
			(userAccount) => userAccount.id !== userId,
		);
	}

	// if usersWithValidatorRole is empty, fall back to usersWithAdminRole excluding current user
	if (filteredUsersWithValidatorRole.length === 0) {
		const usersWithAdminRole =
			await getUserCountryAccountsWithAdminRole(countryAccountsId);
		filteredUsersWithValidatorRole = usersWithAdminRole.filter(
			(userAccount) => userAccount.id !== userId,
		);
	}

	if (params.id === "new") {
		const treeData = await initializeNewTreeView();
		let ctryIso3: string = "";
		const settings = await getCountrySettingsFromSession(request);
		if (settings) {
			ctryIso3 = settings.dtsInstanceCtryIso3;
		}
		return {
			item: null,
			recordsNonecoLosses: [],
			recordsDisRecSectors: [],
			recordsHumanEffects: [],
			hip: hip,
			treeData: treeData,
			cpDisplayName: null,
			ctryIso3: ctryIso3,
			divisionGeoJSON: divisionGeoJSON,
			user,
			dbDisRecHumanEffectsSummaryTable: null,
			usersWithValidatorRole: filteredUsersWithValidatorRole,
		};
	}

	const item = await disasterRecordsById(params.id, countryAccountsId);
	if (!item) {
		throw new Response("Not Found", { status: 404 });
	}
	
	const userRole = await getUserRoleFromSession(request) as string;
	
	if (canEditDataCollectionRecord(userRole, item.approvalStatus) === false) {
		throw new Response("Access forbidden", { status: 403 });
	}

	const dbNonecoLosses: NonecoLossRow[] =
		await nonecoLossesFilderBydisasterRecordsId(ctx, params.id);
	const dbDisRecSectors = await sectorsFilterByDisasterRecordId(ctx, params.id);
	const dbDisRecHumanEffects = await getHumanEffectRecordsById(
		params.id,
		countryAccountsId,
	);
	const dbDisRecHumanEffectsSummaryTable = await getAffectedByDisasterRecord(
		dr,
		params.id,
	);

	// Define Keys Mapping (Make it Adaptable)
	const treeData = await initializeNewTreeView();
	let ctryIso3: string = "";
	const settings = await getCountrySettingsFromSession(loaderArgs.request);
	if (settings) {
		ctryIso3 = settings.dtsInstanceCtryIso3;
	}

	const cpDisplayName = await contentPickerConfig(ctx).selectedDisplay(
		ctx,
		dr,
		item.disasterEventId,
	);

	return {
		item,
		recordsNonecoLosses: dbNonecoLosses,
		recordsDisRecSectors: dbDisRecSectors,
		recordsHumanEffects: dbDisRecHumanEffects,
		hip: hip,
		treeData: treeData,
		cpDisplayName: cpDisplayName,
		ctryIso3: ctryIso3,
		divisionGeoJSON: divisionGeoJSON,
		user,
		dbDisRecHumanEffectsSummaryTable: dbDisRecHumanEffectsSummaryTable,
		usersWithValidatorRole: filteredUsersWithValidatorRole,
	};
});

export const action = authActionWithPerm(
	"EditData",
	async (args: ActionFunctionArgs) => {
		const { request } = args;
		const cloned = request.clone();
		const formData = await cloned.formData();
		const ctx = new BackendContext(args);
		const userSession = authActionGetAuth(args);

		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const updateWithTenant = async (
			ctx: BackendContext,
			tx: any,
			id: string,
			fields: any,
		) => {
			// Save normal for data to database using the disasterRecordsUpdate function
			const returnValue = await disasterRecordsUpdate(
				ctx,
				tx,
				id,
				fields,
				countryAccountsId,
			);

			// continue to approval workflow processing if update is successful
			if (returnValue.ok === true) {
				const updatedData = {
					...fields,
					countryAccountsId,
					updatedByUserId: userSession.user.id,
				};
				await handleApprovalWorkflowService(ctx, tx, id, "disaster_records", {
					...updatedData,
					tempValidatorUserIds: formData.get("tempValidatorUserIds"),
					tempAction: formData.get("tempAction"),
				});
			}

			return returnValue;
		};
		const getByIdWithTenant = async (
			_ctx: BackendContext,
			tx: Tx,
			id: string,
		) => {
			const record = await disasterRecordsByIdTx(tx, id, countryAccountsId);
			if (!record) {
				throw new Error(
					"Record not found or you don't have permission to access it",
				);
			}
			return record;
		};
		// Use the createAction function with our tenant-aware wrappers
		const actionHandler = createOrUpdateAction<DisasterRecordsFields>({
			fieldsDef: fieldsDef(ctx),
			create: async (ctx: BackendContext, tx: any, fields: any) => {
				const updatedData = {
					...fields,
					countryAccountsId,
					createdByUserId: userSession.user.id,
					updatedByUserId: userSession.user.id,
				};
				// Save normal for data to database using the disasterRecordsCreate function
				const returnValue = await disasterRecordsCreate(ctx, tx, updatedData);

				// continue to approval workflow processing if update is successful
				if (returnValue.ok === true) {
					await handleApprovalWorkflowService(
						ctx,
						tx,
						returnValue.id,
						"disaster_records",
						{
							...updatedData,
							tempValidatorUserIds: formData.get("tempValidatorUserIds"),
							tempAction: formData.get("tempAction"),
						},
					);
				}

				return returnValue;
			},
			update: updateWithTenant,
			getById: getByIdWithTenant,
			redirectTo: (id) => `${route}/${id}`,
			tableName: getTableName(disasterRecordsTable),
			action: (isCreate) =>
				isCreate ? "Create disaster record" : "Update disaster record",
			postProcess: async (id, data) => {
				// Ensure attachments is an array, even if it's undefined or empty
				const attachmentsArray = Array.isArray(data?.attachments)
					? data.attachments
					: [];

				const save_path = `${DISASTER_RECORDS_UPLOAD_PATH}/${id}`;
				const save_path_temp = TEMP_UPLOAD_PATH;

				// Process the attachments data
				const processedAttachments = ContentRepeaterUploadFile.save(
					attachmentsArray,
					save_path_temp,
					save_path,
				);

				// Update the `attachments` field in the database
				await dr
					.update(disasterRecordsTable)
					.set({
						attachments: processedAttachments || [], // Ensure it defaults to an empty array if undefined
					})
					.where(eq(disasterRecordsTable.id, id));
			},
			countryAccountsId,
		});

		return actionHandler(args);
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	return (
		<>
			<FormScreen
				ctx={ctx}
				loaderData={ld}
				formComponent={(props: any) => (
					<DisasterRecordsForm
						{...props}
						hip={ld.hip}
						treeData={ld.treeData}
						ctryIso3={ld.ctryIso3}
						cpDisplayName={ld.cpDisplayName}
						divisionGeoJSON={ld.divisionGeoJSON}
						user={ld.user}
						usersWithValidatorRole={ld.usersWithValidatorRole ?? []}
					/>
				)}
			/>
			{ld.item && (
				<div className="mg-container">
					<div>&nbsp;</div>
					<section>
						<div className="mx-auto px-4">
							<fieldset className="mb-6">
								<div className="mb-4">
									<legend className="text-xl font-semibold text-gray-800">
										{ctx.t({ code: "human_effects", msg: "Human effects" })}
									</legend>
								</div>

								<div className="border-0">
									<div className="flex justify-end mb-3">
										<LangLink
											lang={ctx.lang}
											to={`/disaster-record/edit-sub/${ld.item.id}/human-effects`}
											className="text-blue-600 hover:text-blue-800 text-sm"
										>
											[ {ctx.t({ code: "common.add_new_record", msg: "Add new record" })} ]
										</LangLink>
									</div>

									<div className="overflow-x-auto">
										<table className="w-full border border-gray-300 text-sm">
											<thead className="bg-gray-50 text-gray-700">
												<tr>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>
														{ctx.t({
															code: "human_effects.affected_old_desinventar",
															desc: "Human effects Affected (DesInventar is an older system used for tracking disaster data)",
															msg: "Affected (Old DesInventar)",
														})}
													</th>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th className="border border-gray-300 px-3 py-2"></th>
												</tr>
												<tr>
													{[
														{ code: "human_effects.deaths", msg: "Deaths" },
														{ code: "human_effects.injured", msg: "Injured" },
														{ code: "human_effects.missing", msg: "Missing" },
														{ code: "human_effects.directly_affected", msg: "Directly" },
														{ code: "human_effects.indirectly_affected", msg: "Indirectly" },
														{ code: "human_effects.displaced", msg: "Displaced" },
														{ code: "common.actions", msg: "Actions" },
													].map(({ code, msg }) => (
														<th key={code} className="border border-gray-300 px-3 py-2 font-medium text-left">
															{ctx.t({ code, msg })}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												<tr className="hover:bg-gray-50">
													{(
														[
															{ key: "deaths", tbl: "Deaths" },
															{ key: "injured", tbl: "Injured" },
															{ key: "missing", tbl: "Missing" },
															{ key: "directlyAffected", tbl: "Affected" },
															{ key: "indirectlyAffected", tbl: "Affected" },
															{ key: "displaced", tbl: "Displaced" },
														] as const
													).map(({ key, tbl }) => {
														const value = ld.dbDisRecHumanEffectsSummaryTable[key];
														const href = `/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=${tbl}`;
														return (
															<td key={key} className="border border-gray-300 px-3 py-2">
																{typeof value === "number" ? (
																	<LangLink lang={ctx.lang} to={href} className="text-blue-600 hover:underline">
																		{value}
																	</LangLink>
																) : value === true ? (
																	<LangLink lang={ctx.lang} to={href} className="text-blue-600 hover:underline">
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</LangLink>
																) : (
																	<span className="text-gray-400">-</span>
																)}
															</td>
														);
													})}
													<td className="border border-gray-300 px-3 py-2">
														<DeleteButton
															ctx={ctx}
															action={ctx.url(`/disaster-record/edit-sub/${ld.item.id}/human-effects/delete-all-data`)}
															label={ctx.t({ code: "common.delete", msg: "Delete" })}
														/>
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
					<section>
						<div className="mx-auto px-4">
							<fieldset className="mb-6">
								<div className="mb-4">
									<legend className="text-xl font-semibold text-gray-800">
										{ctx.t({ code: "sector_effects", msg: "Sector effects" })}
									</legend>
								</div>

								<div className="border-0">
									<div className="flex justify-end mb-3">
										<LangLink
											lang={ctx.lang}
											to={`/disaster-record/edit-sec/${ld.item.id}`}
											className="text-blue-600 hover:text-blue-800 text-sm"
										>
											[ {ctx.t({ code: "common.add_new_record", msg: "Add new record" })} ]
										</LangLink>
									</div>

									<div className="overflow-x-auto">
										<table className="w-full border border-gray-300 text-sm">
											<thead className="bg-gray-50 text-gray-700">
												<tr>
													<th className="border border-gray-300 px-3 py-2" colSpan={2} />
													<th className="border border-gray-300 px-3 py-2 text-center" colSpan={3}>
														{ctx.t({ code: "sector_effects.damage", msg: "Damage" })}
													</th>
													<th className="border border-gray-300 px-3 py-2 text-center" colSpan={2}>
														{ctx.t({ code: "sector_effects.losses", msg: "Losses" })}
													</th>
													<th className="border border-gray-300 px-3 py-2" colSpan={2} />
												</tr>
												<tr>
													{[
														{ code: "common.id", msg: "ID" },
														{ code: "sector_effects.sector", msg: "Sector" },
														{ code: "sector_effects.damage", msg: "Damage" },
														{ code: "sector_effects.recovery_cost", msg: "Recovery cost" },
														{ code: "sector_effects.cost", msg: "Cost" },
														{ code: "sector_effects.losses", msg: "Losses" },
														{ code: "sector_effects.cost", msg: "Cost" },
														{ code: "sector_effects.disruption", msg: "Disruption" },
														{ code: "common.actions", msg: "Actions" },
													].map(({ code, msg }, i) => (
														<th key={`${code}-${i}`} className="border border-gray-300 px-3 py-2 font-medium text-left">
															{ctx.t({ code, msg })}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{Array.isArray(ld.recordsDisRecSectors) &&
													ld.recordsDisRecSectors.map((item, index) => (
														<tr key={index} className="hover:bg-gray-50">
															{/* ID */}
															<td className="border border-gray-300 px-3 py-2 text-gray-500 font-mono text-xs">
																{item.disRecSectorsId.slice(0, 8)}
															</td>

															{/* Sector */}
															<td className="border border-gray-300 px-3 py-2">
																{item.sectorTreeDisplay}
															</td>

															{/* Damage */}
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsWithDamage && (
																	<LangLink
																		lang={ctx.lang}
																		to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/damages?sectorId=${item.disRecSectorsSectorId}`}
																		className="text-blue-600 hover:underline"
																	>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</LangLink>
																)}
															</td>

															{/* Recovery cost */}
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsDamageRecoveryCost && (
																	<span>{item.disRecSectorsDamageRecoveryCost} {item.disRecSectorsDamageRecoveryCostCurrency}</span>
																)}
															</td>

															{/* Damage cost */}
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsDamageCost && (
																	<span>{item.disRecSectorsDamageCost} {item.disRecSectorsDamageCostCurrency}</span>
																)}
															</td>

															{/* Losses */}
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsWithLosses && (
																	<LangLink
																		lang={ctx.lang}
																		to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/losses?sectorId=${item.disRecSectorsSectorId}`}
																		className="text-blue-600 hover:underline"
																	>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</LangLink>
																)}
															</td>

															{/* Losses cost */}
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsLossesCost && (
																	<span>{item.disRecSectorsLossesCost} {item.disRecSectorsLossesCostCurrency}</span>
																)}
															</td>

															{/* Disruption */}
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsWithDisruption && (
																	<LangLink
																		lang={ctx.lang}
																		to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/disruptions?sectorId=${item.disRecSectorsSectorId}`}
																		className="text-blue-600 hover:underline"
																	>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</LangLink>
																)}
															</td>

															{/* Actions */}
															<td className="border border-gray-300 px-3 py-2">
																{ld.item?.id && (
																	<div className="flex items-center gap-2">
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sec/${ld.item.id}/delete/?id=${item.disRecSectorsId}`}
																			className="text-red-600 hover:underline"
																		>
																			{ctx.t({ code: "common.delete", msg: "Delete" })}
																		</LangLink>
																		<span className="text-gray-300">|</span>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sec/${ld.item.id}/?id=${item.disRecSectorsId}`}
																			className="text-blue-600 hover:underline"
																		>
																			{ctx.t({ code: "common.edit", msg: "Edit" })}
																		</LangLink>
																	</div>
																)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
					<section>
						<div className="mx-auto px-4">
							<fieldset className="mb-6">
								<div className="mb-4">
									<legend className="text-xl font-semibold text-gray-800">
										{ctx.t({ code: "non_economic_losses", msg: "Non-economic losses" })}
									</legend>
								</div>

								<div className="border-0">
									<div className="flex justify-end mb-3">
										<LangLink
											lang={ctx.lang}
											to={`${route}/non-economic-losses/${ld.item.id}`}
											className="text-blue-600 hover:text-blue-800 text-sm"
										>
											[ {ctx.t({ code: "common.add_new_record", msg: "Add new record" })} ]
										</LangLink>
									</div>

									<div className="overflow-x-auto">
										<table className="w-full border border-gray-300 text-sm">
											<thead className="bg-gray-50 text-gray-700">
												<tr>
													{[
														{ code: "common.id", msg: "ID" },
														{ code: "common.category", msg: "Category" },
														{ code: "common.description", msg: "Description" },
														{ code: "common.actions", msg: "Actions" },
													].map(({ code, msg }) => (
														<th key={code} className="border border-gray-300 px-3 py-2 font-medium text-left">
															{ctx.t({ code, msg })}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{Array.isArray(ld.recordsNonecoLosses) &&
													ld.recordsNonecoLosses.map((item, index) => (
														<tr key={index} className="hover:bg-gray-50">
															<td className="border border-gray-300 px-3 py-2 text-gray-500 font-mono text-xs">
																{item.noneccoId.slice(0, 8)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.categoryTreeDisplay}
															</td>
															<td className="border border-gray-300 px-3 py-2 text-gray-700">
																{item.noneccoDesc.slice(0, 300)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{ld.item?.id && (
																	<div className="flex items-center gap-2">
																		<LangLink
																			lang={ctx.lang}
																			to={`${route}/non-economic-losses/${ld.item.id}/delete/?id=${item.noneccoId}`}
																			className="text-red-600 hover:underline"
																		>
																			{ctx.t({ code: "common.delete", msg: "Delete" })}
																		</LangLink>
																		<span className="text-gray-300">|</span>
																		<LangLink
																			lang={ctx.lang}
																			to={`${route}/non-economic-losses/${ld.item.id}/?id=${item.noneccoId}`}
																			className="text-blue-600 hover:underline"
																		>
																			{ctx.t({ code: "common.edit", msg: "Edit" })}
																		</LangLink>
																	</div>
																)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
				</div >
			)
			}
		</>
	);
}
