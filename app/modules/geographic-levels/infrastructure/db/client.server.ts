import { dr, type Dr } from "~/db.server";

export type { Dr };

export function getGeographicLevelsDb(): Dr {
	return dr;
}
