import {
	HazardousEventFields,
	HazardousEventViewModel,
} from "~/backend.server/models/event";

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FormView,
} from "~/frontend/form";

import { useEffect, useRef, useState } from "react";
import { approvalStatusField2 } from "~/frontend/approval";

import { HazardPicker, Hip } from "~/frontend/hip/hazardpicker";

import { SpatialFootprintFormView } from "~/frontend/spatialFootprintFormView";
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";


import { LangLink } from "~/utils/link";

import { MultiSelect, MultiSelectChangeEvent } from "primereact/multiselect";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

export const route = "/hazardous-event";

const fallbackCtx: any = {
	t: (message: { msg: string }) => message.msg,
	lang: "en",
	url: (path: string) => path,
	user: undefined,
};


export function fieldsDefCommon(
): FormInputDef<HazardousEventFields>[] {
	return [
		approvalStatusField2() as any,
		{
			key: "nationalSpecification",
			label: "National specification",
			type: "textarea",
		},
		{
			key: "startDate",
			label: "Start date",
			type: "date_optional_precision",
			required: true,
			uiRow: {},
		},
		{
			key: "endDate",
			label: "End date",
			type: "date_optional_precision",
			required: true,
		},
		{
			key: "description",
			label: "Description",
			type: "textarea",
			uiRowNew: true,
		},
		{
			key: "chainsExplanation",
			label: "Composite event - chains explanation",
			type: "textarea",
		},
		{
			key: "magnitude",
			label: "Magnitude",
			type: "text",
		},
		{
			key: "spatialFootprint",
			label: "Spatial footprint",
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: "Attachments",
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "recordOriginator",
			label: "Record originator",
			type: "text",
			required: true,
			uiRow: {},
		},
		{
			key: "hazardousEventStatus",
			label: "Hazardous event Status",
			type: "enum",
			enumData: [
				{
					key: "forecasted",
					label: "Forecasted",
				},
				{
					key: "ongoing",
					label: "Ongoing",
				},
				{
					key: "passed",
					label: "Passed",
				},
			],
			uiRowNew: true,
		},
		{
			key: "dataSource",
			label: "Data source",
			type: "text",
		},
		// {
		// 	key: "tableValidatorUserIds",
		// 	label: "",
		// 	type: "table_uuid",
		// },
		{
			key: "tempValidatorUserIds",
			label: "",
			type: "temp_hidden",
		},
		{
			key: "tempAction",
			label: "",
			type: "temp_hidden",
		},
	];
}

export function fieldsDef(): FormInputDef<HazardousEventFields>[] {
	return [
		{ key: "parent", label: "", type: "uuid" },
		{
			key: "hipHazardId",
			label: "Hazard test",
			type: "other",
			uiRow: { colOverride: 1 },
		},
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(),
	];
}

export function fieldsDefApi(
): FormInputDef<HazardousEventFields>[] {
	let fieldsDefTemp = fieldsDef();

	// Remove in the field definitions any properties for key that starts with "table"
	// or type that starts with "temp_hidden"
	const filteredFieldsDef = fieldsDefTemp.filter(
		(item) =>
			!item.key.startsWith("table") && !item.type.startsWith("temp_hidden"),
	);

	return [
		...filteredFieldsDef,
		{ key: "apiImportId", label: "API Import ID", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

interface HazardousEventFormProps extends UserFormProps<HazardousEventFields> {
	divisionGeoJSON?: any;
	ctryIso3?: any;
	hip: Hip;
	parent?: HazardousEventViewModel;
	treeData?: any[];
	usersWithValidatorRole?: any[];
	extraHiddenFields?: any;
	hideInnerHeader?: boolean;
}

export function hazardousEventLabel(args: {
	id?: string;
	description?: string;
	hazard?: { name: string };
}): string {
	let parts: string[] = [];
	if (args.hazard && args.hazard.name) {
		parts.push(args.hazard.name.slice(0, 50));
	}
	if (args.description) {
		parts.push(args.description.slice(0, 50));
	}
	if (args.id) {
		parts.push(args.id.slice(0, 5));
	}
	return parts.join(" ");
}

export function hazardousEventLink(
	args: {
		id: string;
		description: string;
		hazard?: { name: string };
	},
) {
	return (
		<LangLink lang="en" to={`/hazardous-event/${args.id}`}>
			{hazardousEventLabel(args)}
		</LangLink>
	);
}

interface UserValidator {
	name: string;
	id: string;
	email: string;
}

export function HazardousEventForm(props: HazardousEventFormProps) {
	const ctx = fallbackCtx;
	const fields = props.fields;
	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	const [selected, setSelected] = useState(props.parent);
	const [selectedUserValidator, setSelectedUserValidator] =
		useState<UserValidator | null>(null);
	const [selectedAction, setSelectedAction] = useState<string>("submit-draft");

	// How to set default selected users with validator role
	// const [selectedUserValidator, setSelectedUserValidator] = useState<UserValidator | null>([
	// 	usersWithValidatorRole[1], // Example user
	//  usersWithValidatorRole[3]  // Example user
	// ]);
	const usersWithValidatorRole: any[] =
		props.usersWithValidatorRole?.map((user: any) => ({
			name: user.firstName + " " + user.lastName,
			id: user.id,
			email: user.email,
		})) || [];
	// console.log(
	// 	selectedCities.map((c) => c.name).join(", ")
	// );

	const overrideSubmitButton = (
		<>
			<button
				type="button"
				className="mg-button mg-button-primary"
				onClick={(e: any) => {
					e.preventDefault();
					setVisibleModalSubmit(true);
				}}
				style={{
					display: "none",
				}}
			>
				{"Save or submit"}
			</button>
			<button
				type="button"
				className="mg-button mg-button-system"
				onClick={(e: any) => {
					e.preventDefault();
					setVisibleModalDiscard(true);
				}}
				style={{
					display: "none",
				}}
			>
				{"Discard"}
			</button>
		</>
	);

	const [visibleModalSubmit, setVisibleModalSubmit] = useState<boolean>(false);
	const [visibleModalDiscard, setVisibleModalDiscard] =
		useState<boolean>(false);
	const btnRefSubmit = useRef(null);

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelected(event.data.selected);
			}
		};
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [props.id]);

	// Modal submit validation function
	function validateBeforeSubmit(
		selectedAction: string,
		selectedUserValidator: UserValidator | null,
	): boolean {
		// Set the hidden fields before submitting the main form
		const tempActionField = document.getElementById(
			"tempAction",
		) as HTMLInputElement;
		if (tempActionField) {
			tempActionField.value = selectedAction;
		}
		const tempValidatorField = document.getElementById(
			"tempValidatorUserIds",
		) as HTMLInputElement;
		if (tempValidatorField) {
			tempValidatorField.value = "";
		}

		// Require at least one validator
		if (selectedAction === "submit-validation") {
			// if (!selectedUserValidator || (Array.isArray(selectedUserValidator) && selectedUserValidator.length === 0)) {
			// 	alert('Please select at least one validator.');
			// 	return false;
			// }

			// console.log(
			// 	Array.isArray(selectedUserValidator)
			// 		// ? selectedUserValidator.map((c) => c.id)
			// 		? selectedUserValidator.map((c) => c.email).join(",")
			// 		: selectedUserValidator?.email || ""
			// );
			// console.log(
			// 	Array.isArray(selectedUserValidator)
			// 		? selectedUserValidator.map((c) => c.id).join('", "')
			// 		: selectedUserValidator?.id || ""
			// );

			// Extract just the IDs and join them as comma-separated string
			const validatorIds = Array.isArray(selectedUserValidator)
				? selectedUserValidator.map((c) => c.id).join(",")
				: selectedUserValidator?.id || "";

			//const validatorField = document.getElementById("tableValidatorUserIds") as HTMLInputElement;
			if (tempValidatorField) {
				tempValidatorField.value = validatorIds;
			}

			//console.log("validatorIds:", validatorIds);
			//console.log("tempValidatorField.value:", tempValidatorField.value);

			// return false;
		}
		// Add more validation as needed
		const submitBtn = document.getElementById("form-default-submit-button");
		if (submitBtn) {
			(submitBtn as HTMLButtonElement).click();
		}
		return true;
	}

	// const rootData = useRouteLoaderData<typeof rootLoader>("root");
	// console.log("Root loader data in HazardousEventForm:", rootData.common);

	const footerDialogSubmitSave = (
		<div>
			<Button
				ref={btnRefSubmit}
				disabled={
					selectedAction === "submit-validation" &&
					(!selectedUserValidator ||
						(Array.isArray(selectedUserValidator) &&
							selectedUserValidator.length === 0))
				}
				className="mg-button mg-button-primary"
				label={
					selectedAction === "submit-draft"
						? "Save as draft"
						: "Submit for validation"
				}
				style={{ width: "100%" }}
				onClick={() => {
					if (validateBeforeSubmit(selectedAction, selectedUserValidator)) {
						setVisibleModalSubmit(false);
					}
				}}
				autoFocus
			/>
		</div>
	);

	const footerDialogDiscard = (
		<>
			<div>
				<Button
					ref={btnRefSubmit}
					className="mg-button mg-button-primary"
					label={"Save as draft"}
					style={{ width: "100%" }}
					onClick={() => {
						setSelectedAction("submit-draft");
						if (validateBeforeSubmit("submit-draft", selectedUserValidator)) {
							setVisibleModalDiscard(false);
						}
					}}
				/>
			</div>
			<div style={{ marginTop: "10px" }}>
				<Button
					ref={btnRefSubmit}
					className="mg-button mg-button-outline"
					label={"Discard work and exit"}
					style={{ width: "100%" }}
					onClick={() => {
						document.location.href = "/hazardous-event";
					}}
					autoFocus
				/>
			</div>
		</>
	);

	return (
		<>
			<div className="card flex justify-content-center">
				<Dialog
					visible={visibleModalDiscard}
					modal
					header={"Are you sure you want to exit?"}
					footer={footerDialogDiscard}
					style={{ width: "50rem" }}
					onHide={() => {
						if (!visibleModalDiscard) return;
						setVisibleModalDiscard(false);
					}}
				>
					<div>
						<p>
							{"If you leave this page, your work will not be saved."}
						</p>
					</div>
				</Dialog>
				<Dialog
					visible={visibleModalSubmit}
					modal
					header={"Save or submit"}
					footer={footerDialogSubmitSave}
					style={{ width: "50rem" }}
					onHide={() => {
						if (!visibleModalSubmit) return;
						setVisibleModalSubmit(false);
					}}
				>
					<div>
						<p>
							{"Decide what you’d like to do with this data that you’ve added or updated."}
						</p>
					</div>

					<div>
						<ul className="dts-attachments">
							<li
								className="dts-attachments__item"
								style={{ justifyContent: "left" }}
							>
								<div className="dts-form-component">
									<label>
										<div className="dts-form-component__field--horizontal">
											<input
												type="radio"
												name="radiobuttonFieldsetName"
												aria-controls="linkAttachment"
												aria-expanded="false"
												checked={selectedAction === "submit-draft"}
												onChange={() => setSelectedAction("submit-draft")}
											/>
										</div>
									</label>
								</div>
								<div
									style={{
										justifyContent: "left",
										display: "flex",
										flexDirection: "column",
										gap: "4px",
									}}
								>
									<span>
										{"Save as draft"}
									</span>
									<span style={{ color: "#aaa" }}>
										{"Store this entry for future editing"}
									</span>
								</div>
							</li>
							<li
								className="dts-attachments__item"
								style={{ justifyContent: "left" }}
							>
								<div className="dts-form-component">
									<label>
										<div className="dts-form-component__field--horizontal">
											<input
												type="radio"
												name="radiobuttonFieldsetName"
												aria-controls="linkAttachment"
												aria-expanded="false"
												checked={selectedAction === "submit-validation"}
												onChange={() => setSelectedAction("submit-validation")}
											/>
										</div>
									</label>
								</div>
								<div
									style={{
										justifyContent: "left",
										display: "flex",
										flexDirection: "column",
										gap: "10px",
									}}
								>
									<span>
										{"Submit for validation"}
									</span>
									<span style={{ color: "#aaa" }}>
										{"Request this entry to be validated"}
									</span>
									<div>
										*{" "}
										{"Select validator(s)"}
									</div>
									<div>
										<MultiSelect
											filter
											value={selectedUserValidator}
											disabled={selectedAction !== "submit-validation"}
											onChange={(e: MultiSelectChangeEvent) =>
												setSelectedUserValidator(e.value)
											}
											options={usersWithValidatorRole}
											optionLabel="name"
											placeholder={"Select validator(s)"}
											maxSelectedLabels={3}
											className="w-full md:w-20rem"
										/>
									</div>
								</div>
							</li>
						</ul>
					</div>
				</Dialog>
			</div>
			<FormView
				user={props.user}
				path={route}
				edit={props.edit}
				id={props.id}
				hideInnerHeader={props.hideInnerHeader}
				title={"Hazardous events"}
				editLabel={"Edit hazardous event"}
				addLabel={"Add hazardous event"}
				errors={props.errors}
				fields={props.fields}
				fieldsDef={fieldsDef()}
				elementsAfter={{}}
				overrideSubmitMainForm={overrideSubmitButton}
				override={{
					parent: (
						<Field
							key="parent"
							label={"Parent"}
						>
							{selected ? hazardousEventLink(selected) : "-"}&nbsp;
							<LangLink
								lang="en"
								target="_blank"
								rel="opener"
								to={"/hazardous-event/picker"}
								className="mx-2"
							>
								{"Change"}
							</LangLink>
							<button
								className="mg-button mg-button-outline"
								onClick={(e: any) => {
									e.preventDefault();
									setSelected(undefined);
								}}
							>
								{"Unset"}
							</button>
							<input type="hidden" name="parent" value={selected?.id || ""} />
							<FieldErrors errors={props.errors} field="parent"></FieldErrors>
						</Field>
					),
					hipTypeId: null,
					hipClusterId: null,
					hipHazardId: (
						<Field
							key="hazardId"
							label={`${"Hazard classification"} *`}
						>
							<HazardPicker
								hip={props.hip}
								typeId={fields.hipTypeId}
								clusterId={fields.hipClusterId}
								hazardId={fields.hipHazardId}
								required={true}
							/>
							<FieldErrors
								errors={props.errors}
								field="hipHazardId"
							></FieldErrors>
						</Field>
					),
					spatialFootprint: (
						<Field key="spatialFootprint" label="">
							<SpatialFootprintFormView
								divisions={divisionGeoJSON}
								ctryIso3={ctryIso3 || ""}
								treeData={treeData ?? []}
								initialData={fields?.spatialFootprint}
							/>
						</Field>
					),
					attachments: (
						<Field key="attachments" label="">
							<AttachmentsFormView
								save_path_temp={TEMP_UPLOAD_PATH}
								file_viewer_temp_url={`/${ctx.lang}/hazardous-event/file-temp-viewer`}
								file_viewer_url="/hazardous-event/file-viewer"
								api_upload_url="/hazardous-event/file-pre-upload"
								initialData={fields?.attachments}
							/>
						</Field>
					),
				}}
			/>
		</>
	);
}
