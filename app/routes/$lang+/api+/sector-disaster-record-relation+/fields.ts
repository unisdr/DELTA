import { fieldsDefApi } from "~/backend.server/models/disaster_record__sectors";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(fieldsDefApi);
});
