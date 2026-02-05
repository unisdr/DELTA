import type { MetaFunction } from "react-router";

import { NavSettings } from "~/routes/$lang+/settings/nav";
import { MainContainer } from "~/frontend/container";

import { loadMarkdownContent } from "~/utils/loadMarkdownContent";
import { useLoaderData } from "react-router";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";

import { ViewContext } from "~/frontend/context";
import { htmlTitle } from "~/utils/htmlmeta";

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

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(ctx, ctx.t({
				"code": "meta.methodologies",
				"msg": "Methodologies"
			})),
		},
		{
			name: "description",
			content: ctx.t({
				"code": "meta.methodologies",
				"msg": "Methodologies"
			}),
		}
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
