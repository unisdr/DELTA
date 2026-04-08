import { dr, type Tx } from "~/db.server";

export type CountryAccountDb = typeof dr;
export type CountryAccountTx = Tx;

export function getCountryAccountDb(): CountryAccountDb {
	return dr;
}
