import type { MetaFunction } from "react-router";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "react-router";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/utils/loadMarkdownContent";


import { htmlTitle } from "~/utils/htmlmeta";

export const loader = async () => {
	const { fullContent, appendContent } = await loadMarkdownContent("about");
	return {
		fullContent,
		appendContent,
	};
};

export const meta: MetaFunction = () => {


	return [
		{
			title: htmlTitle(
				"About the System",
			),
		},
		{
			name: "description",
			content: "About the System",
		},
	];
};

// React component for About the System page
export default function AboutTheSystem() {
	const ld = useLoaderData<typeof loader>();

	const { fullContent, appendContent } = ld;
	return (
		<MainContainer
			title="About the System"
			headerExtra={<NavSettings />}
		>
			<>
				<section className="dts-page-section">
					<div className="wip-message">
						<h2>About DELTA Resilience</h2>
						{fullContent ? (
							<div
								className="markdown-content"
								dangerouslySetInnerHTML={{ __html: fullContent }}
							/>
						) : (
							<>
								<PreventionWebLandingPageWidget
									pageId="92272"
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
					</div>
				</section>
			</>
		</MainContainer>
	);
}

