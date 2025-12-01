import React from "react";
import HorizontalBarChart from "~/components/HorizontalBarChart";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import { formatNumberWithoutDecimals } from "~/util/currency";
import { Tooltip } from "primereact/tooltip";
import { ViewContext } from "~/frontend/context";

interface HumanAffectsProps {
	ctx: ViewContext;
	totalPeopleAffected: number;
	totalDeaths: number;
	totalInjured: number;
	totalMissing: number;
	totalPeopleDirectlyAffected: number;
	totalDisplaced: number;
	noOfMen: number;
	noOfWomen: number;
	noOfNonBinary: number;
	totalChildren: number;
	totalAdults: number;
	totalSeniors: number;
	totalDisability: number;
	totalInternationalPoorPeople: number;
	totalNationalPoorPeople: number;
}

const HumanAffects: React.FC<HumanAffectsProps> = ({
	ctx,
	totalPeopleAffected,
	totalDeaths,
	totalInjured,
	totalMissing,
	totalPeopleDirectlyAffected,
	totalDisplaced,
	noOfMen,
	noOfWomen,
	noOfNonBinary,
	totalChildren,
	totalAdults,
	totalSeniors,
	totalDisability,
	totalInternationalPoorPeople,
	totalNationalPoorPeople,
}) => {
	// TODO: translate
	const data = [
		{
			name: "",
			Male: noOfMen,
			Female: noOfWomen,
			"Other non-Binary": noOfNonBinary,
		},
	];

	// TODO: translate
	const ageData = [
		{
			name: "",
			"Children (0 - 14)": totalChildren,
			"Adults (15 - 64)": totalAdults,
			"Seniors (65+)": totalSeniors,
		},
	];

	// TODO: translate
	const disbilityAndPovertyData = [
		{
			name: "",
			"Persons with disabilities": totalDisability,
			"Persons living in poverty (national)": totalNationalPoorPeople,
			"Persons living in poverty (international)": totalInternationalPoorPeople,
		},
	];

	// Helper functions to check if data exists for charts
	const hasGenderData = noOfMen > 0 || noOfWomen > 0 || noOfNonBinary > 0;
	const hasAgeData = totalChildren > 0 || totalAdults > 0 || totalSeniors > 0;
	const hasDisabilityPovertyData =
		totalDisability > 0 ||
		totalNationalPoorPeople > 0 ||
		totalInternationalPoorPeople > 0;

	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">
					{ctx.t({ "code": "analysis.human_direct_effects", "msg": "Human direct effects" })}
				</h2>
				<Tooltip target=".custom-target-icon" pt={{
					root: { style: { marginTop: '-10px' } }
				}} />
				<div className="mg-grid mg-grid__col-3">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.total_people_affected", "msg": "Total people affected" })}</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_people_affected_tooltip",
										"desc": "Tooltip explaining that total people affected is the sum of injured, missing, directly affected people and displaced",
										"msg": "Total people affected is the sum of injured, missing, directly affected people and displaced"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							<span className="dts-indicator__value">
								{formatNumberWithoutDecimals(totalPeopleAffected)}
							</span>
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-3" style={{ gap: "16px" }}>
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.deaths", "msg": "Deaths" })}</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_number_of_deaths",
										"msg": "Total number of deaths"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Dead.svg"
								alt={ctx.t({
									"code": "analysis.dead_icon",
									"desc": "Alt text for the icon that represents a deceased person",
									"msg": "Dead Icon"
								})}
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "130px", fontSize: "1.2em" }}>
								{formatNumberWithoutDecimals(totalDeaths)}
							</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.injured", "msg": "Injured" })}</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_number_of_injured",
										"msg": "Total number of injured"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Injured-1.svg"
								alt={ctx.t({
									"code": "analysis.injured_icon",
									"desc": "Alt text for the icon that represents injured people",
									"msg": "Injured Icon"
								})}
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "150px", fontSize: "1.2em" }}>
								{formatNumberWithoutDecimals(totalInjured)}
							</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>{ctx.t({
								"code": "analysis.missing",
								"desc": "Label for the number of missing people",
								"msg": "Missing"
							})}</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_number_of_missing",
										"desc": "Tooltip explaining that this is the total number of missing persons",
										"msg": "Total number of missing persons"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Missing.svg"
								alt={ctx.t({
									"code": "analysis.missing_icon",
									"desc": "Alt text for the icon that represents missing persons",
									"msg": "Missing Icon"
								})}
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "150px", fontSize: "1.2em" }}>
								{formatNumberWithoutDecimals(totalMissing)}
							</span>
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-2" style={{ gap: "16px" }}>
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>
								{ctx.t({
									"code": "analysis.people_directly_affected",
									"desc": "Label for people directly affected by the hazard",
									"msg": "People directly affected"
								})}
							</span>

							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_people_directly_affected",
										"desc": "Tooltip explaining that this is the total number of people directly affected",
										"msg": "Total number of people directly affected"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/AffectedPopulation.svg"
								alt={ctx.t({
									"code": "analysis.affected_population_icon",
									"desc": "Alt text for the icon that represents the affected population",
									"msg": "Affected Population Icon"
								})}
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "250px", fontSize: "1.2em" }}>
								{formatNumberWithoutDecimals(totalPeopleDirectlyAffected)}
							</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.displaced", "msg": "Displaced" })}</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.total_number_of_displaced",
										"msg": "Total number of displaced people"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Internally-displaced.svg"
								alt={ctx.t({ "code": "analysis.internally_displaced_icon", "msg": "Internally displaced Icon" })}
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "250px", fontSize: "1.2em" }}>
								{formatNumberWithoutDecimals(totalDisplaced)}
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="dts-page-section">
				<div className="mg-grid mg-grid__col-3">
					{/* Men and women disaggregation */}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.men_and_women_affected", "msg": "Men and women affected" })}</span>

							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.gender_distribution_tooltip",
										"desc": "Tooltip explaining that the chart shows the distribution of affected people by gender",
										"msg": "Distribution of affected people by gender"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						{hasGenderData ? (
							<HorizontalBarChart
								data={data}
								imgSrc="/assets/icons/Male&Female.svg"
							/>
						) : (
							<EmptyChartPlaceholder ctx={ctx} height={220} />
						)}
					</div>

					{/* Persons with disabilities and living in poverty affected*/}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span>
								{ctx.t({
									"code": "analysis.persons_with_disabilities_and_living_in_poverty_affected",
									"msg": "Persons with disabilities and living in poverty affected"
								})}
							</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.disability_poverty_distribution_tooltip",
										"msg": "Distribution of affected people by disability and poverty status"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						{hasDisabilityPovertyData ? (
							<HorizontalBarChart
								data={disbilityAndPovertyData}
								imgSrc="/assets/icons/People-with-physical-impairments.svg"
								colorScheme="cerulean"
							/>
						) : (
							<EmptyChartPlaceholder ctx={ctx} height={220} />
						)}
					</div>

					{/* Children adult and senior affected*/}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span>{ctx.t({ "code": "analysis.children_adults_and_seniors_affected", "msg": "Children, adults, and seniors affected" })}</span>
							<div
								className="dts-tooltip__button"
							>
								<svg aria-hidden="true" focusable="false" role="img"
									className="custom-target-icon"
									data-pr-tooltip={ctx.t({
										"code": "analysis.age_group_distribution_tooltip",
										"msg": "Distribution of affected people by age group"
									})}
									data-pr-position="top"
								>
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						{hasAgeData ? (
							<HorizontalBarChart
								data={ageData}
								imgSrc="/assets/icons/Male&Female.svg"
							/>
						) : (
							<EmptyChartPlaceholder ctx={ctx} height={220} />
						)}
					</div>
				</div>
			</section>
		</>
	);
};

export default HumanAffects;
