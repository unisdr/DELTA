import { useMemo, useRef, useState } from "react";

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
import CoreEventStep from "~/modules/disaster-event/presentation/steps/event-details-step";
import GeographyStep from "~/modules/disaster-event/presentation/steps/geography-step";
import ResponsesAssessmentsDeclarationsStep from "~/modules/disaster-event/presentation/steps/responses-assessments-declarations-step";
import ReviewSaveStep from "~/modules/disaster-event/presentation/steps/review-save-step";
import { Card } from "primereact/card";

type Option = {
    label: string;
    value: string;
    startDate?: string | null;
    typeId?: string;
    clusterId?: string;
};

const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",
    ".mp4", ".webm", ".mov", ".avi", ".mkv",
    ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
]);

function getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot < 0) {
        return "";
    }
    return fileName.slice(lastDot).toLowerCase();
}

function syncInputFiles(input: HTMLInputElement | null, files: File[]): boolean {
    if (!input) {
        return false;
    }

    try {
        const dataTransfer = new DataTransfer();
        files.forEach((file) => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
        return true;
    } catch {
        return false;
    }
}

const STEPPER_TITLE_CLASS =
    "whitespace-pre-line text-center leading-tight text-xs font-normal text-slate-500 first-line:text-sm first-line:font-bold first-line:text-slate-800";

interface DisasterEventFormProps {
    title: string;
    submitLabel: string;
    actionError?: string;
    initialValues?: Partial<DisasterEvent>;
    initialAttachments?: Array<{
        id: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    hipTypes: Option[];
    hipClusters: Option[];
    hipHazards: Option[];
    divisions: Option[];
    disasterOptions: Option[];
    hazardousOptions: Option[];
    responseTypes: Option[];
    assessmentTypes: Option[];
}

function formatDateForInput(value: Date | string | null | undefined): string {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    return value.toISOString().slice(0, 10);
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
            startDate: formatDateForInput(initialValues.startDate),
            endDate: formatDateForInput(initialValues.endDate),
            startDatePrecision: "fullDate",
            endDatePrecision: "fullDate",
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
        causedByDisasters:
            initialValues.causedByDisasters?.map((c) => ({
                causeDisasterId:
                    c.direction === "TRIGGERED"
                        ? (c.effectDisasterId || "")
                        : c.causeDisasterId,
                direction:
                    c.direction ||
                    (c.effectDisasterId && !c.causeDisasterId
                        ? "TRIGGERED"
                        : "TRIGGERING"),
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
    initialAttachments = [],
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
    const [selectedAttachmentFiles, setSelectedAttachmentFiles] = useState<File[]>([]);
    const [removedExistingAttachmentIds, setRemovedExistingAttachmentIds] = useState<string[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | undefined>(undefined);
    const [attachmentWarning, setAttachmentWarning] = useState<string | undefined>(undefined);
    const attachmentsInputRef = useRef<HTMLInputElement>(null);

    const serializedState = useMemo(() => serializeStepState(state), [state]);

    const attachmentAccept = Array.from(ALLOWED_ATTACHMENT_EXTENSIONS).join(",");

    const validateAttachmentFiles = (files: File[]): string | undefined => {
        if (!files.length) return undefined;
        const invalidFile = files.find(
            (file) => !ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(file.name)),
        );
        if (invalidFile) {
            return `File type not allowed: ${invalidFile.name}`;
        }
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > MAX_ATTACHMENT_TOTAL_BYTES) {
            return "Total attachment size must not exceed 10 MB.";
        }
        return undefined;
    };

    const addFiles = (incomingFiles: File[]) => {
        if (!incomingFiles.length) return;
        const dedupedByKey = new Map<string, File>();
        [...selectedAttachmentFiles, ...incomingFiles].forEach((file) => {
            const key = `${file.name}-${file.size}-${file.lastModified}`;
            dedupedByKey.set(key, file);
        });
        const nextFiles = Array.from(dedupedByKey.values());
        const validationError = validateAttachmentFiles(nextFiles);
        if (validationError) {
            setAttachmentError(validationError);
            return;
        }
        setAttachmentError(undefined);
        const didSync = syncInputFiles(attachmentsInputRef.current, nextFiles);
        if (!didSync) {
            setAttachmentWarning(
                "Your browser can only submit files from the latest selection. Please pick all files at once.",
            );
            setSelectedAttachmentFiles(incomingFiles);
            return;
        }
        setAttachmentWarning(undefined);
        setSelectedAttachmentFiles(nextFiles);
    };

    const removeFile = (index: number) => {
        const nextFiles = selectedAttachmentFiles.filter((_, i) => i !== index);
        const didSync = syncInputFiles(attachmentsInputRef.current, nextFiles);
        if (!didSync) {
            setAttachmentError(
                "Your browser does not support removing individual files. Please reselect the files you want to submit.",
            );
            return;
        }
        setSelectedAttachmentFiles(nextFiles);
        setAttachmentError(validateAttachmentFiles(nextFiles));
        setAttachmentWarning(undefined);
    };

    const markExistingAttachmentForRemoval = (id: string) => {
        setRemovedExistingAttachmentIds((prev) =>
            prev.includes(id) ? prev : [...prev, id],
        );
    };

    const undoExistingAttachmentRemoval = (id: string) => {
        setRemovedExistingAttachmentIds((prev) =>
            prev.filter((attachmentId) => attachmentId !== id),
        );
    };

    return (
        <div className="grid gap-4 p-16">
            <Card>


                <h2 className="mb-6 text-2xl font-semibold">{title}</h2>
                {actionError ? <Message severity="error" text={actionError} /> : null}

                <Form method="post" encType="multipart/form-data" className="grid gap-4">
                    <input
                        ref={attachmentsInputRef}
                        type="file"
                        name="attachments"
                        multiple
                        accept={attachmentAccept}
                        className="hidden"
                        onChange={(event) => {
                            const pickedFiles = Array.from(event.currentTarget.files || []);
                            addFiles(pickedFiles);
                        }}
                    />
                    <input
                        type="hidden"
                        name="attachmentSelectionCount"
                        value={String(selectedAttachmentFiles.length)}
                    />
                    {removedExistingAttachmentIds.map((attachmentId) => (
                        <input
                            key={attachmentId}
                            type="hidden"
                            name="attachmentsToRemove[]"
                            value={attachmentId}
                        />
                    ))}
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
                        <StepperPanel
                            header={"Event\u00A0basics\nREQUIRED"}
                            pt={{
                                title: {
                                    className: STEPPER_TITLE_CLASS,
                                },
                            }}
                        >
                            <CoreEventStep
                                state={state}
                                onChange={setState}
                                hipTypes={hipTypes}
                                hipClusters={hipClusters}
                                hipHazards={hipHazards}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Linked\u00A0events\nOPTIONAL"}
                            pt={{
                                title: {
                                    className: STEPPER_TITLE_CLASS,
                                },
                            }}
                        >
                            <CausalityLinksStep
                                state={state}
                                onChange={setState}
                                disasterOptions={disasterOptions}
                                hazardousOptions={hazardousOptions}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Spatial Information\nREQUIRED"}
                            pt={{
                                title: {
                                    className: STEPPER_TITLE_CLASS,
                                },
                            }}
                        >
                            <GeographyStep
                                state={state}
                                onChange={setState}
                                divisions={divisions}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Attachments\nOPTIONAL"}
                            pt={{
                                title: {
                                    className: STEPPER_TITLE_CLASS,
                                },
                            }}
                        >
                            <AttachmentsStep
                                selectedFiles={selectedAttachmentFiles}
                                existingFiles={initialAttachments}
                                removedExistingFileIds={removedExistingAttachmentIds}
                                maxTotalBytes={MAX_ATTACHMENT_TOTAL_BYTES}
                                attachmentError={attachmentError}
                                attachmentWarning={attachmentWarning}
                                onPickFiles={() => attachmentsInputRef.current?.click()}
                                onRemoveFile={removeFile}
                                onMarkRemoveExistingFile={markExistingAttachmentForRemoval}
                                onUndoRemoveExistingFile={undoExistingAttachmentRemoval}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Additional details\nOPTIONAL"}
                            pt={{
                                title: {
                                    className: STEPPER_TITLE_CLASS,
                                },
                            }}
                        >
                            <ResponsesAssessmentsDeclarationsStep
                                state={state}
                                onChange={setState}
                                responseTypes={responseTypes}
                                assessmentTypes={assessmentTypes}
                            />
                        </StepperPanel>
                        <StepperPanel
                            header={"Review\u00A0and\u00A0Save\nREQUIRED"}
                            pt={{
                                title: {
                                    className: STEPPER_TITLE_CLASS,
                                },
                            }}
                        >
                            <ReviewSaveStep
                                state={state}
                                hipTypes={hipTypes}
                                hipClusters={hipClusters}
                                hipHazards={hipHazards}
                                disasterOptions={disasterOptions}
                                hazardousOptions={hazardousOptions}
                                responseTypes={responseTypes}
                                assessmentTypes={assessmentTypes}
                                selectedAttachmentFiles={selectedAttachmentFiles}
                                existingAttachments={initialAttachments}
                                removedExistingAttachmentIds={removedExistingAttachmentIds}
                            />
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
            </Card>
        </div>
    );
}
