export type WorkflowStatus =
	| "draft"
	| "submitted"
	| "revision_requested"
	| "approved"
	| "rejected"
	| "published";

export type WorkflowEntityType = "hazardous_event" | "disaster_event";

const ALLOWED_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
	draft: ["submitted"],
	submitted: ["approved", "rejected", "revision_requested"],
	revision_requested: ["draft", "submitted"],
	approved: ["published"],
	rejected: [],
	published: [],
};

export function isValidWorkflowTransition(
	from: WorkflowStatus,
	to: WorkflowStatus,
): boolean {
	return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getWorkflowTransitionTargets(
	from: WorkflowStatus,
): WorkflowStatus[] {
	return ALLOWED_TRANSITIONS[from] ?? [];
}

export function normalizeWorkflowStatus(
	status: string | null | undefined,
): WorkflowStatus {
	switch ((status || "").trim()) {
		case "waiting-for-validation":
			return "submitted";
		case "needs-revision":
			return "revision_requested";
		case "validated":
			return "approved";
		case "draft":
		case "submitted":
		case "revision_requested":
		case "approved":
		case "rejected":
		case "published":
			return status as WorkflowStatus;
		default:
			return "draft";
	}
}
