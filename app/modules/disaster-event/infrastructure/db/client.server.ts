import { dr, type Dr } from "~/db.server";

export type { Dr };

export function getDisasterEventDb(): Dr {
	return dr;
}
