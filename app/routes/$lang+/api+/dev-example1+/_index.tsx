import { fieldsDefApi } from "~/backend.server/models/dev_example1";

import { authLoaderApiDocs } from "~/utils/auth";
import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "dev-example1",
		fieldsDef: await fieldsDefApi(),
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
