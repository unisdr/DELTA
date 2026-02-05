import {
	fieldsDefApi
} from "~/backend.server/models/disaster_record__sectors";

import {
	authLoaderApiDocs,
} from "~/utils/auth";
import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api";

import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const ctx = new BackendContext(requestArgs);

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "sector-disaster-record-relation",
		fieldsDef: fieldsDefApi,
	})

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
