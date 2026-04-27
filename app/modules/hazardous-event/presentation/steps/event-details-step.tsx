import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";

import type { HazardousEventFieldErrors } from "~/modules/hazardous-event/application/action-result";

export interface HipTypeOption {
    label: string;
    value: string;
}

export interface HipClusterOption extends HipTypeOption {
    typeId: string;
}

export interface HipHazardOption extends HipTypeOption {
    clusterId: string;
}

export type StartDatePrecision = "fullDate" | "monthYear" | "yearOnly";

interface EventDetailsStepProps {
    fieldErrors?: HazardousEventFieldErrors;
    nationalSpecification: string;
    onNationalSpecificationChange: (value: string) => void;
    hipTypes: HipTypeOption[];
    filteredHipClusters: HipClusterOption[];
    filteredHipHazards: HipHazardOption[];
    selectedHipTypeId: string;
    selectedHipClusterId: string;
    selectedHipHazardId: string;
    onHipTypeChange: (value: string) => void;
    onHipClusterChange: (value: string) => void;
    onHipHazardChange: (value: string) => void;
    startDatePrecision: StartDatePrecision;
    endDatePrecision: StartDatePrecision;
    startDatePrecisionOptions: { label: string; value: StartDatePrecision }[];
    startDateValue: string;
    endDateValue: string;
    onStartDatePrecisionChange: (value: StartDatePrecision) => void;
    onEndDatePrecisionChange: (value: StartDatePrecision) => void;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    hazardousEventStatusOptions: {
        label: string;
        value: "forecasted" | "ongoing" | "passed";
    }[];
    recordOriginator: string;
    onRecordOriginatorChange: (value: string) => void;
    hazardousEventStatus: string;
    onHazardousEventStatusChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
    dataSource: string;
    onDataSourceChange: (value: string) => void;
}

function parseStartDateToDate(
    value: string,
    precision: StartDatePrecision,
): Date | null {
    if (!value) {
        return null;
    }

    if (precision === "yearOnly") {
        if (!/^\d{4}$/.test(value)) {
            return null;
        }
        return new Date(Number(value), 0, 1);
    }

    if (precision === "monthYear") {
        if (!/^\d{4}-\d{2}$/.test(value)) {
            return null;
        }
        const [year, month] = value.split("-").map(Number);
        return new Date(year, month - 1, 1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDateForPrecision(
    date: Date | null,
    precision: StartDatePrecision,
): string {
    if (!date) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    if (precision === "yearOnly") {
        return String(year);
    }
    if (precision === "monthYear") {
        return `${year}-${month}`;
    }
    return `${year}-${month}-${day}`;
}

export default function EventDetailsStep({
    fieldErrors,
    nationalSpecification,
    onNationalSpecificationChange,
    hipTypes,
    filteredHipClusters,
    filteredHipHazards,
    selectedHipTypeId,
    selectedHipClusterId,
    selectedHipHazardId,
    onHipTypeChange,
    onHipClusterChange,
    onHipHazardChange,
    startDatePrecision,
    endDatePrecision,
    startDatePrecisionOptions,
    startDateValue,
    endDateValue,
    onStartDatePrecisionChange,
    onEndDatePrecisionChange,
    onStartDateChange,
    onEndDateChange,
    hazardousEventStatusOptions,
    recordOriginator,
    onRecordOriginatorChange,
    hazardousEventStatus,
    onHazardousEventStatusChange,
    description,
    onDescriptionChange,
    dataSource,
    onDataSourceChange,
}: EventDetailsStepProps) {
    return (
        <div className="grid w-full min-w-0 gap-4 pb-2">
            <div className="grid gap-1">
                <label htmlFor="nationalSpecification" className="text-sm font-medium text-slate-700">
                    National Specification
                    <span className="ml-1 text-red-600">*</span>
                </label>
                <InputText
                    id="nationalSpecification"
                    name="nationalSpecification"
                    className="w-full"
                    value={nationalSpecification}
                    aria-invalid={Boolean(fieldErrors?.nationalSpecification)}
                    onChange={(e) => onNationalSpecificationChange(e.target.value)}
                    invalid={Boolean(fieldErrors?.nationalSpecification)}
                />
                {fieldErrors?.nationalSpecification ? (
                    <small className="text-sm text-red-600">{fieldErrors.nationalSpecification}</small>
                ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-1">
                    <label htmlFor="hipTypeId" className="text-sm font-medium text-slate-700">
                        Hazard Type
                    </label>
                    <Dropdown
                        id="hipTypeId"
                        options={hipTypes}
                        optionLabel="label"
                        optionValue="value"
                        value={selectedHipTypeId || null}
                        placeholder="Select a type"
                        className="w-full"
                        filter
                        onChange={(e) => onHipTypeChange(e.value || "")}
                    />
                </div>
                <div className="grid gap-1">
                    <label htmlFor="hipClusterId" className="text-sm font-medium text-slate-700">
                        Hazard Cluster
                    </label>
                    <Dropdown
                        id="hipClusterId"
                        options={filteredHipClusters}
                        optionLabel="label"
                        optionValue="value"
                        value={selectedHipClusterId || null}
                        placeholder="Select a cluster"
                        className="w-full"
                        filter
                        onChange={(e) => onHipClusterChange(e.value || "")}
                    />
                </div>
                <div className="grid gap-1">
                    <label htmlFor="hipHazardId" className="text-sm font-medium text-slate-700">
                        Specific Hazard
                        <span className="ml-1 text-red-600">*</span>
                    </label>
                    <Dropdown
                        id="hipHazardId"
                        options={filteredHipHazards}
                        optionLabel="label"
                        optionValue="value"
                        value={selectedHipHazardId || null}
                        placeholder="Select a hazard"
                        className="w-full"
                        invalid={Boolean(fieldErrors?.hazardClassification)}
                        filter
                        onChange={(e) => onHipHazardChange(e.value || "")}
                    />
                </div>
            </div>
            {fieldErrors?.hazardClassification ? (
                <small className="text-sm text-red-600">{fieldErrors.hazardClassification}</small>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-1">
                    <label htmlFor="startDatePrecision" className="text-sm font-medium text-slate-700">
                        Start Date Format
                    </label>
                    <Dropdown
                        id="startDatePrecision"
                        options={startDatePrecisionOptions}
                        optionLabel="label"
                        optionValue="value"
                        value={startDatePrecision}
                        className="w-full"
                        onChange={(e) => onStartDatePrecisionChange(e.value as StartDatePrecision)}
                    />
                </div>
                <div className="grid gap-1">
                    <label htmlFor="endDatePrecision" className="text-sm font-medium text-slate-700">
                        End Date Format
                    </label>
                    <Dropdown
                        id="endDatePrecision"
                        options={startDatePrecisionOptions}
                        optionLabel="label"
                        optionValue="value"
                        value={endDatePrecision}
                        className="w-full"
                        onChange={(e) => onEndDatePrecisionChange(e.value as StartDatePrecision)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-1">
                    <label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                        Start Date
                        <span className="ml-1 text-red-600">*</span>
                    </label>
                    <Calendar
                        inputId="startDate"
                        showIcon
                        showButtonBar
                        value={parseStartDateToDate(startDateValue, startDatePrecision)}
                        view={
                            startDatePrecision === "yearOnly"
                                ? "year"
                                : startDatePrecision === "monthYear"
                                    ? "month"
                                    : "date"
                        }
                        dateFormat={
                            startDatePrecision === "fullDate"
                                ? "dd/mm/yy"
                                : startDatePrecision === "monthYear"
                                    ? "mm/yy"
                                    : "yy"
                        }
                        className={`w-full ${fieldErrors?.startDate ? "p-invalid" : ""}`}
                        onChange={(e) => {
                            onStartDateChange(
                                formatDateForPrecision(
                                    (e.value as Date | null) ?? null,
                                    startDatePrecision,
                                ),
                            );
                        }}
                    />
                    {fieldErrors?.startDate ? (
                        <small className="text-sm text-red-600">{fieldErrors.startDate}</small>
                    ) : null}
                </div>
                <div className="grid gap-1">
                    <label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                        End Date
                    </label>
                    <Calendar
                        inputId="endDate"
                        showIcon
                        showButtonBar
                        value={parseStartDateToDate(endDateValue, endDatePrecision)}
                        view={
                            endDatePrecision === "yearOnly"
                                ? "year"
                                : endDatePrecision === "monthYear"
                                    ? "month"
                                    : "date"
                        }
                        dateFormat={
                            endDatePrecision === "fullDate"
                                ? "dd/mm/yy"
                                : endDatePrecision === "monthYear"
                                    ? "mm/yy"
                                    : "yy"
                        }
                        className={`w-full ${fieldErrors?.endDate ? "p-invalid" : ""}`}
                        onChange={(e) => {
                            onEndDateChange(
                                formatDateForPrecision(
                                    (e.value as Date | null) ?? null,
                                    endDatePrecision,
                                ),
                            );
                        }}
                    />
                    {fieldErrors?.endDate ? (
                        <small className="text-sm text-red-600">{fieldErrors.endDate}</small>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-1">
                <label htmlFor="description" className="text-sm font-medium text-slate-700">
                    Description
                </label>
                <InputTextarea
                    id="description"
                    name="description"
                    className="w-full"
                    autoResize
                    rows={4}
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                />
            </div>

            <div className="grid gap-1">
                <label htmlFor="recordOriginator" className="text-sm font-medium text-slate-700">
                    Record Originator
                </label>
                <InputText
                    id="recordOriginator"
                    name="recordOriginator"
                    className="w-full"
                    value={recordOriginator}
                    onChange={(e) => onRecordOriginatorChange(e.target.value)}
                    aria-invalid={Boolean(fieldErrors?.recordOriginator)}
                    invalid={Boolean(fieldErrors?.recordOriginator)}
                />
                {fieldErrors?.recordOriginator ? (
                    <small className="text-sm text-red-600">{fieldErrors.recordOriginator}</small>
                ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-1">
                    <label htmlFor="hazardousEventStatus" className="text-sm font-medium text-slate-700">
                        Hazardous Event Status
                        <span className="ml-1 text-red-600">*</span>
                    </label>
                    <Dropdown
                        id="hazardousEventStatus"
                        name="hazardousEventStatus"
                        options={hazardousEventStatusOptions}
                        optionLabel="label"
                        optionValue="value"
                        value={hazardousEventStatus || null}
                        placeholder="Select a status"
                        className="w-full"
                        invalid={Boolean(fieldErrors?.hazardousEventStatus)}
                        onChange={(e) => onHazardousEventStatusChange(e.value || "")}
                    />
                    {fieldErrors?.hazardousEventStatus ? (
                        <small className="text-sm text-red-600">{fieldErrors.hazardousEventStatus}</small>
                    ) : null}
                </div>
                <div className="grid gap-1">
                    <label htmlFor="dataSource" className="text-sm font-medium text-slate-700">
                        Data Source
                    </label>
                    <InputText
                        id="dataSource"
                        name="dataSource"
                        className="w-full"
                        value={dataSource}
                        onChange={(e) => onDataSourceChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}