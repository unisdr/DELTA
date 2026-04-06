import { fieldsDefApi } from "~/frontend/events/disastereventform";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(fieldsDefApi());
});
