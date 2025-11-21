import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";
import { useLoaderData } from "@remix-run/react";
import { LangLink } from "~/util/link";

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	return {
		common: await getCommonData(loaderArgs),
	}
})

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);

	return (
		<MainContainer title="Example">
		<div>
			<LangLink lang={ctx.lang} to="/examples/multiple-loaders/parent/parent1/child">Example</LangLink>
		</div>
		</MainContainer>
	)
}
