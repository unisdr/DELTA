import { stringifyCSV } from "~/utils/csv";
import type { GeographicLevelRepositoryPort } from "~/modules/geographic-levels/domain/repositories/geographic-level-repository";

interface ExportGeographicLevelsCsvInput {
	countryAccountsId: string;
	typeName: string;
}

function valueToCsvString(value: any): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

export class ExportGeographicLevelsCsvUseCase {
	constructor(private readonly repository: GeographicLevelRepositoryPort) {}

	async execute(input: ExportGeographicLevelsCsvInput): Promise<Response> {
		const rows = await this.repository.listForCsv(input.countryAccountsId);

		if (!rows.length) {
			return new Response(`No data for ${input.typeName}`, {
				headers: { "Content-Type": "text/plain" },
			});
		}

		const res: any[] = [];
		for (const row of rows) {
			const r: any = {
				id: row.id,
				importId: row.importId,
				parentId: row.parentId,
			};
			for (const lang in row.name) {
				r[`lang_${lang}`] = row.name[lang];
			}
			res.push(r);
		}

		const headers: string[] = Object.keys(res[0]).filter(
			(k) => k !== "spatialFootprint" && k !== "attachments",
		);
		const csvRows = res.map((item) =>
			headers.map((h) => valueToCsvString(item[h])),
		);

		const csv = await stringifyCSV([headers, ...csvRows]);

		return new Response(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${input.typeName}.csv"`,
			},
		});
	}
}
