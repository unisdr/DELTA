import { dr, type Dr } from "~/db.server";

export type { Dr };

export function getAssetDb(): Dr {
	return dr;
}
