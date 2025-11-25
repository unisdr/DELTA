import { DContext } from "~/util/dcontext";

export type approvalStatusIds =
	| "draft"
	| "waiting-for-validation"
	| "needs-revision"
	| "validated"
	| "published";

export const approvalStatusField = {
	key: "approvalStatus",
	label: "Record Status",
	type: "approval_status",
	enumData: [
		{ key: "draft", label: "Draft" },
		{
			key: "waiting-for-validation",
			label: "Waiting for validation",
		},
		{ key: "needs-revision", label: "Needs revision" },
		{ key: "validated", label: "Validated" },
		{ key: "published", label: "Published" },
	],
	uiRowNew: true,
} as const;

export function approvalStatusField2(ctx: DContext) {
	return {
		key: "approvalStatus",
		label: ctx.t({
			"code": "approval_status.label",
			"desc": "Label for the approval status field",
			"msg": "Record Status"
		}),
		type: "approval_status",
		enumData: [
			{
				key: "draft",
				label: ctx.t({
					"code": "approval_status.draft",
					"desc": "Approval status field: draft",
					"msg": "Draft"
				})
			},
			{
				key: "waiting-for-validation",
				label: ctx.t({
					"code": "approval_status.waiting_for_validation",
					"desc": "Approval status field: waiting for validation",
					"msg": "Waiting for validation"
				})
			},
			{
				key: "needs-revision",
				label: ctx.t({
					"code": "approval_status.needs_revision",
					"desc": "Approval status field: needs revision",
					"msg": "Needs revision"
				})
			},
			{
				key: "validated",
				label: ctx.t({
					"code": "approval_status.validated",
					"desc": "Approval status field: validated",
					"msg": "Validated"
				})
			},
			{
				key: "published",
				label: ctx.t({
					"code": "approval_status.published",
					"desc": "Approval status field: published",
					"msg": "Published"
				})
			},
		],
		uiRowNew: true,
	}
}
