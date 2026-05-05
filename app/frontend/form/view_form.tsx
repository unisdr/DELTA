import React, { useRef, useState, useEffect, ReactElement } from "react";
import { useNavigation, useLocation } from "react-router";
import { MainContainer } from "../container";
import { LangLink } from "~/utils/link";
import { Form } from "./form_components";
import { Inputs } from "./inputs";
import { SubmitButton } from "./submit";
import * as repeatablefields from "~/frontend/components/repeatablefields";
import { ViewContext } from "../context";
import { UserForFrontend } from "~/utils/auth";
import { Steps } from "primereact/steps";

interface FormViewProps {
	ctx: ViewContext;

	path: string;
	listUrl?: string;
	viewUrl?: string;
	edit: boolean;
	id?: any;
	infoNodes?: React.ReactNode;
	errors: any;
	fields: any;
	fieldsDef: any;
	override?: Record<string, ReactElement | undefined | null>;
	elementsAfter?: Record<string, ReactElement>;
	formRef?: React.Ref<HTMLFormElement>;
	user?: UserForFrontend;

	title: string;
	editLabel: string;
	addLabel: string;

	overrideSubmitMainForm?: React.ReactElement;
	hideDefaultSubmit?: boolean;

	activeStep?: number;
	totalSteps?: number;
	pageLabels?: string[];
}

export function FormView(props: FormViewProps) {
	if (!props.fieldsDef) {
		throw new Error("props.fieldsDef not passed to FormView");
	}
	if (!Array.isArray(props.fieldsDef)) {
		console.log("props.fieldsDef", props.fieldsDef);
		throw new Error("props.fieldsDef must be an array");
	}
	let ctx = props.ctx;
	const title = props.title;

	let inputsRef = useRef<HTMLDivElement>(null);
	const navigation = useNavigation();
	const location = useLocation();
	const isSubmitting =
		navigation.state === "submitting" || navigation.state === "loading";
	let [intClickedCtr, setIntClickedCtr] = useState(0);

	const activeStep = props.activeStep || 1;
	const totalSteps = props.totalSteps || 1;
	const isLastStep = activeStep === totalSteps;
	const isFirstStep = activeStep === 1;

	const currentPath = location.pathname;
	const draftAction = `${currentPath}?step=${activeStep}&_saveAction=draft`;
	const nextAction = `${currentPath}?step=${activeStep}&_saveAction=next`;
	const prevAction = `${currentPath}?step=${activeStep}&_saveAction=prev`;

	const stepperItems = Array.from({ length: totalSteps }, (_, i) => ({
		label:
			props.pageLabels?.[i] ||
			ctx.t({ code: `common.step${i + 1}`, msg: `Step ${i + 1}` }),
	}));

	const hasStepper = totalSteps > 1;

	useEffect(() => {
		const formElement = document.querySelector<HTMLFormElement>(".dts-form");
		const formElementSubmit = document.querySelector<HTMLButtonElement>(
			"#form-default-submit-button",
		);
		let opts = { inputsRef, defs: props.fieldsDef };
		repeatablefields.attach(opts);

		const handleSubmit = () => {
			if (formElementSubmit) {
				formElementSubmit.setAttribute("disabled", "true");

				// Call the function after 2 seconds, then remove the disabled attribute
				setTimeout(() => {
					formElementSubmit.removeAttribute("disabled");
					intClickedCtr++;
					setIntClickedCtr(intClickedCtr);
				}, 2000);
			}
		};

		return () => {
			if (formElement) {
				formElement.removeEventListener("submit", handleSubmit);
			}
		};
	}, [intClickedCtr, isSubmitting]);

	return (
		<MainContainer title={title}>
			<>
				{hasStepper && (
					<div className="card mb-4">
						<Steps
							model={stepperItems}
							activeIndex={activeStep - 1}
							readOnly={true}
						/>
					</div>
				)}
				<section className="dts-page-section">
					<p>
						<LangLink lang={ctx.lang} to={props.listUrl || props.path}>
							{title}
						</LangLink>
					</p>
					{props.edit && props.id && (
						<p>
							<LangLink
								lang={ctx.lang}
								to={props.viewUrl || `${props.path}/${props.id}`}
							>
								{ctx.t({
									code: "common.view",
									msg: "View",
								})}
							</LangLink>
						</p>
					)}
					<h2>{props.edit ? props.editLabel : props.addLabel}</h2>
					{props.edit && props.id && (
						<p>
							{ctx.t({
								code: "common.id",
								msg: "ID",
							})}
							: {String(props.id)}
						</p>
					)}
					{props.infoNodes}
				</section>

				<Form
					ctx={props.ctx}
					formRef={props.formRef}
					errors={props.errors}
					className="dts-form"
					id={props.id ? `${props.id}` : "form-new"}
				>
					<div ref={inputsRef}>
						<Inputs
							key={props.id}
							ctx={ctx}
							user={props.user}
							def={props.fieldsDef}
							fields={props.fields}
							errors={props.errors}
							override={props.override}
							elementsAfter={props.elementsAfter}
							id={props.id}
						/>
					</div>
					<div className="dts-form__actions">
						{hasStepper ? (
							<>
								{isLastStep ? (
									<button
										id="form-save-last-button"
										disabled={isSubmitting}
										className="mg-button mg-button-primary"
										type="submit"
										formAction={nextAction}
									>
										{ctx.t({
											code: "common.save",
											msg: "Save",
										})}
									</button>
								) : (
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
								<button
									id="form-save-draft-button"
									disabled={isSubmitting}
									className="mg-button mg-button-secondary"
									type="submit"
									formAction={draftAction}
								>
									{ctx.t({
										code: "common.save_draft",
										msg: "Save as Draft",
									})}
								</button>
								{!isFirstStep && (
									<button
										id="form-save-prev-button"
										disabled={isSubmitting}
										className="mg-button mg-button-secondary"
										type="submit"
										formAction={prevAction}
									>
										{ctx.t({
											code: "common.save_and_previous",
											msg: "Save & Previous",
										})}
									</button>
								)}
							</>
						) : (
							!props.hideDefaultSubmit && (
								<SubmitButton
									id="form-default-submit-button"
									disabled={isSubmitting}
									label={ctx.t({
										code: "common.save",
										msg: "Save",
									})}
								/>
							)
						)}

						{props.overrideSubmitMainForm && props.overrideSubmitMainForm}
					</div>
				</Form>
			</>
		</MainContainer>
	);
}
