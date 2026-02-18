import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
} from "~/frontend/form";
import { ViewContext } from "~/frontend/context";

import {
	DevExample1Fields,
	DevExample1ViewModel,
} from "~/backend.server/models/dev_example1";

export const route = "/examples/dev-example1";

interface DevExample1FormProps extends UserFormProps<DevExample1Fields> {
	ctx: ViewContext;
}

export function DevExample1Form(props: DevExample1FormProps) {
	if (!props.fieldDef) {
		throw new Error("fieldDef not passed to DevExample1Form");
	}
	const ctx = props.ctx;
	return (
		<FormView
			ctx={ctx}
			path={route}
			edit={props.edit}
			id={props.id}
			title={ctx.t({ code: "dev_examples", msg: "Dev examples" })}
			editLabel={ctx.t({ code: "dev_example.edit", msg: "Edit dev example" })}
			addLabel={ctx.t({ code: "dev_example.add", msg: "Add dev example" })}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={props.fieldDef}
		/>
	);
}

interface DevExample1ViewProps extends ViewPropsBase<DevExample1Fields> {
	item: DevExample1ViewModel;
}

export function DevExample1View(props: DevExample1ViewProps) {
	return (
		<ViewComponent
			ctx={props.ctx}
			path={route}
			id={props.item.id}
			title="Dev examples"
		>
			<FieldsView def={props.def} fields={props.item} override={{}} />
		</ViewComponent>
	);
}
