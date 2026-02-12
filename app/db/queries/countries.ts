import { dr } from "~/db.server";
import { countriesTable, SelectCountries } from "~/drizzle/schema/countriesTable";
import { eq } from "drizzle-orm";

export async function getCountries() {
	return dr.select().from(countriesTable).execute();
}

export async function getCountryById(id: string): Promise<SelectCountries | null> {
	const result = await dr.select().from(countriesTable).where(eq(countriesTable.id, id)).execute();
	return result[0] || null;
}
