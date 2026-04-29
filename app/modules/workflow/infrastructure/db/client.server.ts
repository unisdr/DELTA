import { dr, type Dr } from "~/db.server";

export type { Dr };

export function getWorkflowDb(): Dr {
	return dr;
}
