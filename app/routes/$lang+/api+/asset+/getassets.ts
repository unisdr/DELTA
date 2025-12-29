import { BackendContext } from "~/backend.server/context";
import { dr } from "~/db.server";
import { assetTable } from "~/drizzle/schema";
import { authLoaderWithPerm } from "~/util/auth";

export const loader = authLoaderWithPerm("ViewData", async (args) => {
	const ctx = new BackendContext(args);
	const { request } = args;
	const url = new URL(request.url);
	const query = url.searchParams.get("q") ?? "";

	const allAssets = await dr
		.select()
		.from(assetTable)
		.execute()

	for (const row of allAssets) {
		if (row.isBuiltIn) {
			row.name = ctx.dbt({
				type: "asset.name",
				id: String(row.id),
				msg: row.name,
			});
		}
	}

	const filtered = allAssets.filter(row =>
		row.name.toLowerCase().includes(query.toLowerCase())
	);

	return Response.json(filtered);
});
