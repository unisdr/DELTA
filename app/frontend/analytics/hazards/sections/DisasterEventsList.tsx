import React from "react";
import { DisasterSummary } from "~/backend.server/models/analytics/hazard-analysis";
import { ViewContext } from "~/frontend/context";
import { formatNumberWithoutDecimals } from "~/utils/currency";

interface DisasterEventsListProps {
	ctx: ViewContext;
	hazardName: string;
	geographicName: string | null;
	disasterSummaryTable: DisasterSummary[];
}

const DisasterEventsList: React.FC<DisasterEventsListProps> = ({
	ctx,
	hazardName,
	geographicName,
	disasterSummaryTable,
}) => {
	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">
					{geographicName ? (
						ctx.t(
							{
								"code": "analysis.most_recent_events_in_geographic",
								"desc": "Header for the most recent events of a hazard in a specific geographic area. {hazard}=hazard name, {geographic}=geographic name.",
								"msg": "Most recent {hazard} events in {geographic}"
							},
							{ hazard: hazardName, geographic: geographicName }
						)
					) : (
						ctx.t(
							{
								"code": "analysis.most_recent_events_across_country",
								"desc": "Header for the most recent events of a hazard when no specific geographic area is selected (across the whole country). {hazard}=hazard name.",
								"msg": "Most recent {hazard} events across country"
							},
							{ hazard: hazardName }
						)
					)}
				</h2>
				<div className="table-container">
					<table className="dts-table">
						<thead>
							<tr>
								<th>{ctx.t({ "code": "common.uuid", "msg": "UUID" })}</th>
								<th>{ctx.t({ "code": "analysis.disaster_summary.event_name", "msg": "Event name" })}</th>
								<th>{ctx.t({ "code": "common.start_date", "msg": "Start date" })}</th>
								<th>{ctx.t({ "code": "common.end_date", "msg": "End date" })}</th>
								<th>{ctx.t({ "code": "analysis.disaster_summary.province_affected", "msg": "Province affected" })}</th>
								<th>{ctx.t({ "code": "analysis.disaster_summary.damages", "msg": "Damages" })}</th>
								<th>{ctx.t({ "code": "analysis.disaster_summary.losses", "msg": "Losses" })}</th>
								<th>{ctx.t({ "code": "analysis.disaster_summary.people_affected", "msg": "People affected" })}</th>
							</tr>
						</thead>
						<tbody>
							{disasterSummaryTable.map((disasterSummaryRecord) => {
								return (
									<tr key={disasterSummaryRecord.disasterId}>
										<td>{disasterSummaryRecord.disasterId}</td>
										<td>{disasterSummaryRecord.disasterName}</td>
										<td>{disasterSummaryRecord.startDate}</td>
										<td>{disasterSummaryRecord.endDate}</td>
										<td>{disasterSummaryRecord.provinceAffected}</td>
										<td>{formatNumberWithoutDecimals(disasterSummaryRecord.totalDamages)}</td>
										<td>{formatNumberWithoutDecimals(disasterSummaryRecord.totalLosses)}</td>
										<td>{formatNumberWithoutDecimals(disasterSummaryRecord.totalAffectedPeople)}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</section>
		</>
	);
};

export default DisasterEventsList;
