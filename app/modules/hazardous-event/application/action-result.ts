export type HazardousEventActionIntent = "create" | "update" | "delete";

export type HazardousEventActionResult =
	| { ok: true; intent: HazardousEventActionIntent; id?: string }
	| { ok: false; error: string };
