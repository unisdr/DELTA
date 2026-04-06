import { authLoaderWithPerm } from "~/utils/auth";
import { MainContainer } from "~/frontend/container";



import { LangLink } from "~/utils/link";

export const loader = authLoaderWithPerm("ViewData", async () => {
	return {};
});

export default function Screen() {


	return (
		<MainContainer title="Example">
			<div>
				<LangLink
					lang="en"
					to="/examples/multiple-loaders/parent/parent1/child"
				>
					Example
				</LangLink>
			</div>
		</MainContainer>
	);
}
