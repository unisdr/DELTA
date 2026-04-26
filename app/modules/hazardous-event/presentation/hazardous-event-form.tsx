import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { useMemo, useState } from "react";
import { Form, Link } from "react-router";

import type { HazardousEventFieldErrors } from "~/modules/hazardous-event/application/action-result";
import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import EventDetailsStep, {
    type HipClusterOption,
    type HipHazardOption,
    type HipTypeOption,
    type StartDatePrecision,
} from "~/modules/hazardous-event/presentation/steps/event-details-step";
import CausalityLinkStep from "~/modules/hazardous-event/presentation/steps/causality-link-step";

const startDatePrecisionOptions = [
    { label: "Full Date (DD/MM/YYYY)", value: "fullDate" as const },
    { label: "Month and Year (MM/YYYY)", value: "monthYear" as const },
    { label: "Year only (YYYY)", value: "yearOnly" as const },
];

const hazardousEventStatusOptions = [
    { label: "Forecasted", value: "forecasted" as const },
    { label: "Ongoing", value: "ongoing" as const },
    { label: "Passed", value: "passed" as const },
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

function toFormDateValue(value: Date | string | null | undefined): string {
    if (!value) {
        return "";
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return value;
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

interface HazardousEventFormProps {
    title: string;
    submitLabel: string;
    actionError?: string;
    fieldErrors?: HazardousEventFieldErrors;
    initialValues?: Partial<HazardousEvent>;
    hipHazards?: HipHazardOption[];
    hipClusters?: HipClusterOption[];
    hipTypes?: HipTypeOption[];
    causalEventOptions?: Array<{
        id: string;
        nationalSpecification: string;
        recordOriginator: string;
        startDate: string;
    }>;
}

export default function HazardousEventForm({
    title,
    submitLabel,
    actionError,
    fieldErrors,
    initialValues,
    hipHazards = [],
    hipClusters = [],
    hipTypes = [],
    causalEventOptions = [],
}: HazardousEventFormProps) {
    const totalSteps = 3;
    const initialStartDate = toFormDateValue(initialValues?.startDate);
    const initialEndDate = toFormDateValue(initialValues?.endDate);
    const [startDatePrecision, setStartDatePrecision] = useState<StartDatePrecision>(
        inferStartDatePrecision(initialStartDate),
    );
    const [startDateValue, setStartDateValue] = useState(initialStartDate);
    const [endDatePrecision, setEndDatePrecision] = useState<StartDatePrecision>(
        inferStartDatePrecision(initialEndDate),
    );
    const [endDateValue, setEndDateValue] = useState(initialEndDate);
    const [activeStep, setActiveStep] = useState(0);
    const [nationalSpecification, setNationalSpecification] = useState(
        initialValues?.nationalSpecification || "",
    );
    const [selectedHipTypeId, setSelectedHipTypeId] = useState(initialValues?.hipTypeId || "");
    const [selectedHipClusterId, setSelectedHipClusterId] = useState(initialValues?.hipClusterId || "");
    const [selectedHipHazardId, setSelectedHipHazardId] = useState(initialValues?.hipHazardId || "");
    const [hazardousEventStatus, setHazardousEventStatus] = useState(
        initialValues?.hazardousEventStatus || "",
    );
    const [causeHazardousEventIds, setCauseHazardousEventIds] = useState<string[]>(
        initialValues?.causeHazardousEventIds ||
        initialValues?.effectHazardousEventIds ||
        [],
    );
    const [recordOriginator, setRecordOriginator] = useState(
        initialValues?.recordOriginator || "",
    );

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

    const effectiveFieldErrors = useMemo(() => {
        if (!fieldErrors) {
            return undefined;
        }

        const next: HazardousEventFieldErrors = { ...fieldErrors };

        if (next.nationalSpecification && nationalSpecification.trim()) {
            delete next.nationalSpecification;
        }
        if (next.recordOriginator && recordOriginator.trim()) {
            delete next.recordOriginator;
        }
        if (next.startDate && startDateValue.trim()) {
            delete next.startDate;
        }
        if (next.endDate && endDateValue.trim()) {
            delete next.endDate;
        }
        if (next.hazardousEventStatus && hazardousEventStatus) {
            delete next.hazardousEventStatus;
        }
        if (next.hazardClassification && selectedHipHazardId) {
            delete next.hazardClassification;
        }

        return Object.keys(next).length > 0 ? next : undefined;
    }, [
        fieldErrors,
        hazardousEventStatus,
        nationalSpecification,
        recordOriginator,
        selectedHipHazardId,
        startDateValue,
        endDateValue,
    ]);

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

                <Form method="post" className="grid min-w-0 w-full gap-4" noValidate>
                    <input type="hidden" name="hipTypeId" value={selectedHipTypeId} />
                    <input type="hidden" name="hipClusterId" value={selectedHipClusterId} />
                    <input type="hidden" name="hipHazardId" value={selectedHipHazardId} />
                    <input type="hidden" name="startDate" value={startDateValue} />
                    <input type="hidden" name="endDate" value={endDateValue} />
                    {causeHazardousEventIds.map((causeHazardousEventId) => (
                        <input
                            key={causeHazardousEventId}
                            type="hidden"
                            name="causeHazardousEventIds[]"
                            value={causeHazardousEventId}
                        />
                    ))}

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
                            <EventDetailsStep
                                fieldErrors={effectiveFieldErrors}
                                initialValues={initialValues}
                                nationalSpecification={nationalSpecification}
                                onNationalSpecificationChange={setNationalSpecification}
                                hipTypes={hipTypes}
                                filteredHipClusters={filteredHipClusters}
                                filteredHipHazards={filteredHipHazards}
                                selectedHipTypeId={selectedHipTypeId}
                                selectedHipClusterId={selectedHipClusterId}
                                selectedHipHazardId={selectedHipHazardId}
                                onHipTypeChange={(nextTypeId) => {
                                    setSelectedHipTypeId(nextTypeId);
                                    setSelectedHipClusterId("");
                                    setSelectedHipHazardId("");
                                }}
                                onHipClusterChange={(nextClusterId) => {
                                    const nextCluster = hipClusterById.get(nextClusterId);
                                    setSelectedHipTypeId(nextCluster?.typeId || "");
                                    setSelectedHipClusterId(nextClusterId);
                                    setSelectedHipHazardId("");
                                }}
                                onHipHazardChange={(nextHazardId) => {
                                    const nextHazard = hipHazards.find((hazard) => hazard.value === nextHazardId);
                                    const nextCluster = nextHazard ? hipClusterById.get(nextHazard.clusterId) : undefined;
                                    setSelectedHipTypeId(nextCluster?.typeId || "");
                                    setSelectedHipClusterId(nextHazard?.clusterId || "");
                                    setSelectedHipHazardId(nextHazardId);
                                }}
                                startDatePrecision={startDatePrecision}
                                endDatePrecision={endDatePrecision}
                                startDatePrecisionOptions={startDatePrecisionOptions}
                                startDateValue={startDateValue}
                                endDateValue={endDateValue}
                                onStartDatePrecisionChange={(nextPrecision) => {
                                    setStartDatePrecision(nextPrecision);
                                    setStartDateValue(
                                        normalizeStartDateForPrecision(startDateValue, nextPrecision),
                                    );
                                }}
                                onEndDatePrecisionChange={(nextPrecision) => {
                                    setEndDatePrecision(nextPrecision);
                                    setEndDateValue(
                                        normalizeStartDateForPrecision(endDateValue, nextPrecision),
                                    );
                                }}
                                onStartDateChange={setStartDateValue}
                                onEndDateChange={setEndDateValue}
                                hazardousEventStatusOptions={hazardousEventStatusOptions}
                                recordOriginator={recordOriginator}
                                onRecordOriginatorChange={setRecordOriginator}
                                hazardousEventStatus={hazardousEventStatus}
                                onHazardousEventStatusChange={setHazardousEventStatus}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Linked events\nOptional"}
                        >
                            <CausalityLinkStep
                                causalEventOptions={causalEventOptions}
                                selectedCauseHazardousEventIds={causeHazardousEventIds}
                                onSelectedCauseHazardousEventIdsChange={setCauseHazardousEventIds}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Spatial Information\nRequired"}
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
