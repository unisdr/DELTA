import React, { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "react-router";
import { useLoaderData, Outlet } from "react-router";

import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config";

import {
	disasterEventSectorsById,
	disasterEvent_DisasterRecordsCount__ById,
	disasterEventSectorTotal__ById,
} from "~/backend.server/models/analytics/disaster-events";

import {
	disasterEventById,
	DisasterEventViewModel,
} from "~/backend.server/models/event";

import { sectorChildrenById } from "~/backend.server/models/sector";

import { getDivisionByLevel, getCountDivisionByLevel1 } from "~/backend.server/models/division";
import { dr } from "~/db.server"; // Drizzle ORM instance
import MapChart, { MapChartRef } from "~/components/MapChart";
import { getAffected } from "~/backend.server/models/analytics/affected-people-by-disaster-event-v2";

import CustomPieChart from "~/components/PieChart";
import CustomStackedBarChart from "~/components/StackedBarChart";
import HorizontalBarChart from "~/components/HorizontalBarChart";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";
import { CommonData } from "~/backend.server/handlers/commondata";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/utils/link";
import { urlLang } from "~/utils/url";
import {
	getSectorImpactTotal,
} from "~/backend.server/handlers/analytics/ImpactonSectors";
import {
	getCurrencySymbol
} from "~/utils/currency";
import { Tooltip } from "primereact/tooltip";
import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/utils/htmlmeta";

// Define an interface for the structure of the JSON objects
interface interfaceMap {
	total: number;
	name: string;
	description: string;
	colorPercentage: number;
	geojson: any;
}

interface interfacePieChart {
	name: string;
	value: number;
}

interface interfaceBarChart {
	name: string;
	damage: number;
	losses: number;
}

interface interfaceSector {
	id: string;
	name: string;
	level?: number;
	ids?: [];
	subSector?: interfaceSector[];
}

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		const request = loaderArgs.request;

		const ctx = new BackendContext(loaderArgs);

		// Parse the request URL
		const parsedUrl = new URL(request.url);

		// Extract query string parameters
		const queryParams = parsedUrl.searchParams;
		const qsDisEventId = queryParams.get("disasterEventId") || "";
		let record: any = undefined;
		let recordsRelatedSectors: any = undefined;
		let countRelatedDisasterRecords: any = undefined;
		let totalSectorEffects: any = undefined;
		let cpDisplayName: string = "";
		let sectorDamagePieChartData: interfacePieChart[] = [];
		let sectorLossesPieChartData: interfacePieChart[] = [];
		let sectorRecoveryPieChartData: interfacePieChart[] = [];
		let datamageGeoData: interfaceMap[] = [];
		let lossesGeoData: interfaceMap[] = [];
		let humanEffectsGeoData: interfaceMap[] = [];
		// let totalAffectedPeople:any = {};
		let totalAffectedPeople2: any = {};
		const sectortData: Record<
			string,
			{ id: string; name: string; subSector?: interfaceSector[] }
		> = {};

		const sectorPieChartData: Record<
			number,
			{
				damages: interfacePieChart;
				losses: interfacePieChart;
				recovery: interfacePieChart;
			}
		> = {};
		let sectorBarChartData: Record<number, interfaceBarChart> = {};

		// Initialize arrays to store filtered values
		let sectorParentArray: interfaceSector[] = [];
		let x: any = {};

		const settings = await getCountrySettingsFromSession(request);
		let currency = "USD";
		if (settings) {
			currency = settings.currencyCode;
		}

		// Use the shared public tenant context for analytics
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		const countDivisionByLevel1 = await getCountDivisionByLevel1(countryAccountsId);
		const geoLevelSelectorOverride = countDivisionByLevel1 === 1 ? 2 : 1; // Adjust geographic level to level 2 if only one value exists in level 1 division

		if (qsDisEventId) {
			// Pass public tenant context for analytics access
			record = await disasterEventById(ctx, qsDisEventId).catch(console.error);
			if (record) {
				try {
					if (record.countryAccountsId !== countryAccountsId) {
						throw new Response("Unauthorized access", { status: 401 });
					}
					cpDisplayName = await contentPickerConfig(ctx).selectedDisplay(
						ctx,
						dr,
						qsDisEventId
					);

					// get all related sectors
					recordsRelatedSectors = await disasterEventSectorsById(
						ctx,
						qsDisEventId,
						true
					);
					for (const item of recordsRelatedSectors) {

						if (item.relatedAncestorsDescendants) {
							// Filter for level 2 and save to filteredAncestors
							const filteredAncestors = (
								item.relatedAncestorsDescendants as interfaceSector[]
							).filter((ancestor) => ancestor.level === 2);
							x = filteredAncestors[0];

							x.myChildren = [];
							// console.log(x.myChildren);

							const ancestorIds = (
								item.relatedAncestorsDescendants as interfaceSector[]
							).map((ancestor) => ancestor.id);

							x.myChildren = ancestorIds;
							x.effects = {};
							x.effects = await disasterEventSectorTotal__ById(
								qsDisEventId,
								ancestorIds,
								currency
							);

							// Populate sectorData - will be used for the sector filter
							if (!sectortData[x.id]) {
								sectortData[x.id] = {
									id: x.id,
									name: x.sectorname,
									subSector: (await sectorChildrenById(
										ctx,
										x.id
									)) as interfaceSector[],
								};
							}

							// Populate Sector Pie Chart Data
							if (!sectorPieChartData[x.id]) {
								sectorPieChartData[x.id] = {
									damages: {
										name: x.sectorname,
										value: x.effects.damages.total,
									},
									losses: { name: x.sectorname, value: x.effects.losses.total },
									recovery: {
										name: x.sectorname,
										value: x.effects.recovery.total,
									},
								};
							} else {
								sectorPieChartData[x.id].damages.value +=
									x.effects.damages.total;
								sectorPieChartData[x.id].losses.value += x.effects.losses.total;
								sectorPieChartData[x.id].recovery.value +=
									x.effects.recovery.total;
							}

							// Populate Sector Bar Chart Data
							if (!sectorBarChartData[x.id]) {
								sectorBarChartData[x.id] = {
									name: x.sectorname,
									damage: x.effects.damages.total,
									losses: x.effects.losses.total,
								};
							} else {
								sectorBarChartData[x.id].damage += x.effects.damages.total;
								sectorBarChartData[x.id].losses += x.effects.losses.total;
							}
						}
					}

					// Convert object to array and sort sectorname in ascending order
					sectorParentArray = Object.values(sectortData).sort((a, b) => {
						const nameA = a.name ?? "";
						const nameB = b.name ?? "";
						return nameA.localeCompare(nameB);
					});

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

					// Remove the associate ID of the array to align to the format required by the chart.
					sectorBarChartData = Object.values(sectorBarChartData);

					countRelatedDisasterRecords =
						await disasterEvent_DisasterRecordsCount__ById(qsDisEventId);

					const damagesTotal = await getSectorImpactTotal({
						impact: 'damages',
						countryAccountsId: countryAccountsId,
						type: {
							disasterEventId: qsDisEventId,
						},
					});
					const lossesTotal = await getSectorImpactTotal({
						impact: 'losses',
						countryAccountsId: countryAccountsId,
						type: {
							disasterEventId: qsDisEventId,
						},
					});

					totalSectorEffects = {
						damages: {
							total: damagesTotal?.damagesTotal || 0,
							currency: currency,
						},
						losses: {
							total: lossesTotal?.lossesTotal || 0,
							currency: currency,
						},
						recovery: {
							total: damagesTotal?.recoveryTotal || 0,
							currency: currency,
						}
					};

					// system is now using version 2
					totalAffectedPeople2 = await getAffected(dr, qsDisEventId);

					const divisionLevel1 = await getDivisionByLevel(
						geoLevelSelectorOverride,
						settings.countryAccountsId
					);
					for (const item of divisionLevel1) {
						const lossesMapTotal = await getSectorImpactTotal({
							impact: 'losses',
							countryAccountsId: countryAccountsId,
							type: {
								disasterEventId: qsDisEventId,
							},
							divisionId: item.id,
						});
						const damagesMapTotal = await getSectorImpactTotal({
							impact: 'damages',
							countryAccountsId: countryAccountsId,
							type: {
								disasterEventId: qsDisEventId,
							},
							divisionId: item.id,
						});
						const humanEffectsPerDivision = await getAffected(
							dr,
							qsDisEventId,
							{ divisionId: item.id }
						);

						// Populate the geoData for the map for the human effects
						humanEffectsGeoData.push({
							total: humanEffectsPerDivision.noDisaggregations.totalPeopleAffected,
							name: String(item.name["en"]),
							description:
								ctx.t({
									"code": "analysis.total_people_affected",
									"msg": "Total people affected"
								}) + ": " +
								humanEffectsPerDivision.noDisaggregations.totalPeopleAffected.toLocaleString(
									navigator.language,
									{ minimumFractionDigits: 0 }
								),
							colorPercentage: 1,
							geojson: item.geojson,
						});

						// Populate the geoData for the map for losses
						lossesGeoData.push({
							total: lossesMapTotal?.lossesTotal || 0,
							name: String(item.name["en"]),
							description:
								ctx.t({
									"code": "analysis.total_losses",
									"msg": "Total losses"
								}) + ": " + currency + " " +
								lossesMapTotal?.lossesTotal?.toLocaleString(
									navigator.language,
									{ minimumFractionDigits: 0 }
								),
							colorPercentage: 1,
							geojson: item.geojson,
						});

						// Populate the geoData for the map for damages
						datamageGeoData.push({
							total: damagesMapTotal?.damagesTotal || 0,
							name: String(item.name["en"]),
							description:
								ctx.t({
									"code": "analysis.total_damage",
									"msg": "Total damage"
								}) + ": " + currency + " " +
								damagesMapTotal?.damagesTotal?.toLocaleString(
									navigator.language,
									{ minimumFractionDigits: 0 }
								),
							colorPercentage: 1,
							geojson: item.geojson,
						});
					}
				} catch (e) {
					console.log(e);
					throw e;
				}
			} else {
				return Response.json({

				}, { status: 404 });
			}
		}

		return {

			qsDisEventId: qsDisEventId,
			record: record,
			recordsRelatedSectors: recordsRelatedSectors,
			countRelatedDisasterRecords: countRelatedDisasterRecords,
			total: totalSectorEffects,
			cpDisplayName: cpDisplayName,
			datamageGeoData: datamageGeoData,
			lossesGeoData: lossesGeoData,
			humanEffectsGeoData: humanEffectsGeoData,
			totalAffectedPeople2: totalAffectedPeople2,
			sectorDamagePieChartData: sectorDamagePieChartData,
			sectorLossesPieChartData: sectorLossesPieChartData,
			sectorRecoveryPieChartData: sectorRecoveryPieChartData,
			sectorBarChartData: sectorBarChartData,
			sectorParentArray: sectorParentArray,
			currency,
		};
	}
);

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.disaster_events_analysis",
				"msg": "Disaster events analysis"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.disaster_events_analysis",
				"msg": "Disaster events analysis"
			}),
		}
	];
};


// React component for Disaster events analysis page
function DisasterEventsAnalysisContent() {
	const btnCancelRef = useRef<HTMLButtonElement>(null);
	const btnSubmitRef = useRef<HTMLButtonElement>(null);
	const mapChartRef = useRef<MapChartRef>(null); //  Reference to MapChart
	const [selectedSector, setSelectedSector] = useState("");
	const [selectedSubSector, setSelectedSubSector] = useState("");
	const [subSectors, setSubSectors] = useState<
		{ id: string; name: string }[]
	>([]);

	const ld = useLoaderData<{
		qsDisEventId: string;
		record: DisasterEventViewModel | null;
		recordsRelatedSectors: any;
		countRelatedDisasterRecords: number | null;
		total: any | null;
		cpDisplayName: string;
		datamageGeoData: any;
		lossesGeoData: any;
		humanEffectsGeoData: any;
		totalAffectedPeople2: any;
		sectorDamagePieChartData: interfacePieChart[];
		sectorLossesPieChartData: interfacePieChart[];
		sectorRecoveryPieChartData: interfacePieChart[];
		sectorBarChartData: interfaceBarChart[];
		sectorParentArray: interfaceSector[];
		currency: string;
	} & CommonData>();

	const ctx = new ViewContext();


	let disaggregationsAge2:
		| {
			children: number | undefined;
			adult: number | undefined;
			senior: number | undefined;
		}
		| undefined = undefined;

	let [activeData, setActiveData] = useState(ld.datamageGeoData); //  Default MapChart geoData

	// Define the handleClearFilters function
	const handleClearFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault(); // Prevent the default form submission
		window.location.href = urlLang(ctx.lang, "/analytics/disaster-events");
	};

	const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const sectorId = event.target.value;
		setSelectedSector(sectorId);

		// Filter sub-sectors based on selected sector ID
		const filteredSubSectors = ld.sectorParentArray.filter(
			(item) => item.id === sectorId
		);
		const element = document.getElementById("sector-apply-filter");

		if (filteredSubSectors.length === 0) {
			setSubSectors([]);
			setSelectedSubSector("");

			if (element) {
				element.style.pointerEvents = "none"; // Enables interaction
				element.style.opacity = "0.5"; // Set opacity to 50%
			}
		} else {
			setSubSectors(filteredSubSectors[0].subSector || []);
			setSelectedSubSector("");

			if (element) {
				element.style.pointerEvents = "auto"; // Enables interaction
				element.style.opacity = "1"; // Set opacity to normal
			}
		}
	};

	const handleSubSectorChange = (
		event: React.ChangeEvent<HTMLSelectElement>
	) => {
		const subSectorId = event.target.value;
		setSelectedSubSector(subSectorId);
	};

	const handleSwitchMapData = (
		e: React.MouseEvent<HTMLButtonElement>,
		data: any,
		legendMaxColor: string
	) => {
		if (!e || !e.currentTarget) {
			console.error("Event is undefined or does not have a target.");
			return;
		}

		e.preventDefault();

		document.getElementById("tab01")?.setAttribute("aria-selected", "false");
		document.getElementById("tab02")?.setAttribute("aria-selected", "false");
		document.getElementById("tab03")?.setAttribute("aria-selected", "false");

		const buttonText = e.currentTarget.textContent?.trim() || "Legend";

		e.currentTarget.ariaSelected = "true";

		setActiveData(data);
		mapChartRef.current?.setDataSource(data);
		mapChartRef.current?.setLegendTitle(buttonText);
		mapChartRef.current?.setLegendMaxColor(legendMaxColor);
	};

	useEffect(() => {
		if (ld.record) {
			if (btnCancelRef.current) {
				btnCancelRef.current.disabled = false;
			}
		} else {
			if (btnSubmitRef.current) {
				btnSubmitRef.current.disabled = false;
			}
			if (btnCancelRef.current) {
				btnCancelRef.current.disabled = true;
			}
		}
		mapChartRef.current?.setLegendTitle(
			ctx.t({
				"code": "analysis.total_damages_legend",
				"desc": "Legend title showing total damages; placeholder {currency} is the currency code",
				"msg": "Total damages in {currency}"
			},
				{ currency: ld.currency }
			)
		);
	}, []);

	// TODO: apply mapping of data, ask to revise key
	if (ld.record && ld.totalAffectedPeople2.disaggregations.age) {
		const ageData = ld.totalAffectedPeople2.disaggregations.age;
		disaggregationsAge2 = {
			children: ageData["0-14"],
			adult: ageData["15-64"],
			senior: ageData["65+"],
		};
	}

	return (
		<MainContainer
			title={ctx.t({ "code": "analysis.disaster_events_analysis", "msg": "Disaster events analysis" })}
			headerExtra={<NavSettings ctx={ctx} />}
		>
			<Tooltip target=".custom-target-icon" pt={{
				root: { style: { marginTop: '-10px' } }
			}} />
			<div style={{ maxWidth: "100%", overflow: "hidden" }}>
				<div className="disaster-events-page">
					<section>
						<div className="mg-container">
							<form className="dts-form" method="get">
								<div className="dts-form__body">
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<label>
												<div className="dts-form-component__label">
													<span>{ctx.t({ "code": "analysis.disaster_event", "msg": "Disaster event" })}</span>
												</div>
												<ContentPicker ctx={ctx}
													{...contentPickerConfig(ctx)}
													value={ld.record ? ld.record.id : ""}
													displayName={ld.cpDisplayName}
													onSelect={() => {
														if (btnCancelRef.current) {
															btnCancelRef.current.disabled = false;
														}
														if (btnSubmitRef.current) {
															btnSubmitRef.current.disabled = false;
														}
													}}
													disabledOnEdit={ld.record ? true : false}
												/>
											</label>
										</div>
									</div>
									<div className="dts-form__actions">
										<button
											ref={btnSubmitRef}
											type="submit"
											className="mg-button mg-button--small mg-button-primary"
											disabled
										>
											{ctx.t({ "code": "analysis.apply_filters", "msg": "Apply filters" })}
										</button>
										<button
											ref={btnCancelRef}
											onClick={handleClearFilters}
											type="button"
											className="mg-button mg-button--small mg-button-outline"
										>
											{ctx.t({ "code": "analysis.clear", "msg": "Clear" })}
										</button>
									</div>
								</div>
							</form>
						</div>
					</section>

					{/* Conditional rendering: Display this message until filters are applied */}
					{!ld.record && (
						<div
							style={{
								marginTop: "1.43rem",
								textAlign: "justify",
								padding: "1.43rem",
								borderRadius: "8px",
								backgroundColor: "#f9f9f9",
								color: "#333",
								fontSize: "1.14rem",
								lineHeight: "1.29rem",
							}}
						>
							<h3
								style={{
									color: "#004f91",
									fontSize: "1.43rem",
									marginBottom: "0.71rem",
									textAlign: "center",
								}}
							>
								{ctx.t({
									"code": "analysis.welcome_disaster_events_dashboard",
									"msg": "Welcome to the disaster events dashboard! 🌟"
								})}
							</h3>
							<p style={{ textAlign: "center" }}>
								{ctx.t({
									"code": "analysis.select_and_apply_filters_above",
									"msg": "Please select and apply filters above to view the analysis."
								})}
							</p>
						</div>
					)}
				</div>

				{ld.record && (
					<>
						<section className="dts-page-section">
							<div className="mg-container">
								<h2 className="dts-heading-2">{ld.cpDisplayName}</h2>
								<p>
									<strong>{ctx.t({ "code": "analysis.affiliated_records", "msg": "Affiliated record(s)" })}</strong>:
									&nbsp;
									{ld.countRelatedDisasterRecords}{" "}
									{ld.countRelatedDisasterRecords &&
										ld.countRelatedDisasterRecords > 0 && (
											<LangLink lang={ctx.lang} to={`/disaster-record?disasterEventUUID=${ld.qsDisEventId}`}>
												{ctx.t({ "code": "analysis.view_records", "msg": "View records" })}
											</LangLink>
										)}
								</p>

								{Array.isArray(ld.recordsRelatedSectors) &&
									ld.recordsRelatedSectors.length > 0 && (
										<>
											<p>
												{Array.isArray(ld.recordsRelatedSectors) &&
													ld.recordsRelatedSectors.map((sector, index) => (
														<span key={index}>
															{sector.sectorname}
															{ld.recordsRelatedSectors.length == index + 1
																? " "
																: ", "}
														</span>
													))}
											</p>
										</>
									)}

								{ld.record && (ld.record.startDate || ld.record.endDate) && (
									<>
										<p>
											{ctx.t({
												"code": "analysis.date_range",
												"msg": "Date: {startDate} to {endDate}"
											},
												{ startDate: ld.record.startDate, endDate: ld.record.endDate }
											)}
										</p>
									</>
								)}

								{ld.record && ld.record.dataSource && (
									<>
										<p>
											{ctx.t({ "code": "record.data_source", "msg": "Data source" })}: {ld.record.dataSource}
										</p>
									</>
								)}

								<div className="mg-grid mg-grid__col-3">
									{Number(ld.total.damages.total) > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span id="elementId03">
													{ctx.t({
														"code": "analysis.damage_in_currency",
														"msg": "Damage in {currency}"
													},
														{ currency: ld.total.damages.currency }
													)}
												</span>
											</h3>
											<div className="dts-indicator dts-indicator--target-box-b">
												<span>
													{
														getCurrencySymbol(ld.total.damages.currency)
													}
													{ld.total.damages.total.toLocaleString(
														navigator.language,
														{ minimumFractionDigits: 0 }
													)}
												</span>
											</div>
										</div>
									)}

									{Number(ld.total.losses.total) > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span id="elementId04">
													{ctx.t(
														{
															"code": "analysis.losses_in_currency",
															"msg": "Losses in {currency}"
														},
														{ currency: ld.total.losses.currency }
													)}
												</span>
											</h3>
											<div className="dts-indicator dts-indicator--target-box-c">
												<span>
													{
														getCurrencySymbol(ld.total.losses.currency)
													}
													{ld.total.losses.total.toLocaleString(
														navigator.language,
														{ minimumFractionDigits: 0 }
													)}
												</span>
											</div>
										</div>
									)}

									{Number(ld.total.recovery.total) > 0 && (
										<>
											<div className="dts-data-box">
												<h3 className="dts-body-label">
													<span id="elementId05">
														{ctx.t(
															{
																"code": "analysis.recovery_in_currency",
																"msg": "Recovery in {currency}"
															},
															{ currency: ld.total.recovery.currency }
														)}
													</span>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-d">
													<span>
														{
															getCurrencySymbol(ld.total.recovery.currency)
														}
														{ld.total.recovery.total.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
													</span>
												</div>
											</div>
										</>
									)}
								</div>
							</div>
						</section>

						{
							((Number(ld.totalAffectedPeople2.noDisaggregations.totalPeopleAffected) > 0) ||
								(Number(ld.totalAffectedPeople2.noDisaggregations.tables.deaths) > 0))
							&& (
								<>
									<section className="dts-page-section">
										<div className="mg-container">
											<h2 className="dts-heading-2">{ctx.t({ "code": "analysis.human_effects", "msg": "Human effects" })}</h2>

											<div className="mg-grid mg-grid__col-3">
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>{ctx.t({ "code": "analysis.total_people_affected", "msg": "Total people affected" })}</span>
														<div className="dts-tooltip__button">
															<svg
																className="custom-target-icon"
																aria-hidden="true"
																focusable="false"
																role="img"
																data-pr-tooltip={ctx.t({
																	"code": "analysis.human_effects.total_people_affected_tooltip",
																	"msg": "Total people affected is the sum of injured, missing, directly affected people and displaced"
																})}
																data-pr-position="top"
															>
																<use href="/assets/icons/information_outline.svg#information" />
															</svg>
														</div>
													</h3>
													<div className="dts-indicator dts-indicator--target-box-f">
														<span>
															{
																ld.totalAffectedPeople2.noDisaggregations.totalPeopleAffected.toLocaleString(navigator.language, {
																	minimumFractionDigits: 0,
																})}
														</span>
													</div>
												</div>
											</div>
										</div>
									</section>

									<section className="dts-page-section">
										<div className="mg-container">
											<div className="mg-grid mg-grid__col-3">
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>{ctx.t({ "code": "analysis.death", "msg": "Death" })}</span>
														<div
															className="dts-tooltip__button"
														>
															<svg
																className="custom-target-icon"
																aria-hidden="true"
																focusable="false"
																role="img"
																data-pr-tooltip={ctx.t({
																	"code": "analysis.human_effects.death_tooltip",
																	"msg": "Death is the number of people who died as a result of the disaster event."
																})}
																data-pr-position="top"
															>
																<use href="/assets/icons/information_outline.svg#information"></use>
															</svg>
														</div>
													</h3>
													<div className="dts-indicator dts-indicator--target-box-g">
														<span>
															{ld.totalAffectedPeople2.noDisaggregations.tables.deaths.toLocaleString(
																navigator.language,
																{ minimumFractionDigits: 0 }
															)}
														</span>
													</div>
												</div>
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>{ctx.t({ "code": "analysis.injured", "msg": "Injured" })}</span>
														<div
															className="dts-tooltip__button"
														>
															<svg
																className="custom-target-icon"
																aria-hidden="true"
																focusable="false"
																role="img"
																data-pr-tooltip={ctx.t({
																	"code": "analysis.human_effects.injured_tooltip",
																	"msg": "Injured is the number of people who were injured as a result of the disaster event."
																})}
																data-pr-position="top"
															>
																<use href="/assets/icons/information_outline.svg#information"></use>
															</svg>
														</div>
													</h3>
													<div className="dts-indicator dts-indicator--target-box-g">
														<span>
															{ld.totalAffectedPeople2.noDisaggregations.tables.injured.toLocaleString(
																navigator.language,
																{ minimumFractionDigits: 0 }
															)}
														</span>
													</div>
												</div>
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>{ctx.t({ "code": "analysis.missing", "msg": "Missing" })}</span>
														<div className="dts-tooltip__button">
															<svg
																className="custom-target-icon"
																aria-hidden="true"
																focusable="false"
																role="img"
																data-pr-tooltip={ctx.t({
																	"code": "analysis.human_effects.missing_tooltip",
																	"msg": "Missing is the number of people who were missing as a result of the disaster event."
																})}
																data-pr-position="top"
															>
																<use href="/assets/icons/information_outline.svg#information"></use>
															</svg>
														</div>
													</h3>
													<div className="dts-indicator dts-indicator--target-box-g">
														<span>
															{ld.totalAffectedPeople2.noDisaggregations.tables.missing.toLocaleString(
																navigator.language,
																{ minimumFractionDigits: 0 }
															)}
														</span>
													</div>
												</div>
											</div>
										</div>
									</section>

									<section className="dts-page-section">
										<div className="mg-container">
											<div className="mg-grid mg-grid__col-3">
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>{ctx.t({ "code": "analysis.people_directly_affected_old_desinventar", "msg": "People directly affected (old DesInventar)" })}</span>
														<div
															className="dts-tooltip__button"
														>
															<svg
																className="custom-target-icon"
																aria-hidden="true"
																focusable="false"
																role="img"
																data-pr-tooltip={ctx.t({
																	"code": "analysis.human_effects.people_directly_affected_tooltip",
																	"msg": "People directly affected (old DesInventar) is the number of people who were directly affected by the disaster event."
																})}
																data-pr-position="top"

															>
																<use href="/assets/icons/information_outline.svg#information"></use>
															</svg>
														</div>
													</h3>
													<div className="dts-indicator dts-indicator--target-box-g">
														<span>
															{ld.totalAffectedPeople2.noDisaggregations.tables.directlyAffected.toLocaleString(
																navigator.language,
																{ minimumFractionDigits: 0 }
															)}
														</span>
													</div>
												</div>
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>{ctx.t({ "code": "analysis.displaced", "msg": "Displaced" })}</span>
														<div
															className="dts-tooltip__button"

														>
															<svg
																className="custom-target-icon"
																aria-hidden="true"
																focusable="false"
																role="img"
																data-pr-tooltip={ctx.t({
																	"code": "analysis.human_effects.displaced_tooltip",
																	"msg": "Displaced is the number of people who were displaced as a result of the disaster event."
																})}
																data-pr-position="top"

															>
																<use href="/assets/icons/information_outline.svg#information"></use>
															</svg>
														</div>
													</h3>
													<div className="dts-indicator dts-indicator--target-box-g">
														<span>
															{ld.totalAffectedPeople2.noDisaggregations.tables.displaced.toLocaleString(
																navigator.language,
																{ minimumFractionDigits: 0 }
															)}
														</span>
													</div>
												</div>
											</div>
										</div>
									</section>

									<section className="dts-page-section">
										<div className="mg-container">
											<div className="mg-grid mg-grid__col-3">
												{ld.totalAffectedPeople2.disaggregations.sex &&
													(ld.totalAffectedPeople2.disaggregations.sex.m ||
														ld.totalAffectedPeople2.disaggregations.sex.f ||
														ld.totalAffectedPeople2.disaggregations.sex.o) && (
														<div className="dts-data-box">
															<h3 className="dts-body-label">
																<span>{ctx.t({ "code": "analysis.men_and_women_affected", "msg": "Men and women affected" })}</span>

																<div
																	className="dts-tooltip__button"
																>
																	<svg
																		className="custom-target-icon"
																		aria-hidden="true"
																		focusable="false"
																		role="img"
																		data-pr-tooltip={ctx.t({
																			"code": "analysis.human_effects.men_and_women_affected_tooltip",
																			"msg": "Men and women affected is the number of men and women who were affected by the disaster event."
																		})}
																		data-pr-position="top"

																	>
																		<use href="/assets/icons/information_outline.svg#information"></use>
																	</svg>
																</div>
															</h3>
															<div style={{ height: "300px" }}>
																{(() => {
																	const obj: Record<string, string | number> = {};
																	obj[ctx.t({ "code": "human_effects.men", "msg": "Men" })] = ld.totalAffectedPeople2.disaggregations.sex.m;
																	obj[ctx.t({ "code": "human_effects.women", "msg": "Women" })] = ld.totalAffectedPeople2.disaggregations.sex.f;
																	obj[ctx.t({ "code": "human_effects.other_non_binary", "msg": "Other non-binary" })] = ld.totalAffectedPeople2.disaggregations.sex.o;
																	const data = [obj];
																	return (
																		<HorizontalBarChart
																			data={data}
																			colorScheme="violet"
																			imgSrc="/assets/icons/Male&Female.svg"
																		/>
																	);
																})()}
															</div>
														</div>
													)}

												{((ld.totalAffectedPeople2.disaggregations.disability &&
													ld.totalAffectedPeople2.disaggregations.disability
														.disability) ||
													(ld.totalAffectedPeople2.disaggregations
														.globalPovertyLine &&
														ld.totalAffectedPeople2.disaggregations
															.globalPovertyLine.below) ||
													(ld.totalAffectedPeople2.disaggregations
														.nationalPovertyLine &&
														ld.totalAffectedPeople2.disaggregations
															.nationalPovertyLine.below)) && (
														<div className="dts-data-box">
															<h3 className="dts-body-label">
																<span>{ctx.t({ "code": "analysis.persons_with_disabilities_and_living_in_poverty_affected", "msg": "Persons with disabilities and living in poverty affected" })}</span>
																<div
																	className="dts-tooltip__button"
																>
																	<svg
																		className="custom-target-icon"

																		aria-hidden="true"
																		focusable="false"
																		role="img"
																		data-pr-tooltip={ctx.t({
																			"code": "analysis.human_effects.persons_with_disabilities_and_living_in_poverty_affected_tooltip",
																			"msg": "Persons with disabilities and living in poverty affected is the number of persons with disabilities and living in poverty who were affected by the disaster event."
																		})}
																		data-pr-position="top"

																	>
																		<use href="/assets/icons/information_outline.svg#information"></use>
																	</svg>
																</div>
															</h3>
															<div style={{ height: "350px" }}>
																<HorizontalBarChart
																	data={[
																		{
																			name: "",
																			"Persons with disabilities":
																				ld.totalAffectedPeople2.disaggregations
																					.disability.disability,
																			"Persons living in poverty (national)":
																				ld.totalAffectedPeople2.disaggregations
																					.nationalPovertyLine.below,
																			"Persons living in poverty (international)":
																				ld.totalAffectedPeople2.disaggregations
																					.globalPovertyLine.below,
																		},
																	]}
																	colorScheme="cerulean"
																	imgSrc="/assets/icons/People-with-physical-impairments.svg"
																/>
															</div>
														</div>
													)}

												{ld.totalAffectedPeople2.disaggregations.age &&
													disaggregationsAge2 &&
													disaggregationsAge2.children && (
														<div className="dts-data-box">
															<h3 className="dts-body-label">
																<span>
																	{ctx.t({ "code": "analysis.children_adults_and_seniors_affected", "msg": "Children, adults, and seniors affected" })}
																</span>
																<div
																	className="dts-tooltip__button"
																>
																	<svg
																		className="custom-target-icon"
																		aria-hidden="true"
																		focusable="false"
																		role="img"
																		data-pr-tooltip={ctx.t({
																			"code": "analysis.human_effects.children_adults_and_seniors_affected_tooltip",
																			"msg": "Children, adults, and seniors affected is the number of children, adults, and seniors who were affected by the disaster event."
																		})}
																		data-pr-position="top"

																	>
																		<use href="/assets/icons/information_outline.svg#information"></use>
																	</svg>
																</div>
															</h3>
															<div style={{ height: "300px" }}>
																<HorizontalBarChart
																	data={[
																		{
																			name: "",
																			Children: Number(
																				disaggregationsAge2?.children
																			),
																			Adults: Number(disaggregationsAge2?.adult),
																			Seniors: Number(
																				disaggregationsAge2?.senior
																			),
																		},
																	]}
																	colorScheme="violet"
																	imgSrc="/assets/icons/Male&Female.svg"
																/>
															</div>
														</div>
													)}
											</div>
										</div>
									</section>
								</>
							)}

						{(Number(ld.total.damages.total) > 0 ||
							Number(ld.total.losses.total) > 0 ||
							Number(ld.total.recovery.total) > 0) && (
								<>
									<section className="dts-page-section">
										<div className="mg-container">
											<h2 className="dts-heading-2">{ctx.t({ "code": "analysis.affected_areas_zones", "msg": "Affected areas/zones" })}</h2>
											<ul
												className="dts-tablist"
												role="tablist"
												aria-labelledby="tablist01"
											>
												<li role="presentation">
													<button
														onClick={(e) =>
															handleSwitchMapData(
																e,
																ld.datamageGeoData,
																"#208f04"
															)
														}
														type="button"
														className="dts-tablist__button"
														role="tab"
														id="tab01"
														aria-selected="true"
														aria-controls="tabpanel01"
													>
														<span>{ctx.t(
															{
																"code": "analysis.total_damage_in_currency",
																"msg": "Total damage in {currency}"
															},
															{ "currency": ld.currency }
														)}</span>
													</button>
												</li>
												<li role="presentation">
													<button
														onClick={(e) =>
															handleSwitchMapData(
																e,
																ld.humanEffectsGeoData,
																"#ff1010"
															)
														}
														type="button"
														className="dts-tablist__button"
														role="tab"
														id="tab02"
														aria-controls="tabpanel02"
														aria-selected="false"
													>
														{ctx.t({ "code": "analysis.total_affected", "msg": "Total affected" })}
													</button>
												</li>
												<li role="presentation">
													<button
														onClick={(e) =>
															handleSwitchMapData(e, ld.lossesGeoData, "#58508d")
														}
														type="button"
														className="dts-tablist__button"
														role="tab"
														id="tab03"
														aria-controls="tabpanel03"
														aria-selected="false"
													>
														<span>{ctx.t(
															{
																"code": "analysis.total_losses_in_currency",
																"msg": "Total losses in {currency}"
															},
															{ "currency": ld.currency }
														)}</span>
													</button>
												</li>
											</ul>
											<div
												className="dts-tablist__panel"
												id="tabpanel01"
												role="tabpanel"
												aria-labelledby="tab01"
											>
												<div>
													<MapChart
														ctx={ctx}
														ref={mapChartRef}
														id="map_viewer"
														dataSource={activeData}
														legendTitle={ctx.t({ "code": "analysis.total_damage", "msg": "Total damage" })}
														legendMaxColor="#208f04"
													/>
												</div>
											</div>
										</div>
									</section>
								</>
							)}

						<section className="dts-page-section">
							<div className="mg-container">
								<h2 className="dts-heading-2">
									{ctx.t(
										{
											"code": "analysis.disaster_event_impacts_on_sectors",
											"msg": "{disaster_event} impacts on sectors"
										},
										{ disaster_event: ld.cpDisplayName }
									)}
								</h2>

								<div className="mg-grid mg-grid__col-3">
									{Object.keys(ld.sectorDamagePieChartData).length > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												{ctx.t({ "code": "analysis.damage", "msg": "Damage" })}
											</h3>
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomPieChart
													ctx={ctx}
													data={ld.sectorDamagePieChartData}
													boolRenderLabel={false}
													currency={ld.currency}
												/>
											</div>
										</div>
									)}

									{Object.keys(ld.sectorLossesPieChartData).length > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												{ctx.t({ "code": "analysis.losses", "msg": "Losses" })}
											</h3>
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomPieChart
													ctx={ctx}
													data={ld.sectorLossesPieChartData}
													boolRenderLabel={false}
													currency={ld.currency}
												/>
											</div>
										</div>
									)}

									{Object.keys(ld.sectorRecoveryPieChartData).length > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												{ctx.t({ "code": "analysis.recovery_need", "msg": "Recovery need" })}
											</h3>
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomPieChart
													ctx={ctx}
													data={ld.sectorRecoveryPieChartData}
													boolRenderLabel={false}
													currency={ld.currency}
												/>
											</div>
										</div>
									)}
								</div>

								<div>&nbsp;</div>

								{Object.keys(ld.sectorBarChartData).length > 0 && (
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-data-box">
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomStackedBarChart ctx={ctx} data={ld.sectorBarChartData} />
											</div>
										</div>
									</div>
								)}
							</div>
						</section>

						{ld.sectorParentArray.length > 0 && (
							<>
								<section className="dts-page-section">
									<div className="mg-container">
										<h2 className="dts-heading-2">{ctx.t({ "code": "analysis.details_of_effects", "msg": "Details of effects" })}</h2>
										<form className="dts-form">
											<div className="dts-form__body">
												<div className="mg-grid mg-grid__col-auto">
													<div className="dts-form-component">
														<label>
															<div className="dts-form-component__label">
																<span>
																	{ctx.t({ "code": "analysis.sector", "msg": "Sector" })} *
																</span>
															</div>
															<select
																id="sector-select"
																className="filter-select"
																name="sector"
																required
																onChange={handleSectorChange}
															>
																<option value="">{ctx.t({ "code": "analysis.select_sector", "msg": "Select sector" })}</option>

																{ld.sectorParentArray.map((item, index) => (
																	<option key={index} value={item.id}>
																		{item.name}
																	</option>
																))}
															</select>
														</label>
													</div>
													<div className="dts-form-component">
														<label>
															<div className="dts-form-component__label">
																{ctx.t({ "code": "analysis.sub_sector", "msg": "Sub sector" })}
															</div>
															<select
																id="sub-sector-select"
																className="filter-select"
																name="sub-sector"
																onChange={handleSubSectorChange}
															>
																<option value="">{ctx.t({ "code": "analysis.select_sector_first", "msg": "Select sector first" })}</option>
																{subSectors.map(
																	(sub: { id: string; name: string }) => (
																		<option key={sub.id} value={sub.id}>
																			{sub.name}
																		</option>
																	)
																)}
															</select>
														</label>
													</div>
												</div>
												<div className="dts-form__actions">
													<LangLink lang={ctx.lang}
														id="sector-apply-filter"
														style={{ pointerEvents: "none", opacity: 0.5 }}
														to={`/analytics/disaster-events/sector/?disasterEventId=${ld.record.id}&sectorid=${selectedSector}&subsectorid=${selectedSubSector}`}
														className="mg-button mg-button--small mg-button-primary"
													>
														{ctx.t({ "code": "analysis.apply_filters", "msg": "Apply filters" })}
													</LangLink>
													<LangLink lang={ctx.lang}
														id="sector-clear-filter"
														to={`/analytics/disaster-events/?disasterEventId=${ld.record.id}`}
														className="mg-button mg-button--small mg-button-outline"
													>
														{ctx.t({ "code": "analysis.clear", "msg": "Clear" })}
													</LangLink>
												</div>
											</div>
										</form>
									</div>
								</section>
							</>
						)}

						<Outlet context={{ name: "joel" }} />
					</>
				)
				}

				<p>&nbsp;</p>
				<p>&nbsp;</p>
				<div className="dts-caption mt-4">
					<span>
						* {ctx.t({ "code": "analysis.data_based_on_published_records", "msg": "Data shown is based on published records" })}
					</span>
				</div>
			</div >
		</MainContainer >
	);
}

// Wrapper component that provides QueryClient
export default function DisasterEventsAnalysis() {
	return <DisasterEventsAnalysisContent />;
}
