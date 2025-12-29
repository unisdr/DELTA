import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/util/loadMarkdownContent";

import { ViewContext } from "~/frontend/context";



export const loader = async () => {
	const { fullContent, appendContent } = await loadMarkdownContent("support");
	return {
		fullContent,
		appendContent
	};
};

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: "Support - DELTA Resilience" },
		{
			name: "description",
			content: "Support page under DELTA Resilience.",
		},
	];
};

// React component for Support page
export default function Support() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { fullContent, appendContent } = ld;

	return (
		<MainContainer title="Support" headerExtra={<NavSettings ctx={ctx} />}>
			<>
				<section className="dts-page-section">
					<div className="wip-message">
						<section>
							<h2>Support</h2>
							{fullContent ? (
								<div
									className="markdown-content"
									dangerouslySetInnerHTML={{ __html: fullContent }}
								/>
							) : (
								<>
									<PreventionWebLandingPageWidget
										pageId="92283"
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
