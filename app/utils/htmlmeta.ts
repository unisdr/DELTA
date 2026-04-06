import { ViewContext } from "~/frontend/context";

const ctx = {
	t: (message: { msg: string; code?: string }, _vars?: any) => message.msg,
};

export function htmlTitle(pageTitle: string) {
	return ctx.t(
		{
			code: "meta.title",
			msg: "{page_title} - DELTA Resilience",
		},
		{ page_title: pageTitle },
	);
}
