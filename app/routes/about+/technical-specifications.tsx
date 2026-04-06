import type { MetaFunction } from "react-router";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "react-router";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/utils/loadMarkdownContent";


import { htmlTitle } from "~/utils/htmlmeta";

export const loader = async () => {
	const { fullContent, appendContent } = await loadMarkdownContent(
		"technical-specifications",
	);

	return {
		fullContent,
		appendContent,
	};
};

export const meta: MetaFunction = () => {


	return [
		{
			title: htmlTitle(
				"Technical Specifications",
			),
		},
		{
			name: "description",
			content: "Technical Specifications",
		},
	];
};

// React component for Technical Specifications page
export default function TechnicalSpecifications() {
	const ld = useLoaderData<typeof loader>();

	const { fullContent, appendContent } = ld;

	return (
		<MainContainer
			title="Technical Specifications"
			headerExtra={<NavSettings />}
		>
			<>
				<section className="dts-page-section">
					<div className="wip-message">
						<section>
							<h2>Technical Specifications</h2>
							{fullContent ? (
								<div
									className="markdown-content"
									dangerouslySetInnerHTML={{ __html: fullContent }}
								/>
							) : (
								<>
									<PreventionWebLandingPageWidget
										pageId="92279"
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

