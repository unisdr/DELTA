import { authLoaderApiDocs } from "~/util/auth";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);

	let docs = `
GET ` + ctx.fullUrl("/api/hips/cluster/list") + `
`
	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
