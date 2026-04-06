import { fieldsDefApi } from "~/backend.server/models/damages";

import { authLoaderApiDocs } from "~/utils/auth";

import { jsonApiDocs } from "~/backend.server/handlers/form/form_api";
import { getCountrySettingsFromSession } from "~/utils/session";


export const loader = authLoaderApiDocs(async (requestArgs) => {
	const { request } = requestArgs;


	const settings = await getCountrySettingsFromSession(request);
	const currencies = [settings.currencyCode];

	let docs = await jsonApiDocs({
		baseUrl: "damage",
		fieldsDef: await fieldsDefApi(currencies),
	});

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	});
});
