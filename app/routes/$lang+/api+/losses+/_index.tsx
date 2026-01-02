import { authLoaderApiDocs } from "~/util/auth";

import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";
import { createFieldsDefApi } from "~/backend.server/models/losses";

import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);
	const currencies = ["USD"];

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "losses",
		fieldsDef: createFieldsDefApi(ctx, currencies),
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
