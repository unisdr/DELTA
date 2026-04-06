import { fieldsDefApi } from "~/frontend/disaster-record/form";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	return Response.json(fieldsDefApi());
});
