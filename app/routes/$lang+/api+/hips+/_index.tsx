import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	return {
	}
})

export default function Screen() {
	const ctx = new ViewContext();
	return (
		<MainContainer title="API Expoints">
			<>
				<ul>
					<li><LangLink lang={ctx.lang} to="/api/hips/type">HIPS Type</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/hips/cluster">HIPS Cluster</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/hips/hazard">HIPS Hazard</LangLink></li>
				</ul>
			</>
		</MainContainer >
	)
}

