import { fieldsDefApi } from "~/backend.server/models/noneco_losses";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(fieldsDefApi);
});
