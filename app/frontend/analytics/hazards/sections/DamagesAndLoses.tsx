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
import {
	DamageByYear,
	LossByYear,
} from "~/backend.server/models/analytics/hazard-analysis";
import { formatNumberWithoutDecimals } from "~/util/currency";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import { Tooltip } from "primereact/tooltip";
import { ViewContext } from "~/frontend/context";

interface DamagesAndLosesProps {
	ctx: ViewContext;
	localCurrency: string;
	totalDamages: number;
	totalLosses: number;
	totalDamagesByYear: DamageByYear[];
	totalLossesByYear: LossByYear[];
}

const DamagesAndLoses: React.FC<DamagesAndLosesProps> = ({
	ctx,
	localCurrency,
	totalDamages,
	totalLosses,
	totalDamagesByYear,
	totalLossesByYear,
}) => {
	// Helper functions to check if data exists for charts
	const hasDamageChartData = totalDamagesByYear && totalDamagesByYear.length > 0;
	const hasLossChartData = totalLossesByYear && totalLossesByYear.length > 0;

	return (
		<>
			<section className="dts-page-section">

				<Tooltip target=".custom-target-icon" pt={{
					root: { style: { marginTop: '-10px' } }
				}} />
				<h2 className="dts-heading-2">
					{ctx.t({
						"code": "analysis.damages_and_losses",
						"msg": "Damages and loses"
					})}
				</h2>
				<div className="mg-grid mg-grid__col-2">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>
								{ctx.t(
									{
										"code": "analysis.total_damages_in_currency",
										"desc": "Label showing total damages in the selected currency; {currency} is the currency code (e.g. USD).",
										"msg": "Damages in {currency}"
									},
									{ currency: localCurrency }
								)}
							</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_monetary_value_of_damages_caused_by_hazards",
										"msg": "Total monetary value of damages caused by hazards"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							{totalDamages > 0 ? (
								<span>{formatNumberWithoutDecimals(totalDamages)}</span>
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
						{/* Damages overtime */}
						<div style={{ height: "400px" }}>
							{hasDamageChartData ? (
								<ResponsiveContainer width="100%" height={400}>
									<AreaChart data={totalDamagesByYear}>
										<defs>
											<linearGradient
												id="damageGradient"
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
											dataKey="totalDamages"
											stroke="#8884d8"
											fill="url(#damageGradient)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<EmptyChartPlaceholder ctx={ctx} height={400} />
							)}
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>
								{ctx.t(
									{
										"code": "analysis.losses_in_currency",
										"msg": "Losses in {currency}"
									},
									{ currency: localCurrency }
								)}
							</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_losses_monetary_value_of_losses_caused_by_hazards",
										"msg": "Total monetary value of losses caused by hazards"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							{totalLosses > 0 ? (
								<span>{formatNumberWithoutDecimals(totalLosses)}</span>
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
						<div style={{ height: "400px" }}>
							{hasLossChartData ? (
								<ResponsiveContainer width="100%" height={400}>
									<AreaChart data={totalLossesByYear}>
										<defs>
											<linearGradient
												id="lossGradient"
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
											dataKey="totalLosses"
											stroke="#8884d8"
											fill="url(#lossGradient)"
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
			</section>
		</>
	);
};

export default DamagesAndLoses;
