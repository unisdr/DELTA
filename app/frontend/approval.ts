export type approvalStatusIds =
	| "draft"
	| "waiting-for-validation"
	| "needs-revision"
	| "validated"
	| "published";

export const approvalStatusField = {
	key: "approvalStatus",
	label: "Record status",
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

export function approvalStatusField2() {
	return {
		key: "approvalStatus",
		label: "Record status",
		type: "approval_status",
		enumData: [
			{
				key: "draft",
				label: "Draft",
			},
			{
				key: "waiting-for-validation",
				label: "Waiting for validation",
			},
			{
				key: "needs-revision",
				label: "Needs revision",
			},
			{
				key: "validated",
				label: "Validated",
			},
			{
				key: "published",
				label: "Published",
			},
		],
		uiRowNew: true,
	};
}

export function approvalStatusKeyToLabel(key: string): string {
	const field = approvalStatusField2();
	const option = field.enumData.find((item) => item.key === key);
	return option ? option.label : key;
}
