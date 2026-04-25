import { useMemo, useState } from "react";

import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { Form, Link } from "react-router";

import type { DisasterEvent } from "~/modules/disaster-event/domain/entities/disaster-event";
import {
    makeEmptyDisasterEventStepState,
    normalizeStepState,
    serializeStepState,
    type DisasterEventStepState,
} from "~/modules/disaster-event/presentation/step-state";
import AttachmentsStep from "~/modules/disaster-event/presentation/steps/attachments-step";
import CausalityLinksStep from "~/modules/disaster-event/presentation/steps/causality-links-step";
import CoreEventStep from "~/modules/disaster-event/presentation/steps/core-event-step";
import GeographyStep from "~/modules/disaster-event/presentation/steps/geography-step";
import ResponsesAssessmentsDeclarationsStep from "~/modules/disaster-event/presentation/steps/responses-assessments-declarations-step";
import ReviewSaveStep from "~/modules/disaster-event/presentation/steps/review-save-step";

type Option = { label: string; value: string };

interface DisasterEventFormProps {
    title: string;
    submitLabel: string;
    actionError?: string;
    initialValues?: Partial<DisasterEvent>;
    hipTypes: Option[];
    hipClusters: Option[];
    hipHazards: Option[];
    divisions: Option[];
    disasterOptions: Option[];
    hazardousOptions: Option[];
    responseTypes: Option[];
    assessmentTypes: Option[];
}

function fromInitialValues(
    initialValues?: Partial<DisasterEvent>,
): DisasterEventStepState {
    if (!initialValues) return makeEmptyDisasterEventStepState();

    return normalizeStepState({
        coreEvent: {
            nationalDisasterId: initialValues.nationalDisasterId || "",
            nameNational: initialValues.nameNational || "",
            glide: initialValues.glide || "",
            nameGlobalOrRegional: initialValues.nameGlobalOrRegional || "",
            hipHazardId: initialValues.hipHazardId || "",
            hipClusterId: initialValues.hipClusterId || "",
            hipTypeId: initialValues.hipTypeId || "",
            startDate: initialValues.startDate || "",
            endDate: initialValues.endDate || "",
            recordingInstitution: initialValues.recordingInstitution || "",
            approvalStatus: initialValues.approvalStatus || "draft",
        },
        geography: initialValues.geography
            ? {
                source: initialValues.geography.source,
                divisionId: initialValues.geography.divisionId || "",
                geomGeoJson: initialValues.geography.geomGeoJson || "",
            }
            : undefined,
        attachments:
            initialValues.attachments?.map((a) => ({
                title: a.title,
                fileKey: a.fileKey,
                fileName: a.fileName,
                fileType: a.fileType,
                fileSize: Number(a.fileSize || 0),
            })) || [],
        causedByDisasters:
            initialValues.causedByDisasters?.map((c) => ({
                causeDisasterId: c.causeDisasterId,
            })) || [],
        hazardousCausalities:
            initialValues.hazardousCausalities?.map((c) => ({
                hazardousEventId: c.hazardousEventId,
                causeType: c.causeType,
            })) || [],
        responses:
            initialValues.responses?.map((r) => ({
                responseTypeId: r.responseTypeId || "",
                responseDate: r.responseDate || "",
                description: r.description || "",
            })) || [],
        assessments:
            initialValues.assessments?.map((a) => ({
                assessmentTypeId: a.assessmentTypeId || "",
                assessmentDate: a.assessmentDate || "",
                description: a.description || "",
            })) || [],
        declarations:
            initialValues.declarations?.map((d) => ({
                declarationDate: d.declarationDate || "",
                description: d.description || "",
            })) || [],
    });
}

export default function DisasterEventForm({
    title,
    submitLabel,
    actionError,
    initialValues,
    hipTypes,
    hipClusters,
    hipHazards,
    divisions,
    disasterOptions,
    hazardousOptions,
    responseTypes,
    assessmentTypes,
}: DisasterEventFormProps) {
    const totalSteps = 6;
    const [activeStep, setActiveStep] = useState(0);
    const [state, setState] = useState<DisasterEventStepState>(() =>
        fromInitialValues(initialValues),
    );

    const serializedState = useMemo(() => serializeStepState(state), [state]);

    return (
        <div className="grid gap-4">
            <h2 className="text-2xl font-semibold">{title}</h2>
            {actionError ? <Message severity="error" text={actionError} /> : null}

            <Form method="post" className="grid gap-4">
                <input
                    type="hidden"
                    name="stepState"
                    value={serializedState}
                />

                <Stepper
                    linear={false}
                    activeStep={activeStep}
                    onChangeStep={(e) => setActiveStep(e.index)}
                    headerPosition="bottom"
                >
                    <StepperPanel header={"Core Event\nRequired"}>
                        <CoreEventStep
                            state={state}
                            onChange={setState}
                            hipTypes={hipTypes}
                            hipClusters={hipClusters}
                            hipHazards={hipHazards}
                        />
                    </StepperPanel>
                    <StepperPanel header={"Geography\nRequired"}>
                        <GeographyStep
                            state={state}
                            onChange={setState}
                            divisions={divisions}
                        />
                    </StepperPanel>
                    <StepperPanel header={"Attachments\nOptional"}>
                        <AttachmentsStep
                            state={state}
                            onChange={setState}
                        />
                    </StepperPanel>
                    <StepperPanel header={"Causality Links\nOptional"}>
                        <CausalityLinksStep
                            state={state}
                            onChange={setState}
                            disasterOptions={disasterOptions}
                            hazardousOptions={hazardousOptions}
                        />
                    </StepperPanel>
                    <StepperPanel
                        header={"Responses/Assessments/Declarations\nOptional"}
                    >
                        <ResponsesAssessmentsDeclarationsStep
                            state={state}
                            onChange={setState}
                            responseTypes={responseTypes}
                            assessmentTypes={assessmentTypes}
                        />
                    </StepperPanel>
                    <StepperPanel header={"Review and Save\nRequired"}>
                        <ReviewSaveStep state={state} />
                    </StepperPanel>
                </Stepper>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link to="/disaster-event" className="w-full sm:w-auto">
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
        </div>
    );
}
