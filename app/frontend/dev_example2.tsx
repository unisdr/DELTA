import {
	UserFormProps,
	FieldsView,
	ViewComponent,
	FormView,
	ViewPropsBase,
} from "~/frontend/form";
import { ViewContext } from "~/frontend/context";

import {
	DevExample2Fields,
	DevExample2ViewModel,
} from "~/backend.server/models/dev_example2";
import { Steps } from "primereact/steps";
import { useNavigation, useLocation } from "react-router";

export const route = "/examples/dev-example2";
export const TOTAL_STEPS = 3;

interface DevExample2FormProps extends UserFormProps<DevExample2Fields> {
	ctx: ViewContext;
	activeStep?: number;
	totalSteps?: number;
	onStepChange?: (step: number) => void;
}

export function DevExample2Form(props: DevExample2FormProps) {
	if (!props.fieldDef) {
		throw new Error("fieldDef not passed to DevExample2Form");
	}
	const ctx = props.ctx;

	const activeStep = props.activeStep || 1;
	const totalSteps = props.totalSteps || TOTAL_STEPS;
	const onStepChange = props.onStepChange || (() => {});

	const navigation = useNavigation();
	const location = useLocation();
	const isSubmitting =
		navigation.state === "submitting" || navigation.state === "loading";

	const stepperItems = [
		{ label: ctx.t({ code: "dev_example2.step1", msg: "Basic Info" }) },
		{ label: ctx.t({ code: "dev_example2.step2", msg: "Additional Data" }) },
		{ label: ctx.t({ code: "dev_example2.step3", msg: "Review & Submit" }) },
	];

	const handleStepClick = (index: number) => {
		onStepChange(index + 1);
	};

	const isLastStep = activeStep === totalSteps;

	const currentPath = location.pathname;
	const draftAction = `${currentPath}?step=${activeStep}&_saveAction=draft`;
	const nextAction = `${currentPath}?step=${activeStep}&_saveAction=next`;

	const submitButtons = (
		<div className="dts-form__actions" style={{ display: "flex", gap: "1rem" }}>
			<button
				id="form-save-draft-button"
				disabled={isSubmitting}
				className="mg-button mg-button-primary"
				type="submit"
				formAction={draftAction}
			>
				{ctx.t({
					code: "common.save_draft",
					msg: "Save as Draft",
				})}
			</button>
			{!isLastStep && (
				<button
					id="form-save-next-button"
					disabled={isSubmitting}
					className="mg-button mg-button-secondary"
					type="submit"
					formAction={nextAction}
				>
					{ctx.t({
						code: "common.save_and_continue",
						msg: "Save & Continue",
					})}
				</button>
			)}
		</div>
	);

	return (
		<div>
			<div className="card mb-4">
				<Steps
					model={stepperItems}
					activeIndex={activeStep - 1}
					onSelect={(e) => handleStepClick(e.index)}
					readOnly={false}
				/>
			</div>
			<FormView
				ctx={ctx}
				path={route}
				edit={props.edit}
				id={props.id}
				title={ctx.t({ code: "dev_examples2", msg: "Dev examples 2" })}
				editLabel={ctx.t({
					code: "dev_example2.edit",
					msg: "Edit dev example 2",
				})}
				addLabel={ctx.t({ code: "dev_example2.add", msg: "Add dev example 2" })}
				errors={props.errors}
				fields={props.fields}
				fieldsDef={props.fieldDef}
				overrideSubmitMainForm={submitButtons}
			/>
		</div>
	);
}

interface DevExample2ViewProps extends ViewPropsBase<DevExample2Fields> {
	item: DevExample2ViewModel;
}

export function DevExample2View(props: DevExample2ViewProps) {
	return (
		<ViewComponent
			ctx={props.ctx}
			path={route}
			id={props.item.id}
			title="Dev examples 2"
		>
			<FieldsView def={props.def} fields={props.item} override={{}} />
		</ViewComponent>
	);
}
