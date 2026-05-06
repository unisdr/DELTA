import { authLoaderWithPerm } from "~/utils/auth";
import { stringifyCSV } from "~/utils/csv";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { DivisionRepository } from "~/db/queries/divisonRepository";

// Create a custom loader that enforces tenant isolation
export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { request } = loaderArgs;

		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const rows = (
			await DivisionRepository.getByCountryAccountsId(countryAccountsId)
		)
			.map((row) => ({
				id: row.id,
				importId: row.importId,
				parentId: row.parentId,
				name: row.name,
			}))
			.sort((a, b) => a.id.localeCompare(b.id));

		// Format data for CSV export
		const url = new URL(request.url);
		const parts = url.pathname.split("/").filter((s) => s !== "");
		const typeName = parts.length > 1 ? parts[parts.length - 2] : "";

		if (!rows.length) {
			return new Response(`No data for ${typeName}`, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		const csvData: Array<Record<string, string>> = rows.map((row) => {
			const names = (row.name || {}) as Record<string, string>;
			const item: Record<string, string> = {
				id: valueToCsvString(row.id),
				importId: valueToCsvString(row.importId),
				parentId: valueToCsvString(row.parentId),
			};

			for (const [lang, value] of Object.entries(names)) {
				item[`lang_${lang}`] = valueToCsvString(value);
			}

			return item;
		});

		const headers = Object.keys(csvData[0]).filter(
			(key) => key !== "spatialFootprint" && key !== "attachments",
		);
		const csvRows = csvData.map((item) =>
			headers.map((header) => item[header] || ""),
		);
		const all = [headers, ...csvRows];
		const csv = await stringifyCSV(all);

		return new Response(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${typeName}.csv"`,
			},
		});
	},
);

// Helper function to convert values to CSV string format
function valueToCsvString(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}
