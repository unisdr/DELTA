import { eq } from "drizzle-orm";
import { dr } from "~/db.server";
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";

export async function countHazardousEventsByCountryAccountsId(
	countryAccountsId: string,
): Promise<number> {
	return dr.$count(
		hazardousEventTable,
		eq(hazardousEventTable.countryAccountsId, countryAccountsId),
	);
}
