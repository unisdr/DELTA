import { useOutletContext } from "@remix-run/react";
import { authLoaderPublicOrWithPerm, authActionWithPerm } from "~/util/auth";
import { sectorChildrenById, sectorById } from "~/backend.server/models/sector";
import { useLoaderData } from "@remix-run/react";

import {
	disasterEventSectorTotal__ById,
	disasterEventSectorDamageDetails__ById,
	disasterEventSectorLossesDetails__ById,
	disasterEventSectorDisruptionDetails__ById,
} from "~/backend.server/models/analytics/disaster-events";

import CustomPieChart from "~/components/PieChart";

import { unitName } from "~/frontend/unit_picker";
import { getCountrySettingsFromSession } from "~/util/session";



import { ViewContext } from "~/frontend/context";
import { BackendContext } from "~/backend.server/context";

interface interfacePieChart {
	name: string;
	value: number;
}

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		const ctx = new BackendContext(loaderArgs);
		const req = loaderArgs.request;
		// Parse the request URL
		const parsedUrl = new URL(req.url);
		const sectorPieChartData: Record<
			string,
			{
				damages: interfacePieChart;
				losses: interfacePieChart;
				recovery: interfacePieChart;
			}
		> = {};

		// Extract query string parameters
		const queryParams = parsedUrl.searchParams;
		const xId = queryParams.get("disasterEventId") || "";
		const disasterEventId = queryParams.get("disasterEventId") || "";
		const qs_sectorid = queryParams.get("sectorid") || "";
		const qs_subsectorid = queryParams.get("subsectorid") || "";

		let sectorData: any = {};
		let sectorId: string = "0";

		const settings = await getCountrySettingsFromSession(req);
		let confCurrency;
		if (settings) {
			confCurrency = settings.currencyCode.toUpperCase();
		}

		let sectorDamagePieChartData: interfacePieChart[] = [];
		let sectorLossesPieChartData: interfacePieChart[] = [];
		let sectorRecoveryPieChartData: interfacePieChart[] = [];

		if (!disasterEventId || !qs_sectorid) {
			throw new Response("Missing required parameters", { status: 400 });
		}

		if (confCurrency.length === 0) {
			throw new Response("Missing required currencies in configuration.", {
				status: 400,
			});
		}

		if (qs_sectorid.length > 0 && qs_subsectorid.length > 0) {
			sectorId = qs_subsectorid;
		} else if (qs_sectorid.length > 0) {
			sectorId = qs_sectorid;
		} else {
			throw new Response("Missing required parameters", { status: 400 });
		}

		sectorData = await sectorById(ctx, sectorId, true);

		const sectorChildren = (await sectorChildrenById(ctx, sectorId)) as {
			name: string;
			id: string;
			relatedDecendants: { id: string; name: string; level: number }[];
		}[];
		let sectorAllChildrenIdsArray: string[] = [];

		for (const item of sectorChildren) {
			const sectorChildrenIdsArray: string[] = item.relatedDecendants.map(
				(item2) => item2.id
			);

			sectorAllChildrenIdsArray = [
				...sectorAllChildrenIdsArray,
				...sectorChildrenIdsArray,
			];

			let effects = await disasterEventSectorTotal__ById(
				xId,
				sectorChildrenIdsArray,
				confCurrency
			);

			// Populate Sector Pie Chart Data
			if (
				!sectorPieChartData[item.id] &&
				effects &&
				((effects.damages && effects.damages.total > 0) ||
					effects.losses.total > 0 ||
					effects.recovery.total > 0)
			) {
				sectorPieChartData[item.id] = {
					damages: { name: item.name, value: effects.damages.total },
					losses: { name: item.name, value: effects.losses.total },
					recovery: { name: item.name, value: effects.recovery.total },
				};
			} else if (
				sectorPieChartData[item.id] &&
				effects &&
				((effects.damages && effects.damages.total > 0) ||
					effects.losses.total > 0 ||
					effects.recovery.total > 0)
			) {
				sectorPieChartData[item.id].damages.value += effects.damages.total;
				sectorPieChartData[item.id].losses.value += effects.losses.total;
				sectorPieChartData[item.id].recovery.value += effects.recovery.total;
			}
		}
		// Extract values only for damage, losses, and recovery
		sectorDamagePieChartData = Object.values(sectorPieChartData).map(
			(entry) => entry.damages
		);
		sectorLossesPieChartData = Object.values(sectorPieChartData).map(
			(entry) => entry.losses
		);
		sectorRecoveryPieChartData = Object.values(sectorPieChartData).map(
			(entry) => entry.recovery
		);

		// console.log( 'sectorChildrenIdsArray', sectorAllChildrenIdsArray );

		const dbDisasterEventDamage = await disasterEventSectorDamageDetails__ById(
			ctx,
			disasterEventId,
			sectorAllChildrenIdsArray
		);
		const dbDisasterEventLosses = await disasterEventSectorLossesDetails__ById(
			ctx,
			disasterEventId,
			sectorAllChildrenIdsArray
		);
		const dbDisasterEventDisruptions =
			await disasterEventSectorDisruptionDetails__ById(
				ctx,
				disasterEventId,
				sectorAllChildrenIdsArray
			);

		// console.log( dbDisasterEventDisruptions );

		// console.log('Child Loader: ', req.url, disasterEventId, qs_sectorid, qs_subsectorid, sectorData, sectorChildren);

		return {
			
			sectorData: sectorData,
			sectorPieChartData: sectorPieChartData,
			sectorDamagePieChartData: sectorDamagePieChartData,
			sectorLossesPieChartData: sectorLossesPieChartData,
			sectorRecoveryPieChartData: sectorRecoveryPieChartData,
			confCurrencies: confCurrency,
			dbDisasterEventDamage: dbDisasterEventDamage,
			dbDisasterEventLosses: dbDisasterEventLosses,
			dbDisasterEventDisruptions: dbDisasterEventDisruptions,
		};
	}
);

export const action = authActionWithPerm("ViewData", async () => {
	return {};
});

export default function DetailSectorEffectScreen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();

	const myValue = useOutletContext();

	let pieChartHeightContainer = 400;
	let pieChartHeight = 350;
	if (
		ld.sectorDamagePieChartData.length >= 6 ||
		ld.sectorLossesPieChartData.length >= 6
	) {
		pieChartHeightContainer += 100;
		pieChartHeight += 100;
	}
	console.log(myValue);

	return (
		<>
			<section className="dts-page-section">
				<div className="mg-container">
					{Object.keys(ld.sectorDamagePieChartData).length == 0 &&
						Object.keys(ld.sectorLossesPieChartData).length == 0 &&
						Object.keys(ld.sectorRecoveryPieChartData).length == 0 && (
							<p>
								{ctx.t(
									{
										"code": "analysis.no_data_for_sector_criteria",
										"desc": "Message shown when no data is available for the selected sector. Placeholder {sector_name} is replaced with the actual sector name.",
										"msg": "No data available for the selected criteria ({sector_name})"
									},
									{ sector_name: ld.sectorData.sectorname }
								)}
							</p>
						)}

					<div className="mg-grid mg-grid__col-3">
						{Object.keys(ld.sectorDamagePieChartData).length > 0 && (
							<div className="dts-data-box">
								<h3 className="dts-body-label">
									<span>
										{ctx.t(
											{
												"code": "analysis.damage_in_sector_and_currency",
												"desc": "Title showing total damage for a specific sector and currency. Placeholders {sector_name} and {currency} are replaced.",
												"msg": "Damage in {sector_name} in {currency}"
											},
											{
												sector_name: ld.sectorData.sectorname,
												currency: ld.confCurrencies
											}
										)}
									</span>
								</h3>
								<div
									className="dts-placeholder"
									style={{ height: "${pieChartHeightContainer}px" }}
								>
									<CustomPieChart
										data={ld.sectorDamagePieChartData}
										chartHeight={pieChartHeight}
										boolRenderLabel={false}
										currency={ld.confCurrencies}
									/>
								</div>
							</div>
						)}

						{Object.keys(ld.sectorLossesPieChartData).length > 0 && (
							<div className="dts-data-box">
								<h3 className="dts-body-label">
									<span>

										{ctx.t(
											{
												"code": "analysis.losses_in_sector_and_currency",
												"desc": "Title showing losses for a specific sector and currency. Placeholders {sector} and {currency} are replaced with actual values.",
												"msg": "Losses in {sector} in {currency}"
											},
											{
												sector: ld.sectorData.sectorname,
												currency: ld.confCurrencies
											}
										)}
									</span>
								</h3>
								<div
									className="dts-placeholder"
									style={{ height: "${pieChartHeightContainer}px" }}
								>
									<CustomPieChart
										data={ld.sectorLossesPieChartData}
										chartHeight={pieChartHeight}
										boolRenderLabel={false}
										currency={ld.confCurrencies}
									/>
								</div>
							</div>
						)}

						{Object.keys(ld.sectorRecoveryPieChartData).length > 0 && (
							<div className="dts-data-box">
								<h3 className="dts-body-label">
									<span>
										{ctx.t(
											{
												"code": "analysis.recovery_in_sector_and_currency",
												"desc": "Title showing recovery cost for a specific sector and currency. Placeholders {sector} and {currency} are replaced with actual values.",
												"msg": "Recovery in {sector} in {currency}"
											},
											{
												sector: ld.sectorData.sectorname,
												currency: ld.confCurrencies
											}
										)}
									</span>
								</h3>
								<div
									className="dts-placeholder"
									style={{ height: "${pieChartHeightContainer}px" }}
								>
									<CustomPieChart
										data={ld.sectorRecoveryPieChartData}
										chartHeight={pieChartHeight}
										boolRenderLabel={false}
										currency={ld.confCurrencies}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			{(Object.keys(ld.sectorDamagePieChartData).length > 0 ||
				Object.keys(ld.sectorLossesPieChartData).length > 0 ||
				Object.keys(ld.sectorRecoveryPieChartData).length > 0) && (
					<>
						<section className="dts-page-section">
							<div className="mg-container">
								<h3 className="dts-heading-3">
									{ctx.t(
										{
											"code": "analysis.detailed_effects_in_sector",
											"desc": "Title for detailed effects section. Placeholder {sector_name} is replaced with the selected sector name.",
											"msg": "Detailed effects in {sector_name}"
										},
										{ sector_name: ld.sectorData.sectorname }
									)}
								</h3>

								<p className="dts-body-text mb-6">
									{ctx.t({
										"code": "analysis.view_detailed_info_sector",
										"msg": "View detailed information about damages, losses, and disruptions in the selected sector."
									})}
								</p>
								<h4 className="dts-heading-4">{ctx.t({ "code": "analysis.damages", "msg": "Damages" })}</h4>

								{ld.dbDisasterEventDamage.length == 0 && (
									<p>
										{ctx.t({
											"code": "analysis.no_damages_data_for_criteria",
											"msg": "No damages data available for the selected criteria."
										})}
									</p>
								)}

								{ld.dbDisasterEventDamage.length > 0 && (
									<>
										<div className="table-wrapper">
											<table
												className="dts-table"
												role="grid"
												aria-label={ctx.t({ "code": "analysis.damages", "msg": "Damages" })}
											>
												<thead>
													<tr>
														<th
															role="columnheader"
															aria-label={ctx.t({ "code": "analysis.disaster_record_id", "msg": "Disaster record ID" })}
														>
															{ctx.t({ "code": "analysis.disaster_record_id", "msg": "Disaster record ID" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.damage_id", "msg": "Damage ID" })}>
															{ctx.t({ "code": "analysis.damage_id", "msg": "Damage ID" })}
														</th>

														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.sector_classification", "msg": "Sector classification" })}>
															{ctx.t({ "code": "analysis.sector_classification", "msg": "Sector classification" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.asset", "msg": "Asset" })}>
															{ctx.t({ "code": "analysis.asset", "msg": "Asset" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.total_number_of_assets", "msg": "Number of assets" })}>
															{ctx.t({ "code": "analysis.total_number_of_assets", "msg": "Number of assets" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.repair_replacement_cost", "msg": "Repair/Replacement cost" })}>
															{ctx.t({ "code": "analysis.repair_replacement_cost", "msg": "Repair/Replacement cost" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.recovery_cost", "msg": "Recovery cost" })}>
															{ctx.t({ "code": "analysis.recovery_cost", "msg": "Recovery cost" })}
														</th>
													</tr>
												</thead>
												<tbody>
													{ld.dbDisasterEventDamage.map((item, index) => (
														<tr role="row" key={index}>
															<td role="gridcell">{item.recordId.slice(0, 8)}</td>
															<td role="gridcell">{item.damageId.slice(0, 8)}</td>
															<td role="gridcell">{item.sectorName}</td>
															<td role="gridcell">{item.assetName}</td>
															<td role="gridcell">
																{Number(
																	item.damageTotalNumberAssetAffected
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}{" "}
																{item.damageUnit !== "number_count" &&
																	unitName(item.damageUnit || "")}
															</td>
															<td role="gridcell">
																{ld.confCurrencies}{" "}
																{Number(
																	item.damageTotalRepairReplacementCost
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
															<td role="gridcell">
																{ld.confCurrencies}{" "}
																{Number(
																	item.damageTotalRecoveryCost
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</>
								)}
							</div>
						</section>

						<section className="dts-page-section">
							<div className="mg-container">
								<h4 className="dts-heading-4">{ctx.t({ "code": "analysis.losses", "msg": "Losses" })}</h4>

								{ld.dbDisasterEventLosses.length == 0 && (
									<p className="text-gray-500">
										{ctx.t({
											"code": "analysis.no_losses_data_for_criteria",
											"msg": "No losses data available for the selected criteria."
										})}
									</p>
								)}

								{ld.dbDisasterEventLosses.length > 0 && (
									<>
										<div className="table-wrapper">
											<table
												className="dts-table"
												role="grid"
												aria-label={ctx.t({ "code": "analysis.losses", "msg": "Losses" })}
											>
												<thead>
													<tr>
														<th
															role="columnheader"
															aria-label={ctx.t({ "code": "analysis.disaster_record_id", "msg": "Disaster record ID" })}
														>
															{ctx.t({ "code": "analysis.disaster_record_id", "msg": "Disaster record ID" })}

														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.losses_id", "msg": "Losses ID" })}>
															{ctx.t({ "code": "analysis.losses_id", "msg": "Losses ID" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.sector_classification", "msg": "Sector classification" })}>
															{ctx.t({ "code": "analysis.sector_classification", "msg": "Sector classification" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "common.description", "msg": "Description" })}>
															{ctx.t({ "code": "common.description", "msg": "Description" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.public_cost", "msg": "Public cost" })}>
															{ctx.t({ "code": "analysis.public_cost", "msg": "Public cost" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.private_cost", "msg": "Private cost" })}>
															{ctx.t({ "code": "analysis.private_cost", "msg": "Private cost" })}
														</th>
													</tr>
												</thead>
												<tbody>
													{ld.dbDisasterEventLosses.map((item, index) => (
														<tr role="row" key={index}>
															<td role="gridcell">{item.recordId.slice(0, 8)}</td>
															<td role="gridcell">{item.lossesId.slice(0, 8)}</td>
															<td role="gridcell">{item.sectorName}</td>
															<td role="gridcell">{item.lossesDesc}</td>
															<td role="gridcell">
																{item.lossesTotalPublicCostCurrency}{" "}
																{Number(
																	item.lossesTotalPublicCost
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
															<td role="gridcell">
																{item.lossesTotalPrivateCostCurrency}{" "}
																{Number(
																	item.lossesTotalPrivateCost
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</>
								)}
							</div>
						</section>
						<section className="dts-page-section">
							<div className="mg-container">
								<h4 className="dts-heading-4">{ctx.t({ "code": "analysis.disruptions", "msg": "Disruptions" })}</h4>

								{ld.dbDisasterEventDisruptions.length == 0 && (
									<p className="text-gray-500">
										{ctx.t({
											"code": "analysis.no_disruption_data_for_criteria",
											"msg": "No disruption data available for the selected criteria."
										})}
									</p>
								)}

								{ld.dbDisasterEventDisruptions.length > 0 && (
									<>
										<div className="table-wrapper">
											<table
												className="dts-table"
												role="grid"
												aria-label={ctx.t({ "code": "analysis.disruptions", "msg": "Disruptions" })}
											>
												<thead>
													<tr>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.disaster_record_id", "msg": "Disaster record ID" })}>
															{ctx.t({ "code": "analysis.disaster_record_id", "msg": "Disaster record ID" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.disruption_id", "msg": "Disruption ID" })}>
															{ctx.t({ "code": "analysis.disruption_id", "msg": "Disruption ID" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.sector_classification", "msg": "Sector classification" })}>
															{ctx.t({ "code": "analysis.sector_classification", "msg": "Sector classification" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.duration_days", "msg": "Duration (days)" })}>
															{ctx.t({ "code": "analysis.duration_days", "msg": "Duration (days)" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.duration_hours", "msg": "Duration (hours)" })}>
															{ctx.t({ "code": "analysis.duration_hours", "msg": "Duration (hours)" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.number_of_users_affected", "msg": "Number of users affected" })}>
															{ctx.t({ "code": "analysis.number_of_users_affected", "msg": "Number of users affected" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.number_of_people_affected", "msg": "Number of people affected" })}>
															{ctx.t({ "code": "analysis.number_of_people_affected", "msg": "Number of people affected" })}
														</th>
														<th role="columnheader" aria-label={ctx.t({ "code": "analysis.response_cost", "msg": "Response cost" })}>
															{ctx.t({ "code": "analysis.response_cost", "msg": "Response cost" })}
														</th>
													</tr>
												</thead>
												<tbody>
													{ld.dbDisasterEventDisruptions.map((item, index) => (
														<tr role="row" key={index}>
															<td role="gridcell">{item.recordId.slice(0, 8)}</td>
															<td role="gridcell">
																{item.disruptionId.slice(0, 8)}
															</td>
															<td role="gridcell">{item.sectorName}</td>
															<td role="gridcell">
																{item.disruptionDurationDays}
															</td>
															<td role="gridcell">
																{item.disruptionDurationHours}
															</td>
															<td role="gridcell">
																{item.disruptionUsersAffected}
															</td>
															<td role="gridcell">
																{item.disruptionPeopleAffected}
															</td>
															<td role="gridcell">
																{item.disruptionResponseCurrency}{" "}
																{Number(
																	item.disruptionResponseCost
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</>
								)}
							</div>
						</section>
					</>
				)}
		</>
	);
}
