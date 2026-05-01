import React, { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { MainContainer } from "../container";
import { LangLink } from "~/utils/link";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Checkbox } from "primereact/checkbox";
import { ViewContext } from "../context";
import { approvalStatusIds, approvalStatusKeyToLabel } from "~/frontend/approval";
import { canEditRecord } from "../user/roles";

interface ViewComponentMainDataCollectionProps {
	ctx: ViewContext;
	isPublic?: boolean;
	path: string;
	listUrl?: string;
	id: any;
	title: string;
	extraActions?: React.ReactNode;
	extraInfo?: React.ReactNode;
	children?: React.ReactNode;
	approvalStatus?: approvalStatusIds;
	recordTitle?: string;
	recordDate?: string;
	recordRecipient?: string;
}

export function ViewComponentMainDataCollection(
	props: ViewComponentMainDataCollectionProps,
) {
	const ctx = props.ctx;
	const [selectedAction, setSelectedAction] =
		useState<string>("submit-validate");
	const [visibleModalSubmit, setVisibleModalSubmit] = useState<boolean>(false);
	const [checked, setChecked] = useState(false);

	const btnRefSubmit = useRef(null);
	const actionLabels: Record<string, string> = {
		"submit-validate": ctx.t({
			code: "common.validate_record",
			msg: "Validate record",
		}),
		"submit-publish": ctx.t({
			code: "common.validate_and_publish_record",
			msg: "Validate and publish record",
		}),
		"submit-reject": ctx.t({
			code: "common.return_record",
			msg: "Return record",
		}),
	};
	const [textAreaText, setText] = useState("");
	const textAreaMaxLength = 500;
	const fetcher = useFetcher<{ ok: boolean; message: string }>();
	const [visibleModalConfirmation, setVisibleModalConfirmation] =
		useState<boolean>(false);
	const formRef = useRef<HTMLFormElement>(null);

	// Modal submit validation function
	function validateBeforeSubmit(selectedAction: string): boolean {
		const formTextAreaReject = document.getElementById(
			"reject-comments-textarea",
		) as HTMLTextAreaElement | null;
		const formTextAreaRejectValue =
			formTextAreaReject?.value.toString().trim() || "";

		const formData = new FormData();
		formData.append("action", selectedAction);
		formData.append("id", props.id);
		formData.append("rejection-comments", formTextAreaRejectValue);

		// Client-side validation only for submit-reject action
		if (!formTextAreaRejectValue && selectedAction === "submit-reject") {
			alert("Provide comments for changes needed for this record");
			return false;
		}

		// Programmatically submit via fetcher
		fetcher.submit(formData, { method: "post" });

		return false;
	}

	// React to fetcher response
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data) {
			if (fetcher.data.ok) {
				// Perform success action
				console.log("Success:", fetcher.data.message);
				setVisibleModalSubmit(false);
				setVisibleModalConfirmation(true);
			} else {
				// Perform failure action
				console.error("Error:", fetcher.data.message);
				alert("Something went wrong.");
			}
		}
	}, [fetcher.state, fetcher.data]);

	return (
		<>
			<fetcher.Form method="post" ref={formRef}>
				<div className="card flex justify-content-center">
					<Dialog
						visible={visibleModalConfirmation}
						modal={true}
						header={
							selectedAction === "submit-reject"
								? ctx.t({
									code: "common.returned_with_comments",
									msg: "Returned with comments",
								})
								: ctx.t({
									code: "common.successfully_validated",
									msg: "Successfully validated",
								})
						}
						style={{ width: "50rem" }}
						onHide={() => {
							if (!visibleModalConfirmation) return;
							setVisibleModalConfirmation(false);
						}}
					>
						<div>
							<p>
								{selectedAction === "submit-reject"
									? ctx.t({
										code: "common.returned_to_submitter_for_changes",
										msg: "The event below has been returned to the submitter for changes",
									})
									: ctx.t({
										code: "common.validated_and_ready_to_publish",
										msg: "The event below has been validated and is ready to be published",
									})}
							</p>

							{props.recordTitle && <p>{props.recordTitle}</p>}

							{props.recordDate && <p>{props.recordDate}</p>}

							<p>
								{ctx.t({ code: "common.status", msg: "Status" })}:{" "}
								<span
									className={`dts-status dts-status--${props.approvalStatus}`}
								></span>{" "}
								{props.approvalStatus
									? approvalStatusKeyToLabel(ctx, props.approvalStatus)
									: ""}
							</p>

							{props.recordRecipient && (
								<p>
									{ctx.t({ code: "common.recipient", msg: "Recipient" })}:{" "}
									{props.recordRecipient}
								</p>
							)}
						</div>
						<div>
							<Button
								className="mg-button mg-button-primary"
								label={ctx.t({
									code: "common.view_this_event",
									msg: "View this event",
								})}
								style={{ width: "100%", marginBottom: "10px" }}
								onClick={() => {
									// Close modal to view the event
									setVisibleModalConfirmation(false);
								}}
							/>
							<Button
								className="mg-button mg-button-outline"
								label={ctx.t({
									code: "common.view_all_events",
									msg: "View all events",
								})}
								style={{ width: "100%" }}
								onClick={() => {
									// Navigate to all events page
									document.location.href = ctx.url(props.path);
								}}
							/>
						</div>
					</Dialog>
					<Dialog
						visible={visibleModalSubmit}
						modal
						header={ctx.t({
							code: "common.validate_or_return",
							msg: "Validate or Return",
						})}
						style={{ width: "50rem" }}
						onHide={() => {
							if (!visibleModalSubmit) return;
							setVisibleModalSubmit(false);
						}}
					>
						<div>
							<p>
								{ctx.t({
									code: "common.validate_or_return_instructions",
									msg: "Select an option below to either validate or reject the data record. Once selected, the status of the record will be updated in the list.",
								})}
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
													id="radiobuttonValidateReturn-validate"
													type="radio"
													name="radiobuttonValidateReturn"
													value="submit-validate"
													aria-controls="linkAttachment"
													aria-expanded="false"
													checked={
														selectedAction === "submit-validate" ||
														selectedAction === "submit-publish"
													}
													onChange={() => {
														setSelectedAction("submit-validate");
													}}
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
											{ctx.t({ code: "common.validate", msg: "Validate" })}
										</span>
										<span style={{ color: "#999" }}>
											{ctx.t({
												code: "common.validate_description",
												msg: "This indicates that the event has been checked for accuracy.",
											})}
										</span>

										<div style={{ display: "block" }}>
											<div
												style={{
													width: "40px",
													marginTop: "10px",
													float: "left",
												}}
											>
												<Checkbox
													id="publish-checkbox"
													name="publish-checkbox"
													value="submit-publish"
													onChange={(e) => {
														if (e.checked === undefined) return;
														else if (!e.checked) {
															setSelectedAction("submit-validate");
															setChecked(false);
														} else {
															setChecked(true);
															setSelectedAction("submit-publish");
														}
													}}
													checked={checked}
												></Checkbox>
											</div>
											<div style={{ marginLeft: "20px", marginTop: "10px" }}>
												<div>
													{ctx.t({
														code: "common.publish_undrr_instance",
														msg: "Publish to UNDRR instance",
													})}
												</div>

												<span style={{ color: "#999" }}>
													{ctx.t({
														code: "common.publish_undrr_instance_description",
														msg: "Data from this event will be made publicly available.",
													})}
												</span>
											</div>
										</div>
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
													id="radiobuttonValidateReturn-reject"
													type="radio"
													name="radiobuttonValidateReturn"
													value="submit-reject"
													aria-controls="linkAttachment"
													aria-expanded="false"
													checked={selectedAction === "submit-reject"}
													onChange={() => {
														setChecked(false);
														setSelectedAction("submit-reject");
													}}
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
											{ctx.t({
												code: "common.return_with_comments",
												msg: "Return with comments",
											})}
										</span>
										<span style={{ color: "#999" }}>
											{ctx.t({
												code: "common.return_with_comments_description",
												msg: "This event will be returned to the submitter to make changes and re-submit for approval.",
											})}
										</span>
										<textarea
											required={true}
											id="reject-comments-textarea"
											name="reject-comments-textarea"
											disabled={
												selectedAction !== "" &&
												selectedAction !== "submit-reject"
											}
											value={textAreaText}
											onChange={(e) => setText(e.target.value)}
											maxLength={textAreaMaxLength}
											style={{ width: "100%", minHeight: "100px" }}
											placeholder={ctx.t({
												code: "common.provide_comments",
												msg: "Provide comments for changes needed to this record",
											})}
										></textarea>
										<div
											style={{
												textAlign: "right",
												color: textAreaText.length > 450 ? "red" : "#000",
											}}
										>
											{textAreaText.length}/{textAreaMaxLength}
											{ctx.t({ code: "common.characters", msg: "characters" })}
										</div>
									</div>
								</li>
								<li>
									<div>
										<Button
											ref={btnRefSubmit}
											disabled={
												fetcher.state === "submitting" ||
												fetcher.state === "loading" ||
												(selectedAction === "submit-reject" &&
													textAreaText.trim() === "")
											}
											className="mg-button mg-button-primary"
											label={
												actionLabels[selectedAction] ||
												ctx.t({
													code: "common.validate_record",
													msg: "Validate record",
												})
											}
											style={{ width: "100%" }}
											onClick={() => {
												if (validateBeforeSubmit(selectedAction)) {
													setVisibleModalSubmit(false);
												}
											}}
										/>
									</div>
								</li>
							</ul>
						</div>
					</Dialog>
				</div>
			</fetcher.Form>
			<MainContainer title={props.title}>
				<>
					<form className="dts-form">
						<p>
							<LangLink lang={ctx.lang} to={props.listUrl || props.path}>
								{props.title}
							</LangLink>
						</p>
						{!props.isPublic && (
							<>
								<div style={{ textAlign: "right" }}>
									<LangLink
										visible={canEditRecord(ctx.user?.role ?? null)}
										lang={ctx.lang}
										to={`${props.path}/edit/${String(props.id)}`}
										className="mg-button mg-button-secondary"
										style={{ margin: "5px" }}
									>
										{ctx.t({
											code: "common.edit",
											msg: "Edit",
										})}
									</LangLink>

									{props.approvalStatus === "waiting-for-validation" && (
										<>
											<Button
												lang={ctx.lang}
												visible={
													!props.isPublic &&
													(ctx.user?.role === "data-validator" ||
														ctx.user?.role === "admin")
												}
												className="mg-button mg-button-primary"
												style={{
													margin: "5px",
													display: "none",
												}}
												onClick={(e: any) => {
													e.preventDefault();
													setVisibleModalSubmit(true);
												}}
											>
												{ctx.t({
													code: "common.validate_or_return",
													msg: "Validate or Return",
												})}
											</Button>
										</>
									)}
									{props.extraActions}
								</div>
							</>
						)}
						<h2>{props.title}</h2>
						<p>
							{ctx.t({
								code: "common.id",
								msg: "ID",
							})}
							: {String(props.id)}
						</p>
						{props.extraInfo}
						{props.children}
					</form>
				</>
			</MainContainer>
		</>
	);
}

