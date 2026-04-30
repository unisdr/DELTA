import React, { useRef, useState, useEffect, ReactElement } from "react";
import { useNavigation } from "react-router";
import { MainContainer } from "../container";
import { LangLink } from "~/utils/link";
import { Form } from "./form_components";
import { Inputs } from "./inputs";
import { SubmitButton } from "./submit";
import * as repeatablefields from "~/frontend/components/repeatablefields";
import { ViewContext } from "../context";
import { UserForFrontend } from "~/utils/auth";

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
	const isSubmitting =
		navigation.state === "submitting" || navigation.state === "loading";
	let [intClickedCtr, setIntClickedCtr] = useState(0);

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
						<SubmitButton
							id="form-default-submit-button"
							disabled={isSubmitting}
							label={ctx.t({
								code: "common.save",
								msg: "Save",
							})}
						/>

						{props.overrideSubmitMainForm ? (
							props.overrideSubmitMainForm
						) : (
							<>
								{/* <SubmitButton
									id="form-default-submit-button"
									disabled={isSubmitting}
									label={ctx.t({
										"code": "common.save",
										"msg": "Save"
									})}
								/> */}
							</>
						)}
					</div>
				</Form>
			</>
		</MainContainer>
	);
}

