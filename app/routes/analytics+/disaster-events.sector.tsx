import { useOutletContext } from "react-router";
import { authLoaderPublicOrWithPerm, authActionWithPerm } from "~/utils/auth";
import { sectorChildrenById, sectorById } from "~/backend.server/models/sector";
import { useLoaderData } from "react-router";

import {
	disasterEventSectorTotal__ById,
	disasterEventSectorDamageDetails__ById,
	disasterEventSectorLossesDetails__ById,
	disasterEventSectorDisruptionDetails__ById,
} from "~/backend.server/models/analytics/disaster-events";

import CustomPieChart from "~/components/PieChart";

import { unitName } from "~/frontend/unit_picker";
import { getCountrySettingsFromSession } from "~/utils/session";




interface interfacePieChart {
	name: string;
	value: number;
}

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {

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

		sectorData = await sectorById(sectorId, true);

		const sectorChildren = (await sectorChildrenById(sectorId)) as {
			name: string;
			id: string;
			relatedDescendants: { id: string; name: string; level: number }[];
		}[];
		let sectorAllChildrenIdsArray: string[] = [];

		for (const item of sectorChildren) {
			const sectorChildrenIdsArray: string[] = item.relatedDescendants.map(
				(item2) => item2.id,
			);

			sectorAllChildrenIdsArray = [
				...sectorAllChildrenIdsArray,
				...sectorChildrenIdsArray,
			];

			let effects = await disasterEventSectorTotal__ById(
				xId,
				sectorChildrenIdsArray,
				confCurrency,
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
			(entry) => entry.damages,
		);
		sectorLossesPieChartData = Object.values(sectorPieChartData).map(
			(entry) => entry.losses,
		);
		sectorRecoveryPieChartData = Object.values(sectorPieChartData).map(
			(entry) => entry.recovery,
		);

		// console.log( 'sectorChildrenIdsArray', sectorAllChildrenIdsArray );

		const dbDisasterEventDamage = await disasterEventSectorDamageDetails__ById(
			disasterEventId,
			sectorAllChildrenIdsArray,
		);
		const dbDisasterEventLosses = await disasterEventSectorLossesDetails__ById(
			disasterEventId,
			sectorAllChildrenIdsArray,
		);
		const dbDisasterEventDisruptions =
			await disasterEventSectorDisruptionDetails__ById(
				disasterEventId,
				sectorAllChildrenIdsArray,
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
	},
);

export const action = authActionWithPerm("ViewData", async () => {
	return {};
});

export default function DetailSectorEffectScreen() {
	const ld = useLoaderData<typeof loader>();


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
								{"No data available for the selected criteria ({sector_name})"}
							</p>
						)}

					<div className="mg-grid mg-grid__col-3">
						{Object.keys(ld.sectorDamagePieChartData).length > 0 && (
							<div className="dts-data-box">
								<h3 className="dts-body-label">
									<span>
										{"Damage in {sector_name} in {currency}"}
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
										{"Losses in {sector} in {currency}"}
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
										{"Recovery in {sector} in {currency}"}
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
									{"Detailed effects in {sector_name}"}
								</h3>

								<p className="dts-body-text mb-6">
									{"View detailed information about damages, losses, and disruptions in the selected sector."}
								</p>
								<h4 className="dts-heading-4">
									{"Damages"}
								</h4>

								{ld.dbDisasterEventDamage.length == 0 && (
									<p>
										{"No damages data available for the selected criteria."}
									</p>
								)}

								{ld.dbDisasterEventDamage.length > 0 && (
									<>
										<div className="table-wrapper">
											<table
												className="dts-table"
												role="grid"
												aria-label={"Damages"}
											>
												<thead>
													<tr>
														<th
															role="columnheader"
															aria-label={"Disaster record ID"}
														>
															{"Disaster record ID"}
														</th>
														<th
															role="columnheader"
															aria-label={"Damage ID"}
														>
															{"Damage ID"}
														</th>

														<th
															role="columnheader"
															aria-label={"Sector classification"}
														>
															{"Sector classification"}
														</th>
														<th
															role="columnheader"
															aria-label={"Asset"}
														>
															{"Asset"}
														</th>
														<th
															role="columnheader"
															aria-label={"Number of assets"}
														>
															{"Number of assets"}
														</th>
														<th
															role="columnheader"
															aria-label={"Repair/Replacement cost"}
														>
															{"Repair/Replacement cost"}
														</th>
														<th
															role="columnheader"
															aria-label={"Recovery cost"}
														>
															{"Recovery cost"}
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
																	item.damageTotalNumberAssetAffected,
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}{" "}
																{item.damageUnit !== "number_count" &&
																	unitName(item.damageUnit || "")}
															</td>
															<td role="gridcell">
																{ld.confCurrencies}{" "}
																{Number(
																	item.damageTotalRepairReplacementCost,
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
															<td role="gridcell">
																{ld.confCurrencies}{" "}
																{Number(
																	item.damageTotalRecoveryCost,
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
								<h4 className="dts-heading-4">
									{"Losses"}
								</h4>

								{ld.dbDisasterEventLosses.length == 0 && (
									<p className="text-gray-500">
										{"No losses data available for the selected criteria."}
									</p>
								)}

								{ld.dbDisasterEventLosses.length > 0 && (
									<>
										<div className="table-wrapper">
											<table
												className="dts-table"
												role="grid"
												aria-label={"Losses"}
											>
												<thead>
													<tr>
														<th
															role="columnheader"
															aria-label={"Disaster record ID"}
														>
															{"Disaster record ID"}
														</th>
														<th
															role="columnheader"
															aria-label={"Losses ID"}
														>
															{"Losses ID"}
														</th>
														<th
															role="columnheader"
															aria-label={"Sector classification"}
														>
															{"Sector classification"}
														</th>
														<th
															role="columnheader"
															aria-label={"Description"}
														>
															{"Description"}
														</th>
														<th
															role="columnheader"
															aria-label={"Public cost"}
														>
															{"Public cost"}
														</th>
														<th
															role="columnheader"
															aria-label={"Private cost"}
														>
															{"Private cost"}
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
																	item.lossesTotalPublicCost,
																).toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
															</td>
															<td role="gridcell">
																{item.lossesTotalPrivateCostCurrency}{" "}
																{Number(
																	item.lossesTotalPrivateCost,
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
								<h4 className="dts-heading-4">
									{"Disruptions"}
								</h4>

								{ld.dbDisasterEventDisruptions.length == 0 && (
									<p className="text-gray-500">
										{"No disruption data available for the selected criteria."}
									</p>
								)}

								{ld.dbDisasterEventDisruptions.length > 0 && (
									<>
										<div className="table-wrapper">
											<table
												className="dts-table"
												role="grid"
												aria-label={"Disruptions"}
											>
												<thead>
													<tr>
														<th
															role="columnheader"
															aria-label={"Disaster record ID"}
														>
															{"Disaster record ID"}
														</th>
														<th
															role="columnheader"
															aria-label={"Disruption ID"}
														>
															{"Disruption ID"}
														</th>
														<th
															role="columnheader"
															aria-label={"Sector classification"}
														>
															{"Sector classification"}
														</th>
														<th
															role="columnheader"
															aria-label={"Duration (days)"}
														>
															{"Duration (days)"}
														</th>
														<th
															role="columnheader"
															aria-label={"Duration (hours)"}
														>
															{"Duration (hours)"}
														</th>
														<th
															role="columnheader"
															aria-label={"Number of users affected"}
														>
															{"Number of users affected"}
														</th>
														<th
															role="columnheader"
															aria-label={"Number of people affected"}
														>
															{"Number of people affected"}
														</th>
														<th
															role="columnheader"
															aria-label={"Response cost"}
														>
															{"Response cost"}
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
																	item.disruptionResponseCost,
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
