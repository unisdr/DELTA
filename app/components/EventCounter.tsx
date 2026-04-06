interface HazardEventHeaderProps {
	totalCount: number;
	instanceName: string;
}

/**
 * Header component for the hazardous event list page
 * Displays the total count of hazardous events and the instance name
 */
export function HazardEventHeader({ totalCount, instanceName }: HazardEventHeaderProps) {
	return (
		<>
			<div className="dts-page-intro">
				<h2 className="mg-u-margin-bottom--sm">
					{`${totalCount} hazardous event(s) in ${instanceName}`}
				</h2>
			</div>
		</>
	);
}
