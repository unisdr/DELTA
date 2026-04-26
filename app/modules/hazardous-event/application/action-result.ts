export type HazardousEventActionIntent = "create" | "update" | "delete";

export interface HazardousEventFieldErrors {
	id?: string;
	countryAccountsId?: string;
	nationalSpecification?: string;
	recordOriginator?: string;
	startDate?: string;
	endDate?: string;
	hazardousEventStatus?: string;
	hazardClassification?: string;
}

export type HazardousEventActionResult =
	| { ok: true; intent: HazardousEventActionIntent; id?: string }
	| { ok: false; error: string; fieldErrors?: HazardousEventFieldErrors };
