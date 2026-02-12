import { pgTable, text } from "drizzle-orm/pg-core";
import { zeroStrMap } from "~/utils/drizzleUtil";

// Hazard Information Profiles (HIPs)
// https://www.preventionweb.net/publication/hazard-information-profiles-hips
// examples:
// Meteorological and Hydrological
// Extraterrestrial
// Geohazards

export const hipTypeTable = pgTable("hip_class", {
	id: text("id").primaryKey(),
	name: zeroStrMap("name"),
});
