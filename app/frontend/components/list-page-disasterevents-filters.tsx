import { useRef } from "react";
import { Toast } from "primereact/toast";
import { SelectSector } from "~/drizzle/schema/sectorTable";
import { getRecordStatusOptions } from "../events/hazardevent-filters";
import { Form } from "react-router";
import { ViewContext } from "../context";

interface Props {
	ctx: ViewContext;
	disasterEventName?: string;
	recordingInstitution?: string;
	fromDate?: string;
	toDate?: string;
	sectors: SelectSector[];
	clearFiltersUrl: string;
	formStartElement?: React.ReactNode;
	recordStatus?: string;
}

export function DisasterEventsFilter(props: Props) {
	const ctx = props.ctx;

	const toast = useRef<Toast>(null);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData = new FormData(e.currentTarget);
		const fromDateStr = formData.get("fromDate") as string;
		const toDateStr = formData.get("toDate") as string;

		// Validation
		if (fromDateStr && toDateStr) {
			const fromDate = new Date(fromDateStr);
			const toDate = new Date(toDateStr);

			if (toDate < fromDate) {
				toast.current?.show({
					severity: "error",
					summary: ctx.t({
						code: "common.invalid_date_range",
						msg: "Invalid date range",
					}),
					detail: ctx.t({
						code: "common.to_date_before_from_date",
						desc: "Detail message explaining that 'To' date cannot be earlier than 'From' date",
						msg: "'To' date cannot be earlier than 'From' date.",
					}),
					life: 4000,
				});
				return;
			}
		}

		e.currentTarget.submit();
	};

	return (
		<Form onSubmit={handleSubmit} className="dts-form">
			<Toast ref={toast} />
			{props.formStartElement}

			<div className="mg-grid mg-grid__col-3">
				{/* Disaster event name */}
				<div className="dts-form-component mg-grid__col--span-2">
					<label>
						<div className="dts-form-component__label">
							<span>
								{ctx.t({
									code: "disaster_event.name_label",
									msg: "Disaster event name",
								})}
							</span>
						</div>
						<input
							name="disasterEventName"
							type="text"
							placeholder={ctx.t({
								code: "disaster_event.search_name_placeholder",
								desc: "Placeholder for disaster event name search input",
								msg: "All disaster events",
							})}
							defaultValue={props.disasterEventName}
						/>
					</label>
				</div>

				{/* Recording Institution */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							<span>
								{ctx.t({
									code: "disaster_event.recording_organization",
									msg: "Recording organization",
								})}
							</span>
						</div>
						<input
							name="recordingInstitution"
							type="text"
							placeholder={ctx.t({
								code: "disaster_event.search_organization_placeholder",
								desc: "Placeholder for organization search input",
								msg: "Search organization",
							})}
							defaultValue={props.recordingInstitution}
						/>
					</label>
				</div>

				{/* From date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							<span>
								{ctx.t({
									code: "common.from_date",
									desc: "From date",
									msg: "From",
								})}
							</span>
						</div>
						<input
							name="fromDate"
							type="date"
							placeholder={ctx.t({
								code: "common.select_date",
								msg: "Select date",
							})}
							defaultValue={props.fromDate}
						/>
					</label>
				</div>

				{/* To date */}
				<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
							<span>
								{ctx.t({
									code: "common.to_date",
									desc: "To date",
									msg: "To",
								})}
							</span>
						</div>
						<input
							name="toDate"
							type="date"
							placeholder={ctx.t({
								code: "common.select_date",
								msg: "Select date",
							})}
							defaultValue={props.toDate}
						/>
					</label>
				</div>

				<div className="dts-form-component">
					<div className="dts-form-component__label">
						<span>
							{ctx.t({
								code: "record.status",
								msg: "Record status",
							})}
						</span>
					</div>
					<label>
						<select
							id="recordStatus"
							name="recordStatus"
							defaultValue={props.recordStatus}
						>
							<option value="">
								{ctx.t({
									code: "record.select_status",
									msg: "Select record status",
								})}
							</option>
							{getRecordStatusOptions(ctx).map((recordStatus) => (
								<option key={recordStatus.value} value={recordStatus.value}>
									{recordStatus.label}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

			{/* Buttons */}
			<div className="dts-form__actions">
				<input
					type="submit"
					value={ctx.t({
						code: "common.apply_filters",
						desc: "Button label to apply filters",
						msg: "Apply filters",
					})}
					className="mg-button mg-button-primary"
				/>
				<a href={props.clearFiltersUrl} className="mg-button mg-button-outline">
					{ctx.t({
						code: "common.clear",
						desc: "Button label to clear filters or input",
						msg: "Clear",
					})}
				</a>
			</div>
		</Form>
	);
}
