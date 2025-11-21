import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { useLoaderData } from "@remix-run/react";
import { LangLink } from "~/util/link";

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
					<li><LangLink lang={ctx.lang} to="/api/disaster-event">Disaster Events</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/hazardous-event">Hazardous Events</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/disaster-record">Disaster Records</LangLink></li>
				</ul>

				<h4>Disaster record data</h4>
				<ul>
					<li><LangLink lang={ctx.lang} to="/api/sector-disaster-record-relation">Sector Disaster Record Relation</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/damage">Damages</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/disruption">Disruptions</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/human-effects">Human Effects</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/losses">Losses</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/nonecolosses">Non Economic Losses</LangLink></li>
				</ul>

				<h4>Other data</h4>
				<ul>
					<li><LangLink lang={ctx.lang} to="/api/asset">Assets</LangLink></li>
					<li>
						<LangLink lang={ctx.lang} to="/api/hips">HIPS</LangLink>
						<ul>
							<li><LangLink lang={ctx.lang} to="/api/hips/type">Type</LangLink></li>
							<li><LangLink lang={ctx.lang} to="/api/hips/cluster">Cluster</LangLink></li>
							<li><LangLink lang={ctx.lang} to="/api/hips/hazard">Hazard</LangLink></li>
						</ul>
					</li>
					<li><LangLink lang={ctx.lang} to="/api/division">Geographic division</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/sector">Sector</LangLink></li>
				</ul>

				<h3>Other internal APIs and WIP</h3>
				<ul>
					<li><LangLink lang={ctx.lang} to="/api/dev-example1">Dev Example 1</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/analytics">Analytics</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/disaster-events/$disaster_event_id">Disaster Events by ID</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/qrcode">QR Code</LangLink></li>
				</ul>
			</>
		</MainContainer>
	)
}
