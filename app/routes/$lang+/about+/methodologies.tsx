import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";

import { loadMarkdownContent } from "~/util/loadMarkdownContent";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";

import { ViewContext } from "~/frontend/context";

export const loader = async () => {
	// load .md file and its append file if exist
	const { fullContent, appendContent } = await loadMarkdownContent(
		"methodologies"
	);

	return {
		fullContent,
		appendContent
	};
};

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: "Methodologies - DELTA Resilience" },
		{
			name: "description",
			content: "Methodologies page under DELTA Resilience.",
		},
	];
};

// React component for About the System page
export default function Methodologies() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { fullContent, appendContent } = ld;
	return (
		<MainContainer title="Methodologies" headerExtra={<NavSettings ctx={ctx} />}>
			<>
				<section className="dts-page-section">
					<div className="wip-message">
						<section>
							<h2>Methodologies</h2>
							{fullContent ? (
								<div
									className="markdown-content"
									dangerouslySetInnerHTML={{ __html: fullContent }}
								/>
							) : (
								<>
									<PreventionWebLandingPageWidget
										pageId="92282"
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
