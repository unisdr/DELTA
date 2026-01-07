import { DisasterRecordsFields, DisasterRecordsViewModel } from "~/backend.server/models/disaster_record"

import { formatDate } from "~/util/date";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import { useEffect } from 'react';
import { approvalStatusField } from "~/frontend/approval";

import { ViewContext } from "~/frontend/context";


import { LangLink } from "~/util/link";

export const route = "/disaster-record"

export const fieldsDefCommon = [
	approvalStatusField,
	{ key: "disasterEventId", label: "Disaster event", type: "text", required: true },
] as const;

export const fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
	...fieldsDefCommon
];

// Use Partial and type assertions to ensure type safety
export const fieldsDefView: FormInputDef<Partial<DisasterRecordsViewModel>>[] = [
	...fieldsDefCommon as unknown as FormInputDef<Partial<DisasterRecordsViewModel>>[],
	{ key: "createdAt" as keyof DisasterRecordsViewModel, label: "", type: "other" },
	{ key: "updatedAt" as keyof DisasterRecordsViewModel, label: "", type: "other" },
];

interface DisasterRecordsFormProps extends UserFormProps<DisasterRecordsFields> {
	parent?: DisasterRecordsViewModel;
}

export function disasterRecordsLabel(args: {
	id?: string;
	disasterEventId?: string;
}): string {
	const disasterEventId = args.disasterEventId;
	const shortId = args.id ? " " + args.id.slice(0, 8) : "";
	return disasterEventId + " " + shortId;
}

export function disasterRecordsLongLabel(args: {
	id?: string;
	disasterEventId?: string;
}) {
	return <ul>
		<li>ID: {args.id}</li>
		<li>Disaster event: {args.disasterEventId || "-"}</li>
	</ul>
}
export function disasterRecordsLink(ctx: ViewContext, args: {
	id: string;
	disasterEventId: string;
}) {
	return <LangLink lang={ctx.lang} to={`/disaster-record/${args.id}`}>
		{disasterRecordsLabel(args)}
	</LangLink>
}

export function DisasterRecordsForm(props: DisasterRecordsFormProps) {

	const ctx = props.ctx;

	useEffect(() => {
	}, []);

	return (<>
		<FormView
			ctx={props.ctx}
			path={route}
			edit={props.edit}
			id={props.id}
			title={ctx.t({ "code": "disaster_records", "msg": "Disaster records" })}
			editLabel={ctx.t({ "code": "disaster_records.edit", "msg": "Edit disaster record" })}
			addLabel={ctx.t({ "code": "disaster_records.add", "msg": "Add disaster record" })}

			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef}
		/>
	</>);
}

interface DisasterRecordsViewProps {
	ctx: ViewContext;
	item: DisasterRecordsViewModel;
	isPublic: boolean;
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const ctx = props.ctx;
	const item = props.item;

	return (
		<ViewComponent
			ctx={props.ctx}
			isPublic={props.isPublic}
			path={route}
			id={item?.id || ''}
			title={ctx.t({
				"code": "disaster_records",
				"msg": "Disaster records"
			})}
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				override={{
					createdAt: (
						<p key="createdAt">
							{ctx.t({
								"code": "common.created_at",
								"msg": "Created at"
							})}: {item?.createdAt ? formatDate(item.createdAt) : ctx.t({
								"code": "common.not_available",
								"msg": "N/A"
							})}
						</p>
					),
					updatedAt: (
						<p key="updatedAt">
							{ctx.t({
								"code": "common.updated_at",
								"msg": "Updated at"
							})}: {item?.updatedAt ? formatDate(item.updatedAt) : ctx.t({
								"code": "common.not_available",
								"msg": "N/A"
							})}
						</p>
					),
				}}
			/>
		</ViewComponent>
	);
}


