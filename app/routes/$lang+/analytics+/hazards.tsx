import { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { useActionData, useLoaderData } from "@remix-run/react";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { fetchHazardTypes } from "~/backend.server/models/analytics/hazard-types";
import { fetchAllSpecificHazards } from "~/backend.server/models/analytics/specific-hazards";
import {
	getAffectedPeopleByHazardFilters,
	getAgeTotalsByHazardFilters,
	getDisabilityTotalByHazardFilters,
	getDisasterEventCount,
	getDisasterEventCountByDivision,
	getDisasterEventCountByYear,
	getDisasterSummary,
	getGenderTotalsByHazardFilters,
	getInternationalPovertyTotalByHazardFilters,
	getNationalPovertyTotalByHazardFilters,
	getTotalAffectedPeopleByDivision,
	getTotalDamagesByDivision,
	getTotalDamagesByYear,
	getTotalDeathsByDivision,
	getTotalLossesByDivision,
	getTotalLossesByYear,
} from "~/backend.server/models/analytics/hazard-analysis";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/routes/$lang+/settings/nav";
import HazardFilters from "~/frontend/analytics/hazards/sections/HazardFilters";
import ImpactByHazard from "~/frontend/analytics/hazards/sections/ImpactByHazard";
import {
	getAllDivisionsByCountryAccountsId,
	getDivisionByLevel,
} from "~/backend.server/models/division";
import { fetchHazardClusters } from "~/backend.server/models/analytics/hazard-clusters";
import HumanAffects from "~/frontend/analytics/hazards/sections/HumanAffects";
import DamagesAndLoses from "~/frontend/analytics/hazards/sections/DamagesAndLoses";
import DisasterEventsList from "~/frontend/analytics/hazards/sections/DisasterEventsList";
import HazardImpactMap from "~/frontend/analytics/hazards/sections/HazardImpactMap";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { formatNumberWithoutDecimals } from "~/util/currency";
import { getSectorImpactTotal } from "~/backend.server/handlers/analytics/ImpactonSectors";
import { gte, lte, SQL } from "drizzle-orm";
import { disasterRecordsTable } from "~/drizzle/schema";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { htmlTitle } from "~/util/htmlmeta";

// Define an interface for the structure of the JSON objects
interface interfaceMap {
	total: number;
	name: string;
	description: string;
	colorPercentage: number;
	geojson: any;
}

/**
 * Loader for hazards analytics page
 *
 * @returns {Promise<Response>} - Response object
 */
export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const ctx = new BackendContext(loaderArgs);
		const settings = await getCountrySettingsFromSession(request);

		const currency = settings.currencyCode;
		const hazardTypes = await fetchHazardTypes(ctx);
		const hazardClusters = await fetchHazardClusters(ctx, null);
		const specificHazards = await fetchAllSpecificHazards(ctx);
		const allDivisions = await getAllDivisionsByCountryAccountsId(settings.countryAccountsId);

		return {
			
			currency,
			hazardTypes,
			hazardClusters,
			specificHazards,
			allDivisions,
		};
	}
);

function getStringValue(value: FormDataEntryValue | null): string | null {
	return typeof value === "string" ? value : null;
}

/**
 * Action handler for hazards analytics page
 */
export const action = async (actionArgs: ActionFunctionArgs) => {
	const { request } = actionArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const formData = await request.formData();
	const hazardTypeId = getStringValue(formData.get("hazardTypeId"));
	const hazardClusterId = getStringValue(formData.get("hazardClusterId"));
	const specificHazardId = getStringValue(formData.get("specificHazardId"));
	const geographicLevelId = getStringValue(formData.get("geographicLevelId"));
	const fromDate = getStringValue(formData.get("fromDate"));
	const toDate = getStringValue(formData.get("toDate"));

	const settings = await getCountrySettingsFromSession(request);
	let currency = "USD";
	if (settings) {
		currency = settings.currencyCode;
	}

	const filters = {
		countryAccountsId,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	};

	const geographicLevel1 = await getDivisionByLevel(1, countryAccountsId);

	const disasterCount = await getDisasterEventCount(filters);
	const yearlyDisasterCounts = await getDisasterEventCountByYear(filters);
	const { totalMen, totalWomen, totalNonBinary } =
		await getGenderTotalsByHazardFilters(filters);
	const {
		totalDeaths,
		totalInjured,
		totalMissing,
		totalDisplaced,
		totalAffectedDirect,
		totalAffectedIndirect,
	} = await getAffectedPeopleByHazardFilters(filters);
	const { totalChildren, totalAdults, totalSeniors } =
		await getAgeTotalsByHazardFilters(filters);
	const totalDisability = await getDisabilityTotalByHazardFilters(filters);
	const totalInternationalPoorPeople =
		await getInternationalPovertyTotalByHazardFilters(filters);
	const totalNationalPoorPeople = await getNationalPovertyTotalByHazardFilters(
		filters
	);
	// const totalDamages = await getTotalDamagesByHazardFilters(filters);
	const extraConditions: SQL[] = [];
	if (filters.fromDate) {
		extraConditions.push(lte(disasterRecordsTable.startDate, filters.fromDate))
	}
	if (filters.toDate) {
		extraConditions.push(gte(disasterRecordsTable.endDate, filters.toDate))
	}

	const totalDamages = await getSectorImpactTotal(
		{
			impact: 'damages',
			countryAccountsId: countryAccountsId,
			...(filters.geographicLevelId && { divisionId: filters.geographicLevelId }),
			type: {
				...(filters.hazardTypeId && { hazardTypeId: filters.hazardTypeId }),
				...(filters.hazardClusterId && { hazardClusterId: filters.hazardClusterId }),
				...(filters.specificHazardId && { hazardId: filters.specificHazardId }),
			}
		},
		extraConditions
	);
	const totalLosses = await getSectorImpactTotal(
		{
			impact: 'losses',
			countryAccountsId: countryAccountsId,
			...(filters.geographicLevelId && { divisionId: filters.geographicLevelId }),
			type: {
				...(filters.hazardTypeId && { hazardTypeId: filters.hazardTypeId }),
				...(filters.hazardClusterId && { hazardClusterId: filters.hazardClusterId }),
				...(filters.specificHazardId && { hazardId: filters.specificHazardId }),
			}
		},
		extraConditions
	);

	// const totalLosses = await getTotalLossesByHazardFilters(filters);
	const totalDamagesByYear = await getTotalDamagesByYear(filters);
	const totalLossesByYear = await getTotalLossesByYear(filters);
	const damagesByDivision = await getTotalDamagesByDivision(filters);
	const lossesByDivision = await getTotalLossesByDivision(filters);
	const deathsByDivision = await getTotalDeathsByDivision(filters);
	const affectedPeopleByDivision = await getTotalAffectedPeopleByDivision(
		filters
	);
	const disasterEventCountByDivision = await getDisasterEventCountByDivision(
		filters
	);

	// Build damagesGeoData
	const maxDamages = Math.max(
		...damagesByDivision.map((d) => d.totalDamages),
		1
	);
	const damagesGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionDamage = damagesByDivision.find(
			(d) => d.divisionId === division.id.toString()
		);
		const total = divisionDamage ? divisionDamage.totalDamages : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total damages: ${formatNumberWithoutDecimals(total)} ${currency}`,
			colorPercentage: total / maxDamages,
			geojson: division.geojson || {},
		};
	});

	// Build lossesGeoData
	const maxLosses = Math.max(...lossesByDivision.map((l) => l.totalLosses), 1);
	const lossesGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionLoss = lossesByDivision.find(
			(l) => l.divisionId === division.id.toString()
		);
		const total = divisionLoss ? divisionLoss.totalLosses : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total losses: ${formatNumberWithoutDecimals(total)} ${currency}`,
			colorPercentage: total / maxLosses,
			geojson: division.geojson || {},
		};
	});

	// Build deathsGeoData
	const maxDeaths = Math.max(...deathsByDivision.map((d) => d.totalDeaths), 1);
	const deathsGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionDeaths = deathsByDivision.find(
			(d) => d.divisionId === division.id.toString()
		);
		const total = divisionDeaths ? divisionDeaths.totalDeaths : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total Deaths: ${formatNumberWithoutDecimals(total)}`,
			colorPercentage: total / maxDeaths,
			geojson: division.geojson || {},
		};
	});

	// Build affectedPeopleGeoData
	const maxAffected = Math.max(
		...affectedPeopleByDivision.map((a) => a.totalAffected),
		1
	);
	const affectedPeopleGeoData: interfaceMap[] = geographicLevel1.map(
		(division) => {
			const divisionAffected = affectedPeopleByDivision.find(
				(a) => a.divisionId === division.id.toString()
			);
			const total = divisionAffected ? divisionAffected.totalAffected : 0;
			return {
				total,
				name: division.name["en"] || "Unknown",
				description: `Total affected People: ${formatNumberWithoutDecimals(total)}`,
				colorPercentage: total / maxAffected,
				geojson: division.geojson || {},
			};
		}
	);

	// Build disasterEventGeoData
	const maxEvents = Math.max(
		...disasterEventCountByDivision.map((e) => e.eventCount),
		1
	);
	const disasterEventGeoData: interfaceMap[] = geographicLevel1.map(
		(division) => {
			const divisionEvents = disasterEventCountByDivision.find(
				(e) => e.divisionId === division.id.toString()
			);
			const total = divisionEvents ? divisionEvents.eventCount : 0;
			return {
				total,
				name: division.name["en"] || "Unknown",
				description: `Disaster events: ${formatNumberWithoutDecimals(total)}`,
				colorPercentage: total / maxEvents,
				geojson: division.geojson || {},
			};
		}
	);

	const disasterSummary = await getDisasterSummary(filters);

	return {
		currency,
		disasterCount,
		yearlyDisasterCounts,
		totalDeaths,
		totalInjured,
		totalMissing,
		totalDisplaced,
		totalAffectedDirect,
		totalAffectedIndirect,
		totalMen,
		totalWomen,
		totalNonBinary,
		totalChildren,
		totalAdults,
		totalSeniors,
		totalDisability,
		totalInternationalPoorPeople,
		totalNationalPoorPeople,
		totalDamages,
		totalLosses,
		totalDamagesByYear,
		totalLossesByYear,
		damagesGeoData,
		lossesGeoData,
		deathsGeoData,
		affectedPeopleGeoData,
		disasterEventGeoData,
		disasterSummary,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	};
};

export default function HazardAnalysis() {
	const ld = useLoaderData<typeof loader>();
	const {
		currency,
		hazardTypes,
		hazardClusters,
		specificHazards,
		allDivisions,
	} = ld;
	const ctx = new ViewContext();
	const actionData = useActionData<typeof action>();

	const [appliedFilters, setAppliedFilters] = useState<{
		hazardTypeId: string | null;
		hazardClusterId: string | null;
		specificHazardId: string | null;
		geographicLevelId: string | null;
		fromDate: string | null;
		toDate: string | null;
	}>({
		hazardTypeId: null,
		hazardClusterId: null,
		specificHazardId: null,
		geographicLevelId: null,
		fromDate: null,
		toDate: null,
	});

	// Inside HazardAnalysis component, before return
	useEffect(() => {
		if (actionData) {
			// Update appliedFilters based on the latest form submission
			setAppliedFilters({
				hazardTypeId: actionData.hazardTypeId || null,
				hazardClusterId: actionData.hazardClusterId || null,
				specificHazardId: actionData.specificHazardId || null,
				geographicLevelId: actionData.geographicLevelId || null,
				fromDate: actionData.fromDate || null,
				toDate: actionData.toDate || null,
			});
		}
	}, [actionData]);
	const handleClearFilters = () => {
		setAppliedFilters({
			hazardTypeId: null,
			hazardClusterId: null,
			specificHazardId: null,
			geographicLevelId: null,
			fromDate: null,
			toDate: null,
		});
	};

	const unknownHazard = ctx.t({
		"code": "hip.unknown_hazard",
		"msg": "Unknown hazard"
	});
	const unknownCluster = ctx.t({
		"code": "hip.unknown_cluster",
		"msg": "Unknown cluster"
	});
	const unknownType = ctx.t({
		"code": "hip.unknown_type",
		"msg": "Unknown type"
	});
	const unknownGeographicDivision = ctx.t({
		"code": "geographies.unknown_division",
		"desc": "Unknown geographic division.",
		"msg": "Unknown division"
	});

	const hazardName =
		appliedFilters.specificHazardId && specificHazards.length > 0
			? specificHazards.find((h) => h.id === appliedFilters.specificHazardId)
				?.name || unknownHazard
			: appliedFilters.hazardClusterId && hazardClusters.length > 0
				? hazardClusters.find((c) => c.id === appliedFilters.hazardClusterId)
					?.name || unknownCluster
				: appliedFilters.hazardTypeId
					? hazardTypes.find((t) => t.id === appliedFilters.hazardTypeId)?.name ||
					unknownType
					: null;

	const geographicName =
		appliedFilters.geographicLevelId && allDivisions.length > 0
			? allDivisions.find(
				(g) => g.id.toString() === appliedFilters.geographicLevelId
			)?.name["en"] || unknownGeographicDivision
			: null;

	const totalPeopleAffected = actionData
		? Number(actionData.totalAffectedDirect) +
		Number(actionData.totalDisplaced) +
		Number(actionData.totalInjured) +
		Number(actionData.totalMissing)
		: 0;

	return (
		<MainContainer
			title={ctx.t({
				"code": "analysis.hazards_analysis",
				"msg": "Hazards analysis"
			})}
			headerExtra={<NavSettings ctx={ctx} />}
		>
			<div>
				<div>
					<HazardFilters
						ctx={ctx}
						hazardTypes={hazardTypes}
						hazardClusters={hazardClusters}
						specificHazards={specificHazards}
						geographicLevels={allDivisions}
						onClearFilters={handleClearFilters}
						selectedHazardClusterId={appliedFilters.hazardClusterId}
						selectedSpecificHazardId={appliedFilters.specificHazardId}
						selectedGeographicLevelId={appliedFilters.geographicLevelId}
					/>
					{!hazardName && (
						<div
							style={{
								marginTop: "1.43rem",
								textAlign: "center",
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
								}}
							>
								{ctx.t({
									"code": "analysis.welcome_hazard_dashboard",
									"msg": "Welcome to the hazard dashboard! 🌟"
								})}
							</h3>
							<p>{ctx.t({ "code": "analysis.select_and_apply_filters", "msg": "Please select and apply filters above to view the analysis." })}</p>
						</div>
					)}
					{hazardName && (
						<div
							className="sectors-content"
							style={{
								marginTop: "1.43rem",
								maxWidth: "100%",
								overflow: "hidden",
							}}
						>
							{actionData && (
								<HazardImpactMap
									ctx={ctx}
									hazardName={hazardName}
									geographicName={geographicName}
									localCurrency={currency}
									damagesGeoData={actionData.damagesGeoData}
									lossesGeoData={actionData.lossesGeoData}
									disasterEventGeoData={actionData.disasterEventGeoData}
									affectedPeopleGeoData={actionData.affectedPeopleGeoData}
									deathsGeoData={actionData.deathsGeoData}
								/>
							)}

							{actionData && (
								<ImpactByHazard
									ctx={ctx}
									hazardName={hazardName}
									geographicName={geographicName}
									fromDate={appliedFilters.fromDate}
									toDate={appliedFilters.toDate}
									disasterCount={actionData.disasterCount}
									yearlyEventsCount={actionData.yearlyDisasterCounts}
								/>
							)}

							{actionData && (
								<HumanAffects
									ctx={ctx}
									totalPeopleAffected={totalPeopleAffected}
									totalDeaths={actionData.totalDeaths}
									totalDisplaced={actionData.totalDisplaced}
									totalInjured={actionData.totalInjured}
									totalMissing={actionData.totalMissing}
									totalPeopleDirectlyAffected={actionData.totalAffectedDirect}
									noOfMen={actionData.totalMen}
									noOfWomen={actionData.totalWomen}
									noOfNonBinary={actionData.totalNonBinary}
									totalChildren={actionData.totalChildren}
									totalAdults={actionData.totalAdults}
									totalSeniors={actionData.totalSeniors}
									totalDisability={actionData.totalDisability}
									totalInternationalPoorPeople={
										actionData.totalInternationalPoorPeople
									}
									totalNationalPoorPeople={actionData.totalNationalPoorPeople}
								/>
							)}

							{actionData && (
								<DamagesAndLoses
									ctx={ctx}
									localCurrency={currency}
									totalDamages={actionData.totalDamages && 'damagesTotal' in actionData.totalDamages ? (actionData.totalDamages.damagesTotal ?? 0) : 0}
									totalLosses={actionData.totalLosses && 'lossesTotal' in actionData.totalLosses ? (actionData.totalLosses.lossesTotal ?? 0) : 0}
									totalDamagesByYear={actionData.totalDamagesByYear}
									totalLossesByYear={actionData.totalLossesByYear}
								/>
							)}
							{actionData && (
								<DisasterEventsList
									ctx={ctx}
									hazardName={hazardName}
									geographicName={geographicName}
									disasterSummaryTable={actionData.disasterSummary}
								/>
							)}
						</div>
					)}
				</div>
			</div>
		</MainContainer>
	);
}

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.hazards_analysis",
				"msg": "Hazards analysis"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.hazards_analysis",
				"msg": "Hazards analysis"
			}),
		}
	];
};

