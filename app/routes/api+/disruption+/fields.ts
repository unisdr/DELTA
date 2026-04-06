import { getFieldsDefApi } from "~/backend.server/models/disruption";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(getFieldsDefApi());
});
