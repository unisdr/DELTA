import { BackendContext } from "~/backend.server/context";
import { getCategories } from "~/backend.server/models/category";
import { authLoaderApi } from "~/utils/auth";

export const loader = authLoaderApi(async (args) => {
	const ctx = new BackendContext(args);

	const categories = await getCategories(ctx, null);

	return Response.json({
		data: categories,
	});
});
