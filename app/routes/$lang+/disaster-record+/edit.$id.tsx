import {
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
	authActionWithPerm,
} from "~/util/auth";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
	disasterRecordsByIdTx,
	getHumanEffectRecordsById,
	DisasterRecordsFields,
} from "~/backend.server/models/disaster_record";

import { useLoaderData } from "@remix-run/react";

import {
	fieldsDef,
	DisasterRecordsForm,
	route,
} from "~/frontend/disaster-record/form";

import { nonecoLossesFilderBydisasterRecordsId } from "~/backend.server/models/noneco_losses";
import { sectorsFilderBydisasterRecordsId } from "~/backend.server/models/disaster_record__sectors";
import { getAffectedByDisasterRecord } from "~/backend.server/models/analytics/affected-people-by-disaster-record";

import { FormScreen } from "~/frontend/form";

import { createOrUpdateAction } from "~/backend.server/handlers/form/form";
import { getTableName, eq, sql, and, isNotNull, isNull } from "drizzle-orm";
import { disasterRecordsTable, divisionTable } from "~/drizzle/schema";

import { dr, Tx } from "~/db.server";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import { contentPickerConfig } from "./content-picker-config";

import { ContentRepeaterUploadFile } from "~/components/ContentRepeater/UploadFile";
import { DeleteButton } from "~/frontend/components/delete-dialog";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { buildTree } from "~/components/TreeView";
import { DISASTER_RECORDS_UPLOAD_PATH, TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";
import { BackendContext } from "~/backend.server/context";


export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized access", { status: 401 });
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
				eq(divisionTable.countryAccountsId, countryAccountsId)
			)
		);

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
		};
	}

	const item = await disasterRecordsById(params.id);
	if (!item || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Not Found", { status: 404 });
	}

	const dbNonecoLosses = await nonecoLossesFilderBydisasterRecordsId(ctx, params.id);
	const dbDisRecSectors = await sectorsFilderBydisasterRecordsId(ctx, params.id);
	const dbDisRecHumanEffects = await getHumanEffectRecordsById(
		params.id,
		countryAccountsId
	);
	const dbDisRecHumanEffectsSummaryTable = await getAffectedByDisasterRecord(
		dr,
		params.id
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
		item.disasterEventId
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
	};
});

export const action = authActionWithPerm(
	"EditData",
	async (args: ActionFunctionArgs) => {
		const { request } = args;
		const ctx = new BackendContext(args);

		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const updateWithTenant = async (ctx: BackendContext, tx: any, id: string, fields: any) => {
			return disasterRecordsUpdate(ctx, tx, id, fields, countryAccountsId);
		};
		const getByIdWithTenant = async (_ctx: BackendContext, tx: Tx, id: string) => {
			const record = await disasterRecordsByIdTx(tx, id);
			if (!record) {
				throw new Error(
					"Record not found or you don't have permission to access it"
				);
			}
			return record;
		};
		// Use the createAction function with our tenant-aware wrappers
		const actionHandler = createOrUpdateAction<DisasterRecordsFields>({
			fieldsDef: fieldsDef(ctx),
			create: async (ctx: BackendContext, tx: any, fields: any) => {
				return disasterRecordsCreate(ctx, tx, fields);
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
					save_path
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
	}
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
					/>
				)}
			/>
			{ld.item && (
				<>
					<div>&nbsp;</div>
					<section>
						<div className="mg-container">
							<fieldset className="dts-form__section">
								<div className="dts-form__intro">
									<legend className="dts-heading-3">
										{ctx.t({
											"code": "human_effects",
											"msg": "Human effects"
										})}
									</legend>
								</div>
								<div className="dts-form__body no-border-bottom">
									<div className="dts-form__section-remove">
										<LangLink
											lang={ctx.lang}
											to={`/disaster-record/edit-sub/${ld.item.id}/human-effects`}
										>
											[ {ctx.t({
												"code": "common.add_new_record",
												"msg": "Add new record"
											})} ]
										</LangLink>
										&nbsp;
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<table className="dts-table table-border">
												<thead>
													<tr>
														<th></th>
														<th></th>
														<th></th>
														<th className="center" colSpan={2}>
															{ctx.t({
																"code": "human_effects.affected_old_desinventar",
																"desc": "Human effects Affected (DesInventar is an older system used for tracking disaster data)",
																"msg": "Affected (Old DesInventar)"
															})}
														</th>
														<th></th>
														<th></th>
													</tr>
													<tr>
														<th>
															{ctx.t({
																"code": "human_effects.deaths",
																"msg": "Deaths"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "human_effects.injured",
																"msg": "Injured"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "human_effects.missing",
																"msg": "Missing"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "human_effects.directly_affected",
																"msg": "Directly"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "human_effects.indirectly_affected",
																"msg": "Indirectly"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "human_effects.displaced",
																"msg": "Displaced"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "common.actions",
																"msg": "Actions"
															})}
														</th>
													</tr>
												</thead>
												<tbody>
													<tr>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.deaths == "number" && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Deaths`}
																		>
																			{ld.dbDisRecHumanEffectsSummaryTable.deaths}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.deaths == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable.deaths && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Deaths`}
																		>
																			{ctx.t({
																				"code": "common.yes",
																				"msg": "Yes"
																			})}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.deaths == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable.deaths && (
																	<>-</>
																)}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.injured == "number" && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Injured`}
																		>
																			{
																				ld.dbDisRecHumanEffectsSummaryTable
																					.injured
																			}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.injured == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable.injured && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Injured`}
																		>
																			{ctx.t({
																				"code": "common.yes",
																				"msg": "Yes"
																			})}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.injured == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.injured && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.missing == "number" && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Missing`}
																		>
																			{
																				ld.dbDisRecHumanEffectsSummaryTable
																					.missing
																			}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.missing == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable.missing && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Missing`}
																		>
																			{ctx.t({
																				"code": "common.yes",
																				"msg": "Yes"
																			})}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.missing == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.missing && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.directlyAffected == "number" && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																		>
																			{
																				ld.dbDisRecHumanEffectsSummaryTable
																					.directlyAffected
																			}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.directlyAffected == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable
																	.directlyAffected && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																		>
																			{ctx.t({
																				"code": "common.yes",
																				"msg": "Yes"
																			})}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.directlyAffected == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.directlyAffected && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.indirectlyAffected == "number" && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																		>
																			{
																				ld.dbDisRecHumanEffectsSummaryTable
																					.indirectlyAffected
																			}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.indirectlyAffected == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable
																	.indirectlyAffected && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Affected`}
																		>
																			{ctx.t({
																				"code": "common.yes",
																				"msg": "Yes"
																			})}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.indirectlyAffected == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.indirectlyAffected && <>-</>}
														</td>
														<td>
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.displaced == "number" && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Displaced`}
																		>
																			{
																				ld.dbDisRecHumanEffectsSummaryTable
																					.displaced
																			}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.displaced == "boolean" &&
																ld.dbDisRecHumanEffectsSummaryTable
																	.displaced && (
																	<>
																		<LangLink
																			lang={ctx.lang}
																			to={`/disaster-record/edit-sub/${ld.item.id}/human-effects?tbl=Displaced`}
																		>
																			{ctx.t({
																				"code": "common.yes",
																				"msg": "Yes"
																			})}
																		</LangLink>
																	</>
																)}
															{typeof ld.dbDisRecHumanEffectsSummaryTable
																.displaced == "boolean" &&
																!ld.dbDisRecHumanEffectsSummaryTable
																	.displaced && <>-</>}
														</td>
														<td>
															<DeleteButton
																ctx={ctx}
																action={ctx.url(`/disaster-record/edit-sub/${ld.item.id}/human-effects/delete-all-data`)}
																label={ctx.t({
																	"code": "common.delete",
																	"msg": "Delete"
																})}
															/>
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
					<section>
						<div className="mg-container">
							<fieldset className="dts-form__section">
								<div className="dts-form__intro">
									<legend className="dts-heading-3">
										{ctx.t({
											"code": "sector_effects",
											"msg": "Sector effects"
										})}
									</legend>
								</div>
								<div className="dts-form__body no-border-bottom">
									<div className="dts-form__section-remove">
										<LangLink lang={ctx.lang} to={`/disaster-record/edit-sec/${ld.item.id}`}>
											[ {ctx.t({
												"code": "common.add_new_record",
												"msg": "Add new record"
											})} ]
										</LangLink>
									</div>
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<table className="dts-table table-border">
												<thead>
													<tr>
														<th></th>
														<th></th>
														<th className="center" colSpan={3}>
															{ctx.t({
																"code": "sector_effects.damage",
																"msg": "Damage"
															})}
														</th>
														<th className="center" colSpan={2}>
															{ctx.t({
																"code": "sector_effects.losses",
																"msg": "Losses"
															})}
														</th>
														<th></th>
														<th></th>
													</tr>
													<tr>
														<th>
															{ctx.t({
																"code": "common.id",
																"msg": "ID"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.sector",
																"msg": "Sector"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.damage",
																"msg": "Damage"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.recovery_cost",
																"msg": "Recovery cost"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.cost",
																"msg": "Cost"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.losses",
																"msg": "Losses"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.cost",
																"msg": "Cost"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "sector_effects.disruption",
																"msg": "Disruption"
															})}
														</th>
														<th>
															{ctx.t({
																"code": "common.actions",
																"msg": "Actions"
															})}
														</th>

													</tr>
												</thead>
												<tbody>
													{ld.recordsDisRecSectors &&
														Array.isArray(ld.recordsDisRecSectors) &&
														ld.recordsDisRecSectors.map((item, index) => (
															<tr key={index}>
																<td>{item.disRecSectorsId.slice(0, 8)}</td>
																<td>{item.sectorTreeDisplay}</td>
																<td>
																	{item.disRecSectorsWithDamage && (
																		<>
																			<LangLink
																				lang={ctx.lang}
																				to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/damages?sectorId=${item.disRecSectorsSectorId}`}
																			>
																				{ctx.t({
																					"code": "common.yes",
																					"msg": "Yes"
																				})}

																			</LangLink>
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsDamageRecoveryCost && (
																		<>
																			{item.disRecSectorsDamageRecoveryCost}{" "}
																			{
																				item.disRecSectorsDamageRecoveryCostCurrency
																			}
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsDamageCost && (
																		<>
																			{item.disRecSectorsDamageCost}{" "}
																			{item.disRecSectorsDamageCostCurrency}
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsWithLosses && (
																		<>
																			<LangLink
																				lang={ctx.lang}
																				to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/losses?sectorId=${item.disRecSectorsSectorId}`}
																			>
																				{ctx.t({
																					"code": "common.yes",
																					"msg": "Yes"
																				})}

																			</LangLink>
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsLossesCost && (
																		<>
																			{item.disRecSectorsLossesCost}{" "}
																			{item.disRecSectorsLossesCostCurrency}
																		</>
																	)}
																</td>
																<td>
																	{item.disRecSectorsWithDisruption && (
																		<>
																			<LangLink
																				lang={ctx.lang}
																				to={`/disaster-record/edit-sub/${item.disRecSectorsdisasterRecordId}/disruptions?sectorId=${item.disRecSectorsSectorId}`}
																			>
																				{ctx.t({
																					"code": "common.yes",
																					"msg": "Yes"
																				})}

																			</LangLink>
																		</>
																	)}
																</td>
																<td>
																	{ld.item && ld.item.id && (
																		<>
																			<LangLink
																				lang={ctx.lang}
																				to={`/disaster-record/edit-sec/${ld.item.id}/delete/?id=${item.disRecSectorsId}`}
																			>
																				{ctx.t({
																					"code": "common.delete",
																					"msg": "Delete"
																				})}
																			</LangLink>
																			&nbsp;|&nbsp;
																			<LangLink
																				lang={ctx.lang}
																				to={`/disaster-record/edit-sec/${ld.item.id}/?id=${item.disRecSectorsId}`}
																			>
																				{ctx.t({
																					"code": "common.edit",
																					"msg": "Edit"
																				})}
																			</LangLink>
																		</>
																	)}
																</td>
															</tr>
														))}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
					<section>
						<div className="mg-container">
							<fieldset className="dts-form__section">
								<div className="dts-form__intro">
									<legend className="dts-heading-3">
										{ctx.t({
											"code": "non_economic_losses",
											"msg": "Non-economic losses"
										})}
									</legend>
									<div className="dts-form__body no-border-bottom">
										<div className="dts-form__section-remove">
											<LangLink lang={ctx.lang} to={`${route}/non-economic-losses/${ld.item.id}`}>
												[ {ctx.t({
													"code": "common.add_new_record",
													"msg": "Add new record"
												})} ]
											</LangLink>
										</div>
										<div className="mg-grid mg-grid__col-1">
											<div className="dts-form-component">
												<table className="dts-table table-border">
													<thead>
														<tr>
															<th>
																{ctx.t({
																	"code": "common.id",
																	"msg": "ID"
																})}
															</th>
															<th>
																{ctx.t({
																	"code": "common.category",
																	"msg": "Category"
																})}
															</th>
															<th>
																{ctx.t({
																	"code": "common.description",
																	"msg": "Description"
																})}
															</th>
															<th>
																{ctx.t({
																	"code": "common.actions",
																	"msg": "Actions"
																})}
															</th>
														</tr>
													</thead>
													<tbody>
														{ld.recordsNonecoLosses &&
															Array.isArray(ld.recordsNonecoLosses) &&
															ld.recordsNonecoLosses.map((item, index) => (
																<tr key={index}>
																	<td>{item.noneccoId.slice(0, 8)}</td>
																	<td>{item.categoryTreeDisplay}</td>
																	<td>{item.noneccoDesc.slice(0, 300)}</td>
																	<td>
																		{ld.item && ld.item.id && (
																			<>
																				<LangLink
																					lang={ctx.lang}
																					to={`${route}/non-economic-losses/${ld.item.id}/delete/?id=${item.noneccoId}`}
																				>
																					{ctx.t({
																						"code": "common.delete",
																						"msg": "Delete"
																					})}
																				</LangLink>
																				&nbsp;|&nbsp;
																				<LangLink
																					lang={ctx.lang}
																					to={`${route}/non-economic-losses/${ld.item.id}/?id=${item.noneccoId}`}
																				>
																					{ctx.t({
																						"code": "common.edit",
																						"msg": "Edit"
																					})}
																				</LangLink>
																			</>
																		)}
																	</td>
																</tr>
															))}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
				</>
			)}
		</>
	);
}
