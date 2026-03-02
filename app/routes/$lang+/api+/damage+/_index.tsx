import { fieldsDefApi } from "~/backend.server/models/damages";

import { authLoaderApiDocs } from "~/utils/auth";

import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";
import { getCountrySettingsFromSession } from "~/utils/session";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const { request } = requestArgs;
	const ctx = new BackendContext(requestArgs);

	const settings = await getCountrySettingsFromSession(request);
	const currencies = [settings.currencyCode];

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "damage",
		fieldsDef: await fieldsDefApi(ctx, currencies),
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
