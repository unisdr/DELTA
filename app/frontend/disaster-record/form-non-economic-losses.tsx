import {
	DisasterRecordsFields,
	DisasterRecordsViewModel,
} from "~/backend.server/models/disaster_record";

import { formatDate } from "~/utils/date";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent,
} from "~/frontend/form";

import { useEffect } from "react";
import { approvalStatusField } from "~/frontend/approval";



import { LangLink } from "~/utils/link";
import { ViewContext } from "~/frontend/context";

export const route = "/disaster-record";

export const fieldsDefCommon = [
	approvalStatusField,
	{
		key: "disasterEventId",
		label: "Disaster event",
		type: "text",
		required: true,
	},
] as const;

export const fieldsDef: FormInputDef<DisasterRecordsFields>[] = [
	...fieldsDefCommon,
];

// Use Partial and type assertions to ensure type safety
export const fieldsDefView: FormInputDef<Partial<DisasterRecordsViewModel>>[] =
	[
		...(fieldsDefCommon as unknown as FormInputDef<
			Partial<DisasterRecordsViewModel>
		>[]),
		{
			key: "createdAt" as keyof DisasterRecordsViewModel,
			label: "",
			type: "other",
		},
		{
			key: "updatedAt" as keyof DisasterRecordsViewModel,
			label: "",
			type: "other",
		},
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

export function disasterRecordsLink(
	args: {
		id: string;
		disasterEventId: string;
	},
) {
	return (
		<LangLink lang="en" to={`/disaster-record/${args.id}`}>
			{disasterRecordsLabel(args)}
		</LangLink>
	);
}

export function DisasterRecordsForm(props: DisasterRecordsFormProps) {

	useEffect(() => { }, []);

	return (
		<>
			<FormView
				path={route}
				edit={props.edit}
				id={props.id}
				title={"Disaster records"}
				editLabel={"Edit disaster record"}
				addLabel={"Add disaster record"}
				errors={props.errors}
				fields={props.fields}
				fieldsDef={fieldsDef}
			/>
		</>
	);
}

interface DisasterRecordsViewProps {
	ctx?: ViewContext;
	item: DisasterRecordsViewModel;
	isPublic: boolean;
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const item = props.item;

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item?.id || ""}
			title={"Disaster records"}
		>
			<FieldsView
				def={fieldsDefView}
				fields={item}
				override={{
					createdAt: (
						<p key="createdAt">
							{"Created at"}
							:{" "}
							{item?.createdAt
								? formatDate(item.createdAt)
								: "N/A"}
						</p>
					),
					updatedAt: (
						<p key="updatedAt">
							{"Updated at"}
							:{" "}
							{item?.updatedAt
								? formatDate(item.updatedAt)
								: "N/A"}
						</p>
					),
				}}
			/>
		</ViewComponent>
	);
}

