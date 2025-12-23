import React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
	XAxis,
	YAxis,
} from "recharts";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import { YearlyDisasterCount } from "~/backend.server/models/analytics/hazard-analysis";
import { formatNumberWithoutDecimals } from "~/util/currency";
import { Tooltip } from "primereact/tooltip";
import { ViewContext } from "~/frontend/context";

interface ImpactByHazardProps {
	ctx: ViewContext;
	hazardName: string;
	geographicName: string | null;
	fromDate: string | null;
	toDate: string | null;
	disasterCount: number;
	yearlyEventsCount: YearlyDisasterCount[];
}

const ImpactByHazard: React.FC<ImpactByHazardProps> = ({
	ctx,
	hazardName,
	geographicName,
	fromDate,
	toDate,
	disasterCount,
	yearlyEventsCount,
}) => {
	// Construct the title dynamically
	const titleParts = [hazardName];
	if (geographicName) titleParts.push(`(${geographicName})`);
	if (fromDate || toDate) {
		const startLabel = ctx.t({
			"code": "analysis.start",
			"msg": "Start"
		});
		const endLabel = ctx.t({
			"code": "analysis.end",
			"msg": "End"
		});

		titleParts.push(
			`[${fromDate || startLabel} to ${toDate || endLabel}]`
		);
	}
	titleParts.push(
		ctx.t({
			"code": "analysis.impact_summary",
			"msg": "impact summary"
		})
	);
	const title = titleParts.join(" ");

	// Helper function to check if chart data exists
	const hasChartData = yearlyEventsCount && yearlyEventsCount.length > 0;

	const tooltipText = geographicName
		? ctx.t(
			{
				"code": "analysis.total_hazard_events_in_geographic",
				"desc": "Tooltip showing the total number of {hazard} events that occurred in a specific geographic area.",
				"msg": "Total number of {hazard} events that occurred in {geographic}"
			},
			{ hazard: hazardName, geographic: geographicName }
		)
		: ctx.t(
			{
				"code": "analysis.total_hazard_events_in_all_country",
				"desc": "Tooltip when no specific geographic name is provided – use the generic phrase \"all country\".",
				"msg": "Total number of {hazard} events that occurred in all country"
			},
			{ hazard: hazardName }
		);


	return (
		<>
			<section
				className="dts-page-section"
				style={{ maxWidth: "100%", overflow: "hidden" }}
			>
				<Tooltip target=".custom-target-icon" pt={{
					root: { style: { marginTop: '-10px' } }
				}} />
				<h2 className="text-gray-600 mb-4">{title}</h2>
				<div className="mg-grid mg-grid__col-2">
					{/* Events impacting sectors */}
					<div className="mg-grid mg-grid--gap-default">
						<div className="dts-data-box">
							<h3 className="dts-body-label">
								<span id="elementId01">
									{geographicName
										? ctx.t(
											{
												"code": "analysis.total_events_in_geographic",
												"desc": "Total events in a specific geographic area",
												"msg": "Total events in {geographic}"
											},
											{ geographic: geographicName }
										)
										: ctx.t({
											"code": "analysis.total_events_in_all_country",
											"desc": "Label for total events across the entire country – used when no geographic region is selected",
											"msg": "Total events nationwide"
										})
									}
								</span>
								<div className="dts-tooltip__button">
									<svg
										aria-hidden="true"
										focusable="false"
										role="img"
										className="custom-target-icon"
										data-pr-tooltip={tooltipText}
										data-pr-position="top"
									>
										<use href="/assets/icons/information_outline.svg#information"></use>
									</svg>
								</div>
							</h3>
							<div className="dts-indicator dts-indicator--target-box-g">
								{disasterCount > 0 ? (
									<span>{formatNumberWithoutDecimals(disasterCount)}</span>
								) : (
									<>
										<img
											src="/assets/images/empty.png"
											alt={ctx.t({
												"code": "common.no_data_image_alt",
												"msg": "No data"
											})}
										/>
										<span className="dts-body-text">
											{ctx.t({
												"code": "analysis.no_data_available",
												"msg": "No data available"
											})}
										</span>

									</>
								)}
							</div>
						</div>
					</div>

					{/* Events overtime */}
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.events_over_time", "msg": "Events over time" })}</span>
							<div className="dts-tooltip__button">
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t(
										{
											"code": "analysis.hazard_events_distribution_tooltip",
											"desc": "Tooltip describing the distribution of events for a given hazard over time.",
											"msg": "Distribution of {hazard} events over time showing frequency and patterns"
										},
										{ hazard: hazardName }
									)}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div style={{ height: "400px" }}>
							{hasChartData ? (
								<ResponsiveContainer width="100%" height={400}>
									<AreaChart data={yearlyEventsCount}>
										<defs>
											<linearGradient
												id="eventGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
												<stop
													offset="95%"
													stopColor="#8884d8"
													stopOpacity={0.1}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="year" />
										<YAxis
											tickFormatter={(value) => Math.round(value).toString()}
											allowDecimals={false}
											domain={[0, "auto"]}
										/>
										<RechartsTooltip />
										<Area
											type="linear"
											dataKey="count"
											stroke="#8884d8"
											fill="url(#eventGradient)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<EmptyChartPlaceholder ctx={ctx} height={400} />
							)}
						</div>
					</div>
				</div>
				{/* </div> */}
			</section>
		</>
	);
};

export default ImpactByHazard;
