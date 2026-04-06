interface HipHazardModel {
	hipType?: { name: string } | null;
	hipCluster?: { name: string } | null;
	hipHazard?: { name: string } | null;
}

export function HipHazardInfo({
	model,
}: {
	model: HipHazardModel;
}) {
	if (!model.hipType && !model.hipCluster && !model.hipHazard) {
		return null;
	}
	return (
		<div>
			<h5>{"Hazard classification"}</h5>
			<ul>
				{model.hipType && (
					<li>
						{"Type"}
						: {model.hipType.name}
					</li>
				)}
				{model.hipCluster && (
					<li>
						{"Cluster"}
						: {model.hipCluster.name}
					</li>
				)}
				{model.hipHazard && (
					<li>
						{"Hazard"}
						: {model.hipHazard.name}
					</li>
				)}
			</ul>
		</div>
	);
}
