import { LoaderFunctionArgs } from "react-router";

import { createExampleLoader } from "~/backend.server/handlers/form/csv_import";

import { fieldsDefApi } from "~/backend.server/models/damages";
import { getCountrySettingsFromSession } from "~/utils/session";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const { request } = loaderArgs;
	return createExampleLoader({
		fieldsDef: async () => {
			const settings = await getCountrySettingsFromSession(request);
			const currencies = settings.currencyCode ?? ["USD"];
			return await fieldsDefApi(currencies);
		},
	})(loaderArgs);
};
