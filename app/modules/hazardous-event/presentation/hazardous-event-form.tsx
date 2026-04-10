import { Button } from "primereact/button";
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
                                        <label htmlFor="startDate" className="text-sm font-medium text-slate-700">
                                            Start Date
                                        </label>
                                        <InputText
                                            id="startDate"
                                            name="startDate"
                                            type="date"
                                            className="w-full"
                                            defaultValue={initialValues?.startDate || ""}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label htmlFor="endDate" className="text-sm font-medium text-slate-700">
                                            End Date
                                        </label>
                                        <InputText
                                            id="endDate"
                                            name="endDate"
                                            type="date"
                                            className="w-full"
                                            defaultValue={initialValues?.endDate || ""}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="grid gap-1">
                                        <label htmlFor="hipTypeId" className="text-sm font-medium text-slate-700">
                                            HIP Type
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
                                            HIP Cluster
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
                                            HIP Hazard
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

                    <div className="flex items-center justify-between gap-2 pt-2">
                        <Link to="/hazardous-event">
                            <Button type="button" label="Cancel" outlined />
                        </Link>

                        <div className="flex items-center gap-2">
                            <Button type="submit" label={submitLabel} outlined />
                            {activeStep > 0 && (
                                <Button
                                    type="button"
                                    label="Back"
                                    icon="pi pi-arrow-left"
                                    outlined
                                    onClick={() => setActiveStep((step) => Math.max(step - 1, 0))}
                                />
                            )}
                            {activeStep < totalSteps - 1 && (
                                <Button
                                    type="button"
                                    label="Next"
                                    icon="pi pi-arrow-right"
                                    iconPos="right"
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
