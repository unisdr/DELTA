import {
	dtsSystemInfoTable,
	SelectDtsSystemInfo,
} from "~/drizzle/schema/dtsSystemInfoTable";
import { dr } from "~/db.server";

export async function getSystemInfo(): Promise<SelectDtsSystemInfo | null> {
	const result = await dr.select().from(dtsSystemInfoTable).limit(1);
	return result[0] || null;
}
