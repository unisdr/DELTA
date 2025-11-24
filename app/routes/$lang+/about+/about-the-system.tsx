import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/util/loadMarkdownContent";

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { fullContent, appendContent } = await loadMarkdownContent("about");
	return {
		common: await getCommonData(loaderArgs),
		fullContent,
		appendContent
	};
};

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: "About the System - DELTA Resilience" },
		{
			name: "description",
			content: "About the System page under DELTA Resilience.",
		},
	];
};

// React component for About the System page
export default function AboutTheSystem() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	const { fullContent, appendContent } = ld;
	return (
		<MainContainer title="About the System" headerExtra={<NavSettings ctx={ctx} />}>
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
