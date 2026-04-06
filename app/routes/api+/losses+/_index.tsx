import { authLoaderApiDocs } from "~/utils/auth";

import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";
import { createFieldsDefApi } from "~/backend.server/models/losses";



export const loader = authLoaderApiDocs(async () => {

	const currencies = ["USD"];

	let docs = await jsonApiDocs({
		baseUrl: "losses",
		fieldsDef: createFieldsDefApi(currencies),
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
