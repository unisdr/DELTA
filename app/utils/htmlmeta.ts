import { ViewContext } from "~/frontend/context";

export function htmlTitle(ctx: ViewContext, pageTitle: string) {
	return ctx.t(
		{
			code: "meta.title",
			msg: "{page_title} - DELTA Resilience",
		},
		{ page_title: pageTitle },
	);
}
