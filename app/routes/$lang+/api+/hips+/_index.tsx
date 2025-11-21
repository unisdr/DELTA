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
				<ul>
					<li><LangLink lang={ctx.lang} to="/api/hips/type">HIPS Type</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/hips/cluster">HIPS Cluster</LangLink></li>
					<li><LangLink lang={ctx.lang} to="/api/hips/hazard">HIPS Hazard</LangLink></li>
				</ul>
			</>
		</MainContainer >
	)
}

