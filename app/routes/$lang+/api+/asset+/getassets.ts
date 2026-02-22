import { BackendContext } from "~/backend.server/context";
import { searchAssets } from "~/backend.server/models/asset";
import { authLoaderWithPerm } from "~/utils/auth";

export const loader = authLoaderWithPerm("ViewData", async (args) => {
	const ctx = new BackendContext(args);
	const { request } = args;
	const url = new URL(request.url);
	const query = url.searchParams.get("q") ?? "";

	const assets = await searchAssets(ctx, query);

	return Response.json(assets);
});
