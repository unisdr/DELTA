import { useMemo, useRef, useState } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { MultiSelect } from "primereact/multiselect";
import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { Form, useLocation, useNavigate, useNavigation } from "react-router";

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
import SpatialInformationStep from "~/modules/disaster-event/presentation/steps/spatial-information-step";
import ResponsesAssessmentsDeclarationsStep from "~/modules/disaster-event/presentation/steps/responses-assessments-declarations-step";
import ReviewSaveStep from "~/modules/disaster-event/presentation/steps/review-save-step";
import type { GeometryItem, SpatialTool } from "~/modules/disaster-event/presentation/steps/spatial/types";
import { Card } from "primereact/card";

type Option = {
    label: string;
    value: string;
    startDate?: string | null;
    typeId?: string;
    clusterId?: string;
};

type ValidatorOption = {
    id: string;
    name: string;
    email: string;
};

const EMPTY_GEOMETRIES: GeometryItem[] = [];

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
    showSubmitForValidation?: boolean;
    validatorOptions?: ValidatorOption[];
    submitDialogPath?: string;
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
            approvalStatus:
                initialValues.workflowStatus || initialValues.approvalStatus || "draft",
        },
        geography: initialValues.disasterEventGeometry?.[0]
            ? {
                source: "manual",
                divisionId: "",
                geomGeoJson: initialValues.disasterEventGeometry[0].geomGeoJson || "",
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
                responseDate: formatDateForInput(r.responseDate),
                description: r.description || "",
            })) || [],
        assessments:
            initialValues.assessments?.map((a) => ({
                assessmentTypeId: a.assessmentTypeId || "",
                assessmentDate: formatDateForInput(a.assessmentDate),
                description: a.description || "",
            })) || [],
        declarations:
            initialValues.declarations?.map((d) => ({
                declarationDate: formatDateForInput(d.declarationDate),
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
    disasterOptions,
    hazardousOptions,
    responseTypes,
    assessmentTypes,
    showSubmitForValidation = true,
    validatorOptions = [],
    submitDialogPath,
}: DisasterEventFormProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const totalSteps = 6;
    const [activeStep, setActiveStep] = useState(0);
    const [state, setState] = useState<DisasterEventStepState>(() =>
        fromInitialValues(initialValues),
    );
    const [geometries, setGeometries] = useState<GeometryItem[]>(() => {
        if (initialValues?.disasterEventGeometry && initialValues.disasterEventGeometry.length > 0) {
            return initialValues.disasterEventGeometry.map((geom) => ({
                id: geom.id,
                geojson: geom.geomGeoJson ? JSON.parse(geom.geomGeoJson) : { type: "Point" as const, coordinates: [0, 0] },
                geometryType: "POINT" as const,
                name: undefined,
                isPrimary: true,
            }));
        }
        return EMPTY_GEOMETRIES;
    });
    const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(() =>
        geometries.find((item) => item.isPrimary)?.id || geometries[0]?.id || null
    );
    const [currentSpatialTool, setCurrentSpatialTool] = useState<SpatialTool>(null);
    const [selectedAttachmentFiles, setSelectedAttachmentFiles] = useState<File[]>([]);
    const [removedExistingAttachmentIds, setRemovedExistingAttachmentIds] = useState<string[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | undefined>(undefined);
    const [attachmentWarning, setAttachmentWarning] = useState<string | undefined>(undefined);
    const [submitDialogStep, setSubmitDialogStep] = useState<1 | 2>(1);
    const [selectedValidatorIds, setSelectedValidatorIds] = useState<string[]>([]);
    const [submissionComment, setSubmissionComment] = useState("");
    const [showExitDialog, setShowExitDialog] = useState(false);
    const attachmentsInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const serializedState = useMemo(() => serializeStepState(state), [state]);

    const attachmentAccept = Array.from(ALLOWED_ATTACHMENT_EXTENSIONS).join(",");
    const isSubmitDialogOpen =
        !!showSubmitForValidation &&
        !!submitDialogPath &&
        location.pathname === submitDialogPath;
    const submitDialogParentPath = submitDialogPath
        ? submitDialogPath.replace(/\/submit-for-validation$/, "")
        : "/disaster-event";
    const formAction = submitDialogPath ? submitDialogParentPath : undefined;

    const validatorMultiSelectOptions = useMemo(
        () =>
            validatorOptions.map((validator) => ({
                label: `${validator.name} (${validator.email})`,
                value: validator.id,
            })),
        [validatorOptions],
    );

    const filteredHipClusters = useMemo(() => {
        const selectedCluster = hipClusters.find(
            (cluster) => cluster.value === state.coreEvent.hipClusterId,
        );
        const selectedHazard = hipHazards.find(
            (hazard) => hazard.value === state.coreEvent.hipHazardId,
        );
        const hazardCluster = selectedHazard?.clusterId
            ? hipClusters.find((cluster) => cluster.value === selectedHazard.clusterId)
            : undefined;
        const activeTypeId =
            state.coreEvent.hipTypeId ||
            selectedCluster?.typeId ||
            hazardCluster?.typeId ||
            "";

        return hipClusters.filter(
            (cluster) => !activeTypeId || cluster.typeId === activeTypeId,
        );
    }, [hipClusters, hipHazards, state.coreEvent.hipClusterId, state.coreEvent.hipHazardId, state.coreEvent.hipTypeId]);

    const filteredHipHazards = useMemo(() => {
        const selectedHazard = hipHazards.find(
            (hazard) => hazard.value === state.coreEvent.hipHazardId,
        );
        const activeClusterId =
            state.coreEvent.hipClusterId || selectedHazard?.clusterId || "";

        return hipHazards.filter(
            (hazard) => !activeClusterId || hazard.clusterId === activeClusterId,
        );
    }, [hipHazards, state.coreEvent.hipClusterId, state.coreEvent.hipHazardId]);

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

    const closeSubmitDialog = () => {
        setSubmitDialogStep(1);
        setSelectedValidatorIds([]);
        setSubmissionComment("");
        navigate(submitDialogParentPath);
    };

    const handleOpenExitDialog = () => {
        setShowExitDialog(true);
    };

    const handleGoBack = () => {
        setShowExitDialog(false);
    };

    const handleSaveDraftFromDialog = () => {
        setShowExitDialog(false);
        formRef.current?.requestSubmit();
    };

    const handleExitAnyway = () => {
        setShowExitDialog(false);
        navigate("/disaster-event");
    };

    const exitDialogFooter = (
        <div className="flex w-full items-center justify-between">
            <Button
                type="button"
                label="Go back"
                text
                onClick={handleGoBack}
                disabled={isSubmitting}
            />
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    label="Save draft"
                    outlined
                    onClick={handleSaveDraftFromDialog}
                    disabled={isSubmitting}
                />
                <Button
                    type="button"
                    label="Exit anyway"
                    severity="danger"
                    onClick={handleExitAnyway}
                    disabled={isSubmitting}
                />
            </div>
        </div>
    );

    return (
        <div className="grid gap-4 p-16">
            <Card>

                <Dialog
                    visible={showExitDialog}
                    onHide={handleGoBack}
                    header="Unsaved changes"
                    modal
                    closable
                    closeOnEscape
                    style={{ width: "min(36rem, 92vw)" }}
                    footer={exitDialogFooter}
                >
                    <p className="m-0 text-sm text-slate-700">
                        You have unsaved changes in this form. Are you sure you want to exit? Your progress will be lost unless you save as draft.
                    </p>
                </Dialog>


                <h2 className="mb-6 text-2xl font-semibold">{title}</h2>
                {actionError ? <Message severity="error" text={actionError} /> : null}

                <Form
                    ref={formRef}
                    id="disasterEventForm"
                    method="post"
                    action={formAction}
                    encType="multipart/form-data"
                    className="grid gap-4"
                >
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
                    {geometries.map((geometryItem) => (
                        <input
                            key={geometryItem.id}
                            type="hidden"
                            name="geometries[]"
                            value={JSON.stringify(geometryItem)}
                        />
                    ))}
                    <input
                        type="hidden"
                        name="stepState"
                        value={serializedState}
                    />
                    {selectedValidatorIds.map((validatorId) => (
                        <input
                            key={validatorId}
                            type="hidden"
                            name="notifiedUserIds[]"
                            value={validatorId}
                        />
                    ))}
                    <input
                        type="hidden"
                        name="submissionComment"
                        value={submissionComment}
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
                                hipClusters={filteredHipClusters}
                                hipHazards={filteredHipHazards}
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
                            <SpatialInformationStep
                                geometries={geometries}
                                selectedGeometryId={selectedGeometryId}
                                currentTool={currentSpatialTool}
                                onGeometriesChange={setGeometries}
                                onSelectedGeometryIdChange={setSelectedGeometryId}
                                onCurrentToolChange={setCurrentSpatialTool}
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
                                geometries={geometries}
                            />
                        </StepperPanel>
                    </Stepper>

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                            type="button"
                            label="Cancel"
                            outlined
                            className="w-full sm:w-auto"
                            onClick={handleOpenExitDialog}
                        />

                        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
                            <Button
                                type="submit"
                                label={submitLabel}
                                outlined
                                name="intent"
                                value="save_draft"
                                icon="pi pi-save"
                                className="w-full sm:w-auto"
                            />

                            {showSubmitForValidation && (
                                <Button
                                    type="button"
                                    label="Send for validation"
                                    icon="pi pi-send"
                                    className="w-full sm:w-auto"
                                    onClick={() => {
                                        if (submitDialogPath) {
                                            navigate(submitDialogPath);
                                        }
                                    }}
                                />
                            )}

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

                    <Dialog
                        header={submitDialogStep === 1 ? "Send for validation" : "Final review"}
                        visible={isSubmitDialogOpen}
                        modal
                        onHide={closeSubmitDialog}
                        className="w-[44rem] max-w-full"
                    >
                        {submitDialogStep === 1 ? (
                            <div className="flex flex-col gap-4">
                                <p className="m-0 text-sm text-slate-600">
                                    Select validator(s) from the current country account to notify about this validation request.
                                </p>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700" htmlFor="validatorSelector">
                                        Validators
                                    </label>
                                    <MultiSelect
                                        inputId="validatorSelector"
                                        value={selectedValidatorIds}
                                        options={validatorMultiSelectOptions}
                                        onChange={(event) => setSelectedValidatorIds(event.value || [])}
                                        placeholder="Select validator(s)"
                                        display="chip"
                                        filter
                                        filterBy="label"
                                        className="w-full"
                                    />
                                    <p className="m-0 text-xs text-slate-600">
                                        Selected validators: {selectedValidatorIds.length}
                                    </p>
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <Button
                                        type="button"
                                        outlined
                                        label="Cancel"
                                        onClick={closeSubmitDialog}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            label="Next"
                                            onClick={() => setSubmitDialogStep(2)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <h3 className="m-0 text-lg font-semibold">Final review</h3>
                                    <p className="m-0 text-sm text-slate-600">
                                        Review submission details before sending
                                    </p>
                                </div>

                                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                                    <p className="m-0">
                                        <span className="font-semibold">Submission Summary:</span> Submitted
                                    </p>
                                    <p className="m-0 mt-1">
                                        <span className="font-semibold">Notified validators:</span> {selectedValidatorIds.length} persona(s)
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700" htmlFor="submissionComment">
                                        Additional comments (Optional)
                                    </label>
                                    <InputTextarea
                                        id="submissionComment"
                                        value={submissionComment}
                                        onChange={(event) => setSubmissionComment(event.target.value)}
                                        rows={4}
                                        autoResize
                                        placeholder="Add a message for the validators..."
                                    />
                                    <p className="m-0 text-xs text-slate-600">
                                        These comments will be visible to all selected validators in their notification portal.
                                    </p>
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <Button
                                        type="button"
                                        outlined
                                        label="Cancel"
                                        onClick={closeSubmitDialog}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            outlined
                                            label="Back"
                                            onClick={() => setSubmitDialogStep(1)}
                                        />
                                        <Button
                                            type="submit"
                                            form="disasterEventForm"
                                            label="Send for validation"
                                            icon="pi pi-send"
                                            name="intent"
                                            value="submit_for_validation"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Form>
            </Card>
        </div>
    );
}
