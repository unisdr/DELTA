import { getFieldsDefApi } from "~/backend.server/models/disruption";
import { authLoaderApi } from "~/utils/auth";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderApi(async (args) => {
	const ctx = new BackendContext(args);
	return Response.json(getFieldsDefApi(ctx));
});