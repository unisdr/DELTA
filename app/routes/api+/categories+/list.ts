import { getCategories } from "~/backend.server/models/category";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async () => {
	const categories = await getCategories(null);

	return Response.json({
		data: categories,
	});
});
