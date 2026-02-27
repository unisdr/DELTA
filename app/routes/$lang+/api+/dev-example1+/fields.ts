import { fieldsDefApi } from "~/backend.server/models/dev_example1";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(await fieldsDefApi());
});
