import { fieldsDefApi } from "~/backend.server/models/asset";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(await fieldsDefApi());
});
