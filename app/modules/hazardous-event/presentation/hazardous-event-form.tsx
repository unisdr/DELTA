import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { Message } from "primereact/message";
import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { useEffect, useMemo, useRef, useState } from "react";
import { Form, useNavigate, useNavigation } from "react-router";

import type { HazardousEventFieldErrors } from "~/modules/hazardous-event/application/action-result";
import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import EventDetailsStep, {
    type HipClusterOption,
    type HipHazardOption,
    type HipTypeOption,
    type StartDatePrecision,
} from "~/modules/hazardous-event/presentation/steps/event-details-step";
import AttachmentsStep from "~/modules/hazardous-event/presentation/steps/attachments-step";
import CausalityLinkStep from "~/modules/hazardous-event/presentation/steps/causality-link-step";
import SpatialInformationStep from "~/modules/hazardous-event/presentation/steps/spatial-information-step";
import type {
    GeometryItem,
    SpatialTool,
} from "~/modules/hazardous-event/presentation/steps/spatial/types";

const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".mkv",
    ".mp3",
    ".wav",
    ".ogg",
    ".m4a",
    ".aac",
    ".flac",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
]);

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

const EMPTY_GEOMETRIES: GeometryItem[] = [];

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

interface HazardousEventFormProps {
    title: string;
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
    initialGeometries?: GeometryItem[];
    initialAttachments?: Array<{
        id: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
}

export default function HazardousEventForm({
    title,
    actionError,
    fieldErrors,
    initialValues,
    hipHazards = [],
    hipClusters = [],
    hipTypes = [],
    causalEventOptions = [],
    initialGeometries = EMPTY_GEOMETRIES,
    initialAttachments = [],
}: HazardousEventFormProps) {
    const navigate = useNavigate();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";
    const totalSteps = 5;
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
    const [description, setDescription] = useState(initialValues?.description || "");
    const [dataSource, setDataSource] = useState(initialValues?.dataSource || "");
    const [geometries, setGeometries] = useState<GeometryItem[]>(initialGeometries);
    const [selectedGeometryId, setSelectedGeometryId] = useState<string | null>(
        () =>
            initialGeometries.find((item) => item.isPrimary)?.id ||
            initialGeometries[0]?.id ||
            null,
    );
    const [currentSpatialTool, setCurrentSpatialTool] = useState<SpatialTool>("point");
    const [selectedAttachmentFiles, setSelectedAttachmentFiles] = useState<File[]>([]);
    const [removedExistingAttachmentIds, setRemovedExistingAttachmentIds] = useState<string[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | undefined>(undefined);
    const [attachmentWarning, setAttachmentWarning] = useState<string | undefined>(undefined);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const attachmentsInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        setGeometries(initialGeometries);
        setSelectedGeometryId(
            initialGeometries.find((item) => item.isPrimary)?.id ||
            initialGeometries[0]?.id ||
            null,
        );
    }, [initialGeometries]);

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

    const hipTypeLabelById = useMemo(
        () => new Map(hipTypes.map((option) => [option.value, option.label])),
        [hipTypes],
    );

    const hipClusterLabelById = useMemo(
        () => new Map(hipClusters.map((option) => [option.value, option.label])),
        [hipClusters],
    );

    const hipHazardLabelById = useMemo(
        () => new Map(hipHazards.map((option) => [option.value, option.label])),
        [hipHazards],
    );

    const selectedCauseEvents = useMemo(
        () => causalEventOptions.filter((option) => causeHazardousEventIds.includes(option.id)),
        [causalEventOptions, causeHazardousEventIds],
    );

    const totalAttachmentSize = useMemo(
        () => selectedAttachmentFiles.reduce((sum, file) => sum + file.size, 0),
        [selectedAttachmentFiles],
    );

    const attachmentAccept = Array.from(ALLOWED_ATTACHMENT_EXTENSIONS).join(",");

    const validateAttachmentFiles = (files: File[]): string | undefined => {
        if (!files.length) {
            return undefined;
        }

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
        if (!incomingFiles.length) {
            return;
        }

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
            // Fallback for browsers that don't support programmatic FileList updates.
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
        const nextFiles = selectedAttachmentFiles.filter((_, fileIndex) => fileIndex !== index);
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

    const reviewItems: Array<{ label: string; value: string }> = [
        { label: "National Specification", value: nationalSpecification || "-" },
        { label: "Hazard Type", value: hipTypeLabelById.get(selectedHipTypeId) || "-" },
        { label: "Hazard Cluster", value: hipClusterLabelById.get(selectedHipClusterId) || "-" },
        { label: "Specific Hazard", value: hipHazardLabelById.get(selectedHipHazardId) || "-" },
        { label: "Start Date", value: startDateValue || "-" },
        { label: "End Date", value: endDateValue || "-" },
        { label: "Description", value: description || "-" },
        { label: "Record Originator", value: recordOriginator || "-" },
        { label: "Hazardous Event Status", value: hazardousEventStatus || "-" },
        { label: "Data Source", value: dataSource || "-" },
    ];

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
        navigate("/hazardous-event");
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
        <div className="mx-auto max-w-5xl p-4">
            <Card>
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
                    <Button
                        type="button"
                        label="Back to list"
                        text
                        size="small"
                        onClick={handleOpenExitDialog}
                    />
                </div>

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

                {actionError ? (
                    <div className="mb-4">
                        <Message severity="error" text={actionError} />
                    </div>
                ) : null}

                <Form
                    ref={formRef}
                    method="post"
                    encType="multipart/form-data"
                    className="grid min-w-0 w-full gap-4"
                    noValidate
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
                    <input
                        type="hidden"
                        name="nationalSpecification"
                        value={nationalSpecification}
                    />
                    <input type="hidden" name="hipTypeId" value={selectedHipTypeId} />
                    <input type="hidden" name="hipClusterId" value={selectedHipClusterId} />
                    <input type="hidden" name="hipHazardId" value={selectedHipHazardId} />
                    <input type="hidden" name="startDate" value={startDateValue} />
                    <input type="hidden" name="endDate" value={endDateValue} />
                    <input
                        type="hidden"
                        name="description"
                        value={description}
                    />
                    <input
                        type="hidden"
                        name="recordOriginator"
                        value={recordOriginator}
                    />
                    <input
                        type="hidden"
                        name="hazardousEventStatus"
                        value={hazardousEventStatus}
                    />
                    <input
                        type="hidden"
                        name="dataSource"
                        value={dataSource}
                    />
                    {causeHazardousEventIds.map((causeHazardousEventId) => (
                        <input
                            key={causeHazardousEventId}
                            type="hidden"
                            name="causeHazardousEventIds[]"
                            value={causeHazardousEventId}
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
                                description={description}
                                onDescriptionChange={setDescription}
                                dataSource={dataSource}
                                onDataSourceChange={setDataSource}
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
                            header={"Spatial Information\nOptional"}
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
                            header={"Attachments\nOptional"}
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
                            header={"Review and Save\nRequired"}
                        >
                            <div className="grid gap-4 pb-2">
                                <h2 className="text-lg font-semibold text-slate-800">Review and Save</h2>
                                <p className="text-sm text-slate-600">Please review all entered information before saving.</p>

                                <div className="rounded-lg border border-slate-200 p-4">
                                    <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {reviewItems.map((item) => (
                                            <div key={item.label}>
                                                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
                                                <dd className="mt-1 text-sm text-slate-800">{item.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>

                                <div className="rounded-lg border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold text-slate-800">Cascading Hazardous Events (Selected Causes)</h3>
                                    {selectedCauseEvents.length ? (
                                        <ul className="mt-3 grid gap-2">
                                            {selectedCauseEvents.map((eventOption) => (
                                                <li key={eventOption.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                    <span className="font-medium text-slate-900">{eventOption.nationalSpecification || "-"}</span>
                                                    <span className="ml-2">| Originator: {eventOption.recordOriginator || "-"}</span>
                                                    <span className="ml-2">| Start: {eventOption.startDate || "-"}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-600">No causal hazardous events selected.</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold text-slate-800">Spatial Information</h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Total geometries: {geometries.length}
                                    </p>
                                    {geometries.length ? (
                                        <ul className="mt-3 grid gap-2">
                                            {geometries.map((geometryItem, index) => (
                                                <li
                                                    key={geometryItem.id}
                                                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                                >
                                                    <span className="font-medium text-slate-900">
                                                        {geometryItem.name?.trim() || `${geometryItem.geometryType} ${index + 1}`}
                                                    </span>
                                                    <span className="ml-2">| Type: {geometryItem.geometryType}</span>
                                                    <span className="ml-2">
                                                        | Primary: {geometryItem.isPrimary ? "Yes" : "No"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-600">No geometry added.</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Total selected size: {totalAttachmentSize} bytes
                                    </p>
                                    {selectedAttachmentFiles.length ? (
                                        <ul className="mt-3 grid gap-2">
                                            {selectedAttachmentFiles.map((file) => (
                                                <li
                                                    key={`${file.name}-${file.size}-${file.lastModified}`}
                                                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                                >
                                                    <span className="font-medium text-slate-900">{file.name}</span>
                                                    <span className="ml-2">| {file.type || "Unknown type"}</span>
                                                    <span className="ml-2">| {file.size} bytes</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-slate-600">No attachments selected.</p>
                                    )}
                                </div>
                            </div>
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
                            {activeStep === totalSteps - 1 && (
                                <Button
                                    type="submit"
                                    label="Save as draft"
                                    outlined
                                    className="w-full sm:w-auto"
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
                </Form>
            </Card>
        </div>
    );
}
