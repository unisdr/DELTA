import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { useMemo, useState } from "react";
import { Form, Link } from "react-router";

import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";

interface HipTypeOption {
    label: string;
    value: string;
}

interface HipClusterOption extends HipTypeOption {
    typeId: string;
}

interface HipHazardOption extends HipTypeOption {
    clusterId: string;
}

type StartDatePrecision = "fullDate" | "monthYear" | "yearOnly";

const startDatePrecisionOptions = [
    { label: "Full Date (DD/MM/YYYY)", value: "fullDate" as const },
    { label: "Month and Year (MM/YYYY)", value: "monthYear" as const },
    { label: "Year only (YYYY)", value: "yearOnly" as const },
];

const hazardousEventStatusOptions = [
    { label: "Forecasted", value: "forecasted" },
    { label: "Ongoing", value: "ongoing" },
    { label: "Passed", value: "passed" },
];

function inferStartDatePrecision(value: string): StartDatePrecision {
    if (/^\d{4}$/.test(value)) {
        return "yearOnly";
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
        return "monthYear";
    }
    return "fullDate";
}

function normalizeStartDateForPrecision(
    value: string,
    precision: StartDatePrecision,
): string {
    if (!value) {
        return "";
    }

    if (precision === "yearOnly") {
        if (/^\d{4}$/.test(value)) {
            return value;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}$/.test(value)) {
            return value.slice(0, 4);
        }
        const year = value.match(/(\d{4})/);
        return year ? year[1] : "";
    }

    if (precision === "monthYear") {
        if (/^\d{4}-\d{2}$/.test(value)) {
            return value;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value.slice(0, 7);
        }
        if (/^\d{4}$/.test(value)) {
            return `${value}-01`;
        }
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
        return `${value}-01`;
    }
    if (/^\d{4}$/.test(value)) {
        return `${value}-01-01`;
    }
    return "";
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

interface HazardousEventFormProps {
    title: string;
    submitLabel: string;
    actionError?: string;
    initialValues?: Partial<HazardousEvent>;
    hipHazards?: HipHazardOption[];
    hipClusters?: HipClusterOption[];
    hipTypes?: HipTypeOption[];
}

export default function HazardousEventForm({
    title,
    submitLabel,
    actionError,
    initialValues,
    hipHazards = [],
    hipClusters = [],
    hipTypes = [],
}: HazardousEventFormProps) {
    const totalSteps = 3;
    const initialStartDate = initialValues?.startDate || "";
    const initialEndDate = initialValues?.endDate || "";
    const [startDatePrecision, setStartDatePrecision] = useState<StartDatePrecision>(
        inferStartDatePrecision(initialStartDate),
    );
    const [startDateValue, setStartDateValue] = useState(initialStartDate);
    const [endDatePrecision, setEndDatePrecision] = useState<StartDatePrecision>(
        inferStartDatePrecision(initialEndDate),
    );
    const [endDateValue, setEndDateValue] = useState(initialEndDate);
    const [activeStep, setActiveStep] = useState(0);
    const [selectedHipTypeId, setSelectedHipTypeId] = useState(initialValues?.hipTypeId || "");
    const [selectedHipClusterId, setSelectedHipClusterId] = useState(initialValues?.hipClusterId || "");
    const [selectedHipHazardId, setSelectedHipHazardId] = useState(initialValues?.hipHazardId || "");

    const hipClusterById = useMemo(() => {
        return new Map(hipClusters.map((cluster) => [cluster.value, cluster]));
    }, [hipClusters]);

    const filteredHipClusters = useMemo(() => {
        if (!selectedHipTypeId) {
            return hipClusters;
        }
        return hipClusters.filter((cluster) => cluster.typeId === selectedHipTypeId);
    }, [hipClusters, selectedHipTypeId]);

    const filteredHipHazards = useMemo(() => {
        if (!selectedHipClusterId) {
            return hipHazards;
        }
        return hipHazards.filter((hazard) => hazard.clusterId === selectedHipClusterId);
    }, [hipHazards, selectedHipClusterId]);

    return (
        <div className="mx-auto max-w-5xl p-4">
            <Card>
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
                    <Link to="/hazardous-event">
                        <Button label="Back to list" text size="small" />
                    </Link>
                </div>

                {actionError ? (
                    <div className="mb-4">
                        <Message severity="error" text={actionError} />
                    </div>
                ) : null}

                <Form method="post" className="grid min-w-0 w-full gap-4">
                    <input type="hidden" name="hipTypeId" value={selectedHipTypeId} />
                    <input type="hidden" name="hipClusterId" value={selectedHipClusterId} />
                    <input type="hidden" name="hipHazardId" value={selectedHipHazardId} />
                    <input type="hidden" name="startDate" value={startDateValue} />
                    <input type="hidden" name="endDate" value={endDateValue} />

                    <Stepper
                        linear={false}
                        activeStep={activeStep}
                        onChangeStep={(event) => setActiveStep(event.index)}
                        headerPosition="bottom"
                        pt={{
                            nav: {
                                className: "justify-center",
                            },
                            stepperpanel: {
                                title: {
                                    className:
                                        "whitespace-pre-line text-center leading-tight text-xs font-normal text-slate-500 first-line:text-sm first-line:font-bold first-line:text-slate-800",
                                },
                            },
                        }}
                        className="w-full min-w-0"
                    >
                        <StepperPanel header={"Event Details\nRequired"}>
                            <div className="grid w-full min-w-0 gap-4 pb-2">
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
                                            onChange={(e) => {
                                                const nextTypeId = e.value || "";
                                                setSelectedHipTypeId(nextTypeId);
                                                setSelectedHipClusterId("");
                                                setSelectedHipHazardId("");
                                            }}
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
                                            onChange={(e) => {
                                                const nextClusterId = e.value || "";
                                                const nextCluster = hipClusterById.get(nextClusterId);
                                                setSelectedHipTypeId(nextCluster?.typeId || "");
                                                setSelectedHipClusterId(nextClusterId);
                                                setSelectedHipHazardId("");
                                            }}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label htmlFor="hipHazardId" className="text-sm font-medium text-slate-700">
                                            Hazard Hazard
                                        </label>
                                        <Dropdown
                                            id="hipHazardId"
                                            options={filteredHipHazards}
                                            optionLabel="label"
                                            optionValue="value"
                                            value={selectedHipHazardId || null}
                                            placeholder="Select a hazard"
                                            className="w-full"
                                            filter
                                            onChange={(e) => {
                                                const nextHazardId = e.value || "";
                                                const nextHazard = hipHazards.find((hazard) => hazard.value === nextHazardId);
                                                const nextCluster = nextHazard ? hipClusterById.get(nextHazard.clusterId) : undefined;
                                                setSelectedHipTypeId(nextCluster?.typeId || "");
                                                setSelectedHipClusterId(nextHazard?.clusterId || "");
                                                setSelectedHipHazardId(nextHazardId);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-1">
                                    <label htmlFor="nationalSpecification" className="text-sm font-medium text-slate-700">
                                        National Specification
                                    </label>
                                    <InputText
                                        id="nationalSpecification"
                                        name="nationalSpecification"
                                        className="w-full"
                                        defaultValue={initialValues?.nationalSpecification || ""}
                                    />
                                </div>

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
                                            onChange={(e) => {
                                                const nextPrecision = e.value as StartDatePrecision;
                                                setStartDatePrecision(nextPrecision);
                                                setStartDateValue(
                                                    normalizeStartDateForPrecision(startDateValue, nextPrecision),
                                                );
                                            }}
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
                                            onChange={(e) => {
                                                const nextPrecision = e.value as StartDatePrecision;
                                                setEndDatePrecision(nextPrecision);
                                                setEndDateValue(
                                                    normalizeStartDateForPrecision(endDateValue, nextPrecision),
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="grid gap-1">
                                        <label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                                            Start Date
                                        </label>
                                        <Calendar
                                            inputId="startDate"
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
                                            className="w-full"
                                            onChange={(e) => {
                                                setStartDateValue(
                                                    formatDateForPrecision(
                                                        (e.value as Date | null) ?? null,
                                                        startDatePrecision,
                                                    ),
                                                );
                                            }}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                                            End Date
                                        </label>
                                        <Calendar
                                            inputId="endDate"
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
                                            className="w-full"
                                            required
                                            onChange={(e) => {
                                                setEndDateValue(
                                                    formatDateForPrecision(
                                                        (e.value as Date | null) ?? null,
                                                        endDatePrecision,
                                                    ),
                                                );
                                            }}
                                        />
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
                                        defaultValue={initialValues?.description || ""}
                                    />
                                </div>

                                <div className="grid gap-1">
                                    <label htmlFor="chainsExplanation" className="text-sm font-medium text-slate-700">
                                        Composite event - chains explanation
                                    </label>
                                    <InputTextarea
                                        id="chainsExplanation"
                                        name="chainsExplanation"
                                        className="w-full"
                                        autoResize
                                        rows={4}
                                        defaultValue={initialValues?.chainsExplanation || ""}
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
                                        defaultValue={initialValues?.recordOriginator || ""}
                                        required
                                    />
                                </div>

                                <div className="grid gap-1">
                                    <label htmlFor="hazardousEventStatus" className="text-sm font-medium text-slate-700">
                                        Hazardous Event Status
                                    </label>
                                    <Dropdown
                                        id="hazardousEventStatus"
                                        name="hazardousEventStatus"
                                        options={hazardousEventStatusOptions}
                                        optionLabel="label"
                                        optionValue="value"
                                        value={initialValues?.hazardousEventStatus || ""}
                                        placeholder="Select a status"
                                        className="w-full"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="grid gap-1">
                                        <label htmlFor="dataSource" className="text-sm font-medium text-slate-700">
                                            Data Source
                                        </label>
                                        <InputText
                                            id="dataSource"
                                            name="dataSource"
                                            className="w-full"
                                            defaultValue={initialValues?.dataSource || ""}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label htmlFor="magnitude" className="text-sm font-medium text-slate-700">
                                            Magnitude
                                        </label>
                                        <InputText
                                            id="magnitude"
                                            name="magnitude"
                                            className="w-full"
                                            defaultValue={initialValues?.magnitude || ""}
                                        />
                                    </div>
                                </div>
                            </div>
                        </StepperPanel>
                        <StepperPanel
                            header={"Spatial Information\nRequired"}
                        >
                            <></>
                        </StepperPanel>
                        <StepperPanel
                            header={"Linked Events\nOptional"}
                        >
                            <></>
                        </StepperPanel>
                    </Stepper>

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <Link to="/hazardous-event" className="w-full sm:w-auto">
                            <Button
                                type="button"
                                label="Cancel"
                                outlined
                                className="w-full sm:w-auto"
                            />
                        </Link>

                        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
                            <Button
                                type="submit"
                                label={submitLabel}
                                outlined
                                className="w-full sm:w-auto"
                            />
                            {activeStep > 0 && (
                                <Button
                                    type="button"
                                    label="Back"
                                    icon="pi pi-arrow-left"
                                    outlined
                                    className="w-full sm:w-auto"
                                    onClick={() => setActiveStep((step) => Math.max(step - 1, 0))}
                                />
                            )}
                            {activeStep < totalSteps - 1 && (
                                <Button
                                    type="button"
                                    label="Next"
                                    icon="pi pi-arrow-right"
                                    iconPos="right"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                        setActiveStep((step) => Math.min(step + 1, totalSteps - 1))
                                    }
                                />
                            )}
                        </div>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
