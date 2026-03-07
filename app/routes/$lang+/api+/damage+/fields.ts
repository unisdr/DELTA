import { fieldsDefApi } from "~/backend.server/models/damages";
import { authLoaderApi } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";
import { getApiContext } from "~/backend.server/apiContext";

export const loader = authLoaderApi(async (args) => {
	const ctx = new BackendContext(args);
	const {currencies} = await getApiContext(args.request);
	return Response.json(await fieldsDefApi(ctx, currencies));
});
