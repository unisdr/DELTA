import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import {
	fetchData,
	getTotalRecords,
} from "~/components/ContentPicker/DataSource";
import { contentPickerConfigSector } from "~/routes/$lang+/disaster-record+/content-picker-config";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs: any) => {
		const { request } = loaderArgs;
		const url = new URL(request.url);
		const searchQuery =
			url.searchParams.get("query")?.trim().toLowerCase() || "";
		const page = parseInt(url.searchParams.get("page") || "1", 10);
		const limit = parseInt(url.searchParams.get("limit") || "10", 10);
		const ctx = new BackendContext(loaderArgs);

		const config = contentPickerConfigSector(ctx);

		try {
			const results = await fetchData(ctx, config, searchQuery, page, limit);
			const totalRecords = await getTotalRecords(config, searchQuery);

			return Response.json({ data: results, totalRecords, page, limit });
		} catch (error) {
			console.error("Error fetching data:", error);
			return Response.json({ error: "Error fetching data" }, { status: 500 });
		}
	},
);
