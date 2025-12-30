import { authLoaderWithPerm } from "~/util/auth";
import { MainContainer } from "~/frontend/container";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";

export const loader = authLoaderWithPerm("ViewData", async () => {
	return {
	}
})

export default function Screen() {
	const ctx = new ViewContext();

	return (
		<MainContainer title="Example">
		<div>
			<LangLink lang={ctx.lang} to="/examples/multiple-loaders/parent/parent1/child">Example</LangLink>
		</div>
		</MainContainer>
	)
}
