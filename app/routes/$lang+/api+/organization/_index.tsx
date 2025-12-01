import {
	getFieldsDefApi as fieldsDefApi,
} from "~/backend.server/models/organization";

import {
	authLoaderApiDocs,
} from "~/util/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "organization",
		fieldsDef: await fieldsDefApi(ctx),
	})

	return new Response(docs, {
		status: 200,
		headers: {"Content-Type": "text/plain"},
	});
});
