import type { MetaFunction } from "react-router";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "react-router";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/utils/loadMarkdownContent";


import { htmlTitle } from "~/utils/htmlmeta";

export const loader = async () => {
	const { fullContent, appendContent } = await loadMarkdownContent("partners");

	return {
		fullContent,
		appendContent,
	};
};

export const meta: MetaFunction = () => {


	return [
		{
			title: htmlTitle(
				"Partners",
			),
		},
		{
			name: "description",
			content: "Partners",
		},
	];
};

// React component for Partners page
export default function Partners() {
	const ld = useLoaderData<typeof loader>();

	const { fullContent, appendContent } = ld;

	return (
		<MainContainer title="Partners" headerExtra={<NavSettings />}>
			<>
				<section className="dts-page-section">
					<div className="wip-message">
						<section>
							<h2>Partners</h2>
							{fullContent ? (
								<div
									className="markdown-content"
									dangerouslySetInnerHTML={{ __html: fullContent }}
								/>
							) : (
								<>
									<PreventionWebLandingPageWidget
										pageId="92280"
										activeDomain="syndication.preventionweb.net"
									/>
									{appendContent && (
										<div
											className="markdown-append-content"
											dangerouslySetInnerHTML={{ __html: appendContent }}
										/>
									)}
								</>
							)}
						</section>
					</div>
				</section>
			</>
		</MainContainer>
	);
}

