import { LoaderFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";
import { createExampleLoader } from "~/backend.server/handlers/form/csv_import"

import {
	fieldsDefApi
} from "~/backend.server/models/damages"
import { getCountrySettingsFromSession } from "~/util/session";


export const loader = async (loaderArgs: LoaderFunctionArgs) => {
	const ctx = new BackendContext(loaderArgs);
  const { request } = loaderArgs;
  return createExampleLoader({
    fieldsDef: async () => {
      const settings = await getCountrySettingsFromSession(request);
      const currencies = settings.currencyCode ?? ["USD"];
      return await fieldsDefApi(ctx, currencies);
    }
  })(loaderArgs);
}
