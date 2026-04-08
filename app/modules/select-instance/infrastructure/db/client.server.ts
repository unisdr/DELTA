import { dr, type Tx } from "~/db.server";

export type SelectInstanceDb = typeof dr;
export type SelectInstanceTx = Tx;

export function getSelectInstanceDb(): SelectInstanceDb {
	return dr;
}
