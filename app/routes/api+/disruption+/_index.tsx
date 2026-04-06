import { getFieldsDefApi } from "~/backend.server/models/disruption";

import { authLoaderApiDocs } from "~/utils/auth";

import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";



export const loader = authLoaderApiDocs(async () => {


	let docs = await jsonApiDocs({
		baseUrl: "disruption",
		fieldsDef: getFieldsDefApi(),
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
