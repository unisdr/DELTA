export type DisasterEventActionIntent = "create" | "update" | "delete";

export type DisasterEventActionResult =
	| {
			ok: true;
			intent: DisasterEventActionIntent;
			id?: string;
	  }
	| {
			ok: false;
			error: string;
	  };
