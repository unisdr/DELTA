import { authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { makeExportGeographicLevelsCsvUseCase } from "~/modules/geographic-levels/geographic-levels-module.server";

// Create a custom loader that enforces tenant isolation
export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { request } = loaderArgs;

		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		// Format data for CSV export
		const url = new URL(request.url);
		const parts = url.pathname.split("/").filter((s) => s !== "");
		const typeName = parts.length > 1 ? parts[parts.length - 2] : "";

		return makeExportGeographicLevelsCsvUseCase().execute({
			countryAccountsId,
			typeName,
		});
	},
);
