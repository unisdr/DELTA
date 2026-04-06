import { authLoaderApiDocs } from "~/utils/auth";

const ctx: any = { t: (message: any, _v?: any) => message?.msg ?? "", lang: "en", url: (p: string) => p, fullUrl: (p: string) => p, rootUrl: () => "/" };





export const loader = authLoaderApiDocs(async () => {


	let docs =
		`
GET ` +
		ctx.fullUrl("/api/hips/type/list") +
		`
`;
	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
