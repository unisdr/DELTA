import { sectorTable } from "~/drizzle/schema/sectorTable";

import { dr } from "~/db.server";

import { desc } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";

// TODO: add translations
export const loader = createApiListLoader(
	async () => {
		return dr.$count(sectorTable);
	},
	async (offsetLimit) => {
		return dr.query.sectorTable.findMany({
			...offsetLimit,
			orderBy: [desc(sectorTable.id)],
		});
	},
);
