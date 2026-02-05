import type { MetaFunction } from "react-router";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "react-router";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/utils/loadMarkdownContent";

import { ViewContext } from "~/frontend/context";
import { htmlTitle } from "~/utils/htmlmeta";


export const loader = async () => {
	const { fullContent, appendContent } = await loadMarkdownContent("about");
	return {
		fullContent,
		appendContent
	};
};

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.about_system",
				"msg": "About the System"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.about_system",
				"msg": "About the System"
			}),
		}
	];
};

// React component for About the System page
export default function AboutTheSystem() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
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
