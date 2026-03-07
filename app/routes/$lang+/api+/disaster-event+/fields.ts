import { fieldsDefApi } from "~/frontend/events/disastereventform";
import { authLoaderApi } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApi(async (args) => {
	const ctx = new BackendContext(args);
	return Response.json(fieldsDefApi(ctx));
});
