import {
	fieldsDefApi
} from "~/backend.server/models/damages"

import {
	authLoaderApiDocs,
} from "~/util/auth"

import {
	jsonApiDocs,
} from "~/backend.server/handlers/form/form_api"
import { getCountrySettingsFromSession } from "~/util/session";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApiDocs(async (requestArgs) => {
	const { request } = requestArgs;
	const ctx = new BackendContext(requestArgs);

	const settings = await getCountrySettingsFromSession(request);
	const currencies = [settings.currencyCode];

	let docs = await jsonApiDocs({
		ctx,
		baseUrl: "damage",
		fieldsDef: await fieldsDefApi(currencies),
	})

	return new Response(docs, {
		status: 200,
		headers: { "Content-Type": "text/plain" },
	})
})

