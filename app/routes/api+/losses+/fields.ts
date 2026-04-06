import { createFieldsDefApi } from "~/backend.server/models/losses";
import { authLoaderApi } from "~/utils/auth";

import { getApiContext } from "~/backend.server/apiContext";

export const loader = authLoaderApi(async (args) => {
	const { currencies } = await getApiContext(args.request);
	return Response.json(createFieldsDefApi(currencies));
});
