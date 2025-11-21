import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { useLoaderData } from "@remix-run/react";

export const loader = authLoaderWithPerm("ViewApiDocs", async (loaderArgs) => {
	return {
		common: await getCommonData(loaderArgs),
	}
})


export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	return (
		<MainContainer title="API Expoints">
			<>
				<h3>Data import and export</h3>
				<h4>Top level records</h4>
				<ul>
					<li><a href={ctx.url("/api/disaster-event")}>Disaster Events</a></li>
					<li><a href={ctx.url("/api/hazardous-event")}>Hazardous Events</a></li>
					<li><a href={ctx.url("/api/disaster-record")}>Disaster Records</a></li>
				</ul>

				<h4>Disaster record data</h4>
				<ul>
					<li><a href={ctx.url("/api/sector-disaster-record-relation")}>Sector Disaster Record Relation</a></li>
					<li><a href={ctx.url("/api/damage")}>Damages</a></li>
					<li><a href={ctx.url("/api/disruption")}>Disruptions</a></li>
					<li><a href={ctx.url("/api/human-effects")}>Human Effects</a></li>
					<li><a href={ctx.url("/api/losses")}>Losses</a></li>
					<li><a href={ctx.url("/api/nonecolosses")}>Non Economic Losses</a></li>
				</ul>

				<h4>Other data</h4>
				<ul>
					<li><a href={ctx.url("/api/asset")}>Assets</a></li>
					<li>
						<a href={ctx.url("/api/hips")}>HIPS</a>
						<ul>
							<li><a href={ctx.url("/api/hips/type")}>Type</a></li>
							<li><a href={ctx.url("/api/hips/cluster")}>Cluster</a></li>
							<li><a href={ctx.url("/api/hips/hazard")}>Hazard</a></li>
						</ul>
					</li>
					<li><a href={ctx.url("/api/division")}>Geographic division</a></li>
					<li><a href={ctx.url("/api/sector")}>Sector</a></li>
				</ul>

				<h3>Other internal APIs and WIP</h3>
				<ul>
					<li><a href={ctx.url("/api/dev-example1")}>Dev Example 1</a></li>
					<li><a href={ctx.url("/api/analytics")}>Analytics</a></li>
					<li><a href={ctx.url("/api/disaster-events/$disaster_event_id")}>Disaster Events by ID</a></li>
					<li><a href={ctx.url("/api/qrcode")}>QR Code</a></li>
				</ul>
			</>
		</MainContainer>
	);
}
