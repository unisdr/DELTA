import { useRef, useState, useEffect } from "react";
import MapChart, { MapChartRef } from "~/components/MapChart";
import { ViewContext } from "~/frontend/context";

interface HazardImpactMap2Props {
	ctx: ViewContext;
	hazardName: string;
	geographicName: string | null;
	localCurrency: string;
	damagesGeoData: any[];
	lossesGeoData: any[];
	disasterEventGeoData: any[];
	affectedPeopleGeoData: any[];
	deathsGeoData: any[];
}

const HazardImpactMap2: React.FC<HazardImpactMap2Props> = ({
	ctx,
	hazardName,
	geographicName,
	localCurrency,
	damagesGeoData,
	lossesGeoData,
	disasterEventGeoData,
	affectedPeopleGeoData,
	deathsGeoData,
}) => {
	const mapChartRef = useRef<MapChartRef>(null);
	const [activeData, setActiveData] = useState(damagesGeoData);

	// Update map data and tab states when geo-data props change (e.g., after applying filters)
	useEffect(() => {
		// Always reset to damagesGeoData when filter data changes
		setActiveData(damagesGeoData);
		mapChartRef.current?.setDataSource(damagesGeoData);
		mapChartRef.current?.setLegendTitle(`Total damages in ${localCurrency}`);
		mapChartRef.current?.setLegendMaxColor("#208f04");

		// Set "Total damages" tab as selected
		document.getElementById("tab01")?.setAttribute("aria-selected", "true");
		document.getElementById("tab02")?.setAttribute("aria-selected", "false");
		document.getElementById("tab03")?.setAttribute("aria-selected", "false");
		document.getElementById("tab04")?.setAttribute("aria-selected", "false");
		document.getElementById("tab05")?.setAttribute("aria-selected", "false");
	}, [
		damagesGeoData,
		lossesGeoData,
		disasterEventGeoData,
		affectedPeopleGeoData,
		deathsGeoData,
		localCurrency,
	]);

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

		const buttonText =
			e.currentTarget.textContent?.trim() ||
			ctx.t({
				"code": "analysis.legend",
				"msg": "Legend"
			});

		setActiveData(data);
		mapChartRef.current?.setDataSource(data);
		mapChartRef.current?.setLegendTitle(buttonText);
		mapChartRef.current?.setLegendMaxColor(legendMaxColor);

		// Update aria-selected state for tabs
		document.getElementById("tab01")?.setAttribute("aria-selected", data === damagesGeoData ? "true" : "false");
		document.getElementById("tab02")?.setAttribute("aria-selected", data === lossesGeoData ? "true" : "false");
		document.getElementById("tab03")?.setAttribute("aria-selected", data === disasterEventGeoData ? "true" : "false");
		document.getElementById("tab04")?.setAttribute("aria-selected", data === affectedPeopleGeoData ? "true" : "false");
		document.getElementById("tab05")?.setAttribute("aria-selected", data === deathsGeoData ? "true" : "false");
	};

	return (
		<section
			className="dts-page-section"
			style={{ maxWidth: "100%", overflow: "hidden" }}
		>
			<h2>
				{geographicName ? (
					// geographic name is known
					ctx.t(
						{
							"code": "analysis.hazard_impacts_across_geographic",
							"desc": "Header showing hazard name and a specific geographic area. {hazard} is the hazard name, {geographic} is the area name.",
							"msg": "{hazard} impacts across {geographic}"
						},
						{ hazard: hazardName, geographic: geographicName }
					)
				) : (
					// fallback to generic "country"
					ctx.t(
						{
							"code": "analysis.hazard_impacts_across_country",
							"desc": "Header showing hazard name with the generic word \"country\" when no specific geographic name is provided. {hazard} is the hazard name.",
							"msg": "{hazard} impacts across country"
						},
						{ hazard: hazardName }
					)
				)}
			</h2>
			<div className="map-section">
				<h2 className="mg-u-sr-only" id="tablist01">
					{ctx.t({
						"code": "analysis.geographic_impact_view",
						"msg": "Geographic impact view"
					})}
				</h2>
				<ul
					className="dts-tablist"
					role="tablist"
					aria-labelledby="tablist01"
				>
					<li role="presentation">
						<button
							onClick={(e) =>
								handleSwitchMapData(e, damagesGeoData, "#208f04")
							}
							type="button"
							className="dts-tablist__button"
							role="tab"
							id="tab01"
							aria-controls="tabpanel01"
							aria-selected={activeData === damagesGeoData ? "true" : "false"}
						>
							<span>
								{ctx.t(
									{
										"code": "analysis.total_losses_in_currency",
										"desc": "Label for total losses in the selected currency; {currency} is the currency code (e.g. USD).",
										"msg": "Total losses in {currency}"
									},
									{ currency: localCurrency }
								)}
							</span>
						</button>
					</li>
					<li role="presentation">
						<button
							onClick={(e) =>
								handleSwitchMapData(e, lossesGeoData, "#ff1010")
							}
							type="button"
							className="dts-tablist__button"
							role="tab"
							id="tab02"
							aria-controls="tabpanel02"
							aria-selected={activeData === lossesGeoData ? "true" : "false"}
						>
							<span>
								{ctx.t(
									{
										"code": "analysis.total_losses_in_currency",
										"desc": "Label for total losses in the selected currency; {currency} is the currency code (e.g. USD).",
										"msg": "Total losses in {currency}"
									},
									{ currency: localCurrency }
								)}
							</span>
						</button>
					</li>
					<li role="presentation">
						<button
							onClick={(e) =>
								handleSwitchMapData(e, disasterEventGeoData, "#58508d")
							}
							type="button"
							className="dts-tablist__button"
							role="tab"
							id="tab03"
							aria-controls="tabpanel03"
							aria-selected={activeData === disasterEventGeoData ? "true" : "false"}
						>
							<span>{ctx.t({ "code": "analysis.number_of_disaster_event", "msg": "Number of disaster event" })}</span>
						</button>
					</li>
					<li role="presentation">
						<button
							onClick={(e) =>
								handleSwitchMapData(e, affectedPeopleGeoData, "#208f04")
							}
							type="button"
							className="dts-tablist__button"
							role="tab"
							id="tab04"
							aria-controls="tabpanel04"
							aria-selected={activeData === affectedPeopleGeoData ? "true" : "false"}
						>
							<span>{ctx.t({ "code": "analysis.affected_people", "msg": "Affected people" })}</span>
						</button>
					</li>
					<li role="presentation">
						<button
							onClick={(e) =>
								handleSwitchMapData(e, deathsGeoData, "#ff1010")
							}
							type="button"
							className="dts-tablist__button"
							role="tab"
							id="tab05"
							aria-controls="tabpanel05"
							aria-selected={activeData === deathsGeoData ? "true" : "false"}
						>
							<span>{ctx.t({ "code": "analysis.number_of_deaths", "msg": "Number of deaths" })}</span>
						</button>
					</li>
				</ul>

				<div id="tabpanel01" role="tabpanel" aria-labelledby="tab01">
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
								legendMaxColor="#208f04"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default HazardImpactMap2;
