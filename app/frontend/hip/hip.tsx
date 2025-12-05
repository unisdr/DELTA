import { ViewContext } from "../context";

interface HipHazardModel {
	hipType?: { nameEn: string } | null
	hipCluster?: { nameEn: string } | null
	hipHazard?: { nameEn: string } | null
}

export function HipHazardInfo({ ctx, model }: { ctx: ViewContext; model: HipHazardModel }) {
	if (!model.hipType && !model.hipCluster && !model.hipHazard) {
		return null
	}
	return (
		<div>
			<h5>
				{ctx.t({
					"code": "hip.hazard_classification",
					"desc": "HIP hazard classification",
					"msg": "Hazard classification"
				})}
			</h5>
			<ul>
				{model.hipType && (
					<li>
						{ctx.t({
							"code": "hip.type_short",
							"desc": "HIP hazard type (in HIP classification context, short)",
							"msg": "Type"
						})}: {model.hipType.nameEn}
					</li>
				)}
				{model.hipCluster && (
					<li>
						{ctx.t({
							"code": "hip.cluster_short",
							"desc": "HIP hazard cluster (in HIP classification context, short)",
							"msg": "Cluster"
						})}: {model.hipCluster.nameEn}
					</li>
				)}
				{model.hipHazard && (
					<li>
						{ctx.t({
							"code": "hip.hazard_short",
							"desc": "HIP hazard name (in HIP classification context, short)",
							"msg": "Hazard"
						})}: {model.hipHazard.nameEn}
					</li>
				)}
			</ul>
		</div>
	);
}
