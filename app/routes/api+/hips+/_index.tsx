import { authLoaderWithPerm } from "~/utils/auth";
import { MainContainer } from "~/frontend/container";



import { LangLink } from "~/utils/link";

export const loader = authLoaderWithPerm("ViewApiDocs", async () => {
	return {};
});

export default function Screen() {

	return (
		<MainContainer title="API Expoints">
			<>
				<ul>
					<li>
						<LangLink lang="en" to="/api/hips/type">
							HIPS Type
						</LangLink>
					</li>
					<li>
						<LangLink lang="en" to="/api/hips/cluster">
							HIPS Cluster
						</LangLink>
					</li>
					<li>
						<LangLink lang="en" to="/api/hips/hazard">
							HIPS Hazard
						</LangLink>
					</li>
				</ul>
			</>
		</MainContainer>
	);
}
