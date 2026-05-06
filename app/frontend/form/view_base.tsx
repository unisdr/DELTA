import React from "react";
import { ViewContext } from "../context";
import { formScreen } from "./form_components";

interface FormScreenProps<T> {
	loaderData: { item: T | null };
	ctx: ViewContext;
	formComponent: any;
	extraData?: any;
}

export function FormScreen<T>(props: FormScreenProps<T>) {
	const fieldsInitial = props.loaderData.item ? props.loaderData.item : {};

	return formScreen({
		ctx: props.ctx,
		extraData: props.extraData || {},
		fieldsInitial,
		form: props.formComponent,
		edit: !!props.loaderData.item,
		id: (props.loaderData.item as any)?.id || null,
	});
}

interface ViewScreenPublicApprovedProps<T> {
	loaderData: {
		item: T;
		isPublic: boolean;
		auditLogs?: any[];
	};
	ctx: ViewContext;
	viewComponent: React.ComponentType<{
		ctx: ViewContext;
		item: T;
		isPublic: boolean;
		auditLogs?: any[];
	}>;
}

export function ViewScreenPublicApproved<T>(
	props: ViewScreenPublicApprovedProps<T>,
) {
	let ViewComponent = props.viewComponent;
	const ld = props.loaderData;
	if (!ld.item) {
		throw "invalid";
	}
	if (ld.isPublic === undefined) {
		throw "loader does not expose isPublic";
	}
	return (
		<ViewComponent
			ctx={props.ctx}
			isPublic={ld.isPublic}
			item={ld.item}
			auditLogs={ld.auditLogs}
		/>
	);
}

