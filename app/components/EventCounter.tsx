import { ViewContext } from "~/frontend/context";

interface HazardEventHeaderProps {
	ctx: ViewContext;
	totalCount: number;
	instanceName: string;
}

/**
 * Header component for the hazardous event list page
 * Displays the total count of hazardous events and the instance name
 */
export function HazardEventHeader({
	ctx,
	totalCount,
	instanceName,
}: HazardEventHeaderProps) {
	return (
		<>
			<div className="dts-page-intro">
				<h2 className="mg-u-margin-bottom--sm">
					{ctx.t({
						"code": "hazardous_events_count_in_instance",
						"desc": "Describes the number of hazardous events in a specific instance. Example: '5 hazardous events in Example Country Instance'.",
						"msg": "{count} hazardous event(s) in {instance}"
					},{
						"count": totalCount,
						"instance": instanceName
					})}
				</h2>
			</div>
		</>
	);
}
