import { useState, useEffect } from "react";
import ImpactMapOl from "./Map/ImpactMapOl";
import type { MetricConfig } from "~/components/CustomMap";
import { ViewContext } from "~/frontend/context";

interface Sector {
	id: string;
	sectorname: string;
	subsectors?: Sector[];
}

// Define the filter shape to match ImpactMapOl props
type FilterValues = {
	sectorId: string | null;
	subSectorId: string | null;
	hazardTypeId: string | null;
	hazardClusterId: string | null;
	specificHazardId: string | null;
	geographicLevelId: string | null;
	fromDate: string | null;
	toDate: string | null;
	disasterEventId: string | null;
	assessmentType?: 'rapid' | 'detailed';
	confidenceLevel?: 'low' | 'medium' | 'high';
};

type Filters = FilterValues | null;

type ImpactMapProps = {
	ctx: ViewContext;
	filters: Filters;
	currency?: string;
	geographicImpactData: any;
	sectorsData?: { sectors: Sector[] | null };
	// New props for extended functionality
	availableMetrics?: string[];
	defaultMetric?: string;
	metricConfigs?: Record<string, MetricConfig>;
};

const DEFAULT_FILTERS: FilterValues = {
	sectorId: null,
	subSectorId: null,
	hazardTypeId: null,
	hazardClusterId: null,
	specificHazardId: null,
	geographicLevelId: null,
	fromDate: null,
	toDate: null,
	disasterEventId: null,
	assessmentType: 'rapid',
	confidenceLevel: 'low'
};

// Define default metric configs that will be updated with the correct currency
const getDefaultMetricConfigs = (ctx: ViewContext, currency: string): Record<string, MetricConfig> => ({
	totalDamage: {
		type: "monetary" as const,
		label: ctx.t({
			"code": "analysis.total_damages",
			"msg": "Total damages"
		}),
		currency
	},
	totalLoss: {
		type: "monetary" as const,
		label: ctx.t({
			"code": "analysis.total_losses",
			"msg": "Total losses"
		}),
		currency
	}
});

export default function ImpactMap({
	ctx,
	filters = DEFAULT_FILTERS,
	currency = "USD",
	geographicImpactData,
	sectorsData,
	availableMetrics = ["totalDamage", "totalLoss"],
	defaultMetric = "totalDamage",
	metricConfigs
}: ImpactMapProps) {
	// Use the provided metricConfigs or generate default ones with the correct currency
	const effectiveMetricConfigs = metricConfigs || getDefaultMetricConfigs(ctx, currency);

	const [selectedMetric, setSelectedMetric] = useState<string>(defaultMetric);
	const [selectedTab, setSelectedTab] = useState<string>('tab01'); // Add back selectedTab
	const [error, setError] = useState<string | null>(null);

	// More lenient check for valid data
	const hasValidData = Boolean(
		geographicImpactData &&
		// Either it has features array with items
		((geographicImpactData.features &&
			Array.isArray(geographicImpactData.features) &&
			geographicImpactData.features.length > 0) ||
			// Or it has type='FeatureCollection' which indicates it's GeoJSON
			(geographicImpactData.type === 'FeatureCollection'))
	);

	// Use sectors data from props for dynamic titles
	const sectors = sectorsData?.sectors || [];

	// Function to get sector with parent
	const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | undefined; parent: Sector | undefined } => {
		for (const sector of sectors) {
			if (sector.id.toString() === targetId) {
				return { sector, parent: undefined };
			}
			if (sector.subsectors) {
				const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
				if (subsector) {
					return { sector: subsector, parent: sector };
				}
			}
		}
		return { sector: undefined, parent: undefined };
	};

	// Function to get section title based on selected sector
	const sectionTitle = () => {
		if (!sectors || sectors.length === 0) {
			return ctx.t({
				"code": "analysis.impact_by_geographic_level",
				"msg": "Impact by geographic level"
			});
		}

		if (filters?.sectorId) {
			const { sector } = findSectorWithParent(sectors, filters.sectorId);

			if (filters?.subSectorId && sector) {
				const { sector: subsector, parent: mainSector } = findSectorWithParent(sectors, filters.subSectorId);
				if (subsector && mainSector) {
					return ctx.t(
						{
							"code": "analysis.impact_in_subsector_by_geographic_level",
							"desc": "Title for impact analysis in a subsector under a main sector, broken down by geographic level. {subsector} is the subsector name, {sector} is the main sector name.",
							"msg": "Impact in {subsector} ({sector} Sector) by Geographic level"
						},
						{ subsector: subsector.sectorname, sector: mainSector.sectorname }
					);
				}
			}

			if (sector) {
				return ctx.t(
					{
						"code": "analysis.impact_in_sector_by_geographic_level",
						"desc": "Title for impact analysis in a sector, broken down by geographic level. {sector} is the name of the sector.",
						"msg": "Impact in {sector} Sector by Geographic level"
					},
					{ sector: sector.sectorname }
				);

			}
		}
		return ctx.t({
			"code": "analysis.impact_by_geographic_level",
			"msg": "Impact by geographic level"
		});
	};

	// Get display label for metric with unit info
	const getMetricDisplayLabel = (metric: string) => {
		const config = effectiveMetricConfigs[metric];
		if (!config) return metric;

		if (config.type === "monetary") {
			const currencyCode = config.currency || currency;
			return ctx.t(
				{
					"code": "analysis.metric_in_currency",
					"desc": "Displays a metric label followed by the currency. {label} is the metric (e.g. Total damages), {currency} is the currency code (e.g. USD).",
					"msg": "{label} in {currency}"
				},
				{ label: config.label, currency: currencyCode }
			);
		} else if (config.unit) {
			return `${config.label} (${config.unit})`;
		} else {
			return config.label;
		}
	};

	// Handle tab selection - Fixed to prevent infinite loop
	const handleSelectTab = (tabId: string, metric: string) => {
		setSelectedTab(tabId);
		setSelectedMetric(metric);
	};

	// Set error message if there's an issue with the data
	useEffect(() => {
		if (!geographicImpactData) {
			setError("Failed to load geographic impact data");
		} else if (geographicImpactData.error) {
			const errorMessage =
				geographicImpactData.error === "No divisions found for the given criteria"
					? ctx.t({
						"code": "analysis.no_admin_divisions_available",
						"msg": "No administrative divisions are available in the system. Please contact your administrator to set up geographic boundaries."
					})
					: geographicImpactData.message || geographicImpactData.error
						? String(geographicImpactData.message || geographicImpactData.error)
						: ctx.t({
							"code": "analysis.failed_to_fetch_geographic_data",
							"msg": "Failed to fetch geographic data"
						});
			setError(errorMessage);
		} else {
			setError(null);
		}
	}, [geographicImpactData]);

	return (
		<section className="dts-page-section">
			<div className="mg-container">
				<h2 className="dts-heading-2">{sectionTitle()}</h2>
				<p className="dts-body-text mb-6">
					{ctx.t({
						"code": "analysis.distribution_of_impacts_geographic_levels",
						"msg": "Distribution of impacts across different geographic levels"
					})}
				</p>

				<div className="map-section">
					<h2 className="mg-u-sr-only" id="tablist01">
						{ctx.t({
							"code": "analysis.geographic_impact_view",
							"msg": "Geographic impact view"
						})}
					</h2>

					{/* Dynamic metric selector based on available metrics */}
					<ul className="dts-tablist" role="tablist" aria-labelledby="tablist01">
						{availableMetrics.map((metric, index) => {
							const tabId = `tab${(index + 1).toString().padStart(2, '0')}`;

							return (
								<li key={metric} role="presentation">
									<button
										className={`dts-tablist__button ${selectedTab === tabId ? 'active' : ''}`}
										type="button"
										role="tab"
										id={tabId}
										aria-controls="tabpanel01"
										aria-selected={selectedTab === tabId}
										tabIndex={selectedTab === tabId ? 0 : -1}
										onClick={() => handleSelectTab(tabId, metric)}
									>
										<span>{getMetricDisplayLabel(metric)}</span>
									</button>
								</li>
							);
						})}
					</ul>

					{/* Single tab panel that updates based on selected metric */}
					<div
						id="tabpanel01"
						role="tabpanel"
						aria-labelledby={selectedTab}
					>
						{error ? (
							<div className="map-error">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
								</svg>
								<div className="map-error-message">
									{error}
								</div>
							</div>
						) : !hasValidData ? (
							<div className="map-no-data">
								<p>
									{ctx.t({
										"code": "analysis.no_geographic_data_for_filters",
										"msg": "No geographic data available for the selected filters."
									})}
								</p>

							</div>
						) : (
							<ImpactMapOl
								ctx={ctx}
								geoData={geographicImpactData}
								selectedMetric={selectedMetric}
								filters={filters || DEFAULT_FILTERS}
								currency={currency}
								metricConfig={effectiveMetricConfigs[selectedMetric]}
							/>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
