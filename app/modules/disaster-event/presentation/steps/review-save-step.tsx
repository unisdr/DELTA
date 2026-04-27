import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string; startDate?: string | null };

type ExistingAttachment = {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
};

type ReviewSaveStepProps = {
    state: DisasterEventStepState;
    hipTypes: Option[];
    hipClusters: Option[];
    hipHazards: Option[];
    disasterOptions: Option[];
    hazardousOptions: Option[];
    responseTypes: Option[];
    assessmentTypes: Option[];
    selectedAttachmentFiles: File[];
    existingAttachments?: ExistingAttachment[];
    removedExistingAttachmentIds?: string[];
};

function formatBytes(value: number): string {
    if (!value) {
        return "0 B";
    }

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function decodeDeclarationDescription(value: string): { organization: string; description: string } {
    const lines = String(value || "").split("\n");
    const [firstLine, ...rest] = lines;

    if (firstLine?.startsWith("Organization: ")) {
        return {
            organization: firstLine.replace("Organization: ", "").trim(),
            description: rest.join("\n").trim(),
        };
    }

    return {
        organization: "",
        description: String(value || ""),
    };
}

export default function ReviewSaveStep({
    state,
    hipTypes,
    hipClusters,
    hipHazards,
    disasterOptions,
    hazardousOptions,
    responseTypes,
    assessmentTypes,
    selectedAttachmentFiles,
    existingAttachments = [],
    removedExistingAttachmentIds = [],
}: ReviewSaveStepProps) {
    const hipTypeLabelById = new Map(hipTypes.map((item) => [item.value, item.label]));
    const hipClusterLabelById = new Map(hipClusters.map((item) => [item.value, item.label]));
    const hipHazardLabelById = new Map(hipHazards.map((item) => [item.value, item.label]));
    const responseTypeLabelById = new Map(responseTypes.map((item) => [item.value, item.label]));
    const assessmentTypeLabelById = new Map(assessmentTypes.map((item) => [item.value, item.label]));
    const disasterOptionById = new Map(disasterOptions.map((item) => [item.value, item]));
    const hazardousOptionById = new Map(hazardousOptions.map((item) => [item.value, item]));

    const keptExistingAttachments = existingAttachments.filter(
        (attachment) => !removedExistingAttachmentIds.includes(attachment.id),
    );

    const reviewItems: Array<{ label: string; value: string }> = [
        { label: "National Disaster ID", value: state.coreEvent.nationalDisasterId || "-" },
        { label: "Name (National)", value: state.coreEvent.nameNational || "-" },
        { label: "GLIDE", value: state.coreEvent.glide || "-" },
        { label: "Name (Global or Regional)", value: state.coreEvent.nameGlobalOrRegional || "-" },
        { label: "Hazard Type", value: hipTypeLabelById.get(state.coreEvent.hipTypeId) || "-" },
        { label: "Hazard Cluster", value: hipClusterLabelById.get(state.coreEvent.hipClusterId) || "-" },
        { label: "Specific Hazard", value: hipHazardLabelById.get(state.coreEvent.hipHazardId) || "-" },
        { label: "Start Date", value: state.coreEvent.startDate || "-" },
        { label: "End Date", value: state.coreEvent.endDate || "-" },
        { label: "Recording Institution", value: state.coreEvent.recordingInstitution || "-" },
        { label: "Approval Status", value: state.coreEvent.approvalStatus || "-" },
    ];

    return (
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
                <h3 className="text-sm font-semibold text-slate-800">Linked Disaster Events</h3>
                {state.causedByDisasters.length ? (
                    <ul className="mt-3 grid gap-2">
                        {state.causedByDisasters.map((item, index) => {
                            const option = disasterOptionById.get(item.causeDisasterId);
                            return (
                                <li
                                    key={`${item.causeDisasterId}-${item.direction}-${index}`}
                                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                >
                                    <span className="font-medium text-slate-900">{option?.label || item.causeDisasterId || "-"}</span>
                                    <span className="ml-2">| Direction: {item.direction}</span>
                                    <span className="ml-2">| Start: {option?.startDate || "-"}</span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No linked disaster events selected.</p>
                )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Linked Hazardous Events</h3>
                {state.hazardousCausalities.length ? (
                    <ul className="mt-3 grid gap-2">
                        {state.hazardousCausalities.map((item, index) => {
                            const option = hazardousOptionById.get(item.hazardousEventId);
                            return (
                                <li
                                    key={`${item.hazardousEventId}-${item.causeType}-${index}`}
                                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                >
                                    <span className="font-medium text-slate-900">{option?.label || item.hazardousEventId || "-"}</span>
                                    <span className="ml-2">| Relation: {item.causeType}</span>
                                    <span className="ml-2">| Start: {option?.startDate || "-"}</span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No linked hazardous events selected.</p>
                )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Responses</h3>
                {state.responses.length ? (
                    <ul className="mt-3 grid gap-2">
                        {state.responses.map((item, index) => (
                            <li
                                key={`${item.responseTypeId}-${item.responseDate}-${index}`}
                                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                                <span className="font-medium text-slate-900">{responseTypeLabelById.get(item.responseTypeId) || "-"}</span>
                                <span className="ml-2">| {item.responseDate || "-"}</span>
                                <span className="ml-2">| {item.description || "-"}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No responses added.</p>
                )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Assessments</h3>
                {state.assessments.length ? (
                    <ul className="mt-3 grid gap-2">
                        {state.assessments.map((item, index) => (
                            <li
                                key={`${item.assessmentTypeId}-${item.assessmentDate}-${index}`}
                                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                                <span className="font-medium text-slate-900">{assessmentTypeLabelById.get(item.assessmentTypeId) || "-"}</span>
                                <span className="ml-2">| {item.assessmentDate || "-"}</span>
                                <span className="ml-2">| {item.description || "-"}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No assessments added.</p>
                )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Official Declarations</h3>
                {state.declarations.length ? (
                    <ul className="mt-3 grid gap-2">
                        {state.declarations.map((item, index) => {
                            const decoded = decodeDeclarationDescription(item.description);
                            return (
                                <li
                                    key={`${item.declarationDate}-${index}`}
                                    className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                >
                                    <span className="font-medium text-slate-900">{decoded.organization || "-"}</span>
                                    <span className="ml-2">| {item.declarationDate || "-"}</span>
                                    <span className="ml-2">| {decoded.description || "-"}</span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No declarations added.</p>
                )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
                <p className="mt-1 text-xs text-slate-500">
                    Existing kept: {keptExistingAttachments.length} | New selected: {selectedAttachmentFiles.length}
                </p>
                {keptExistingAttachments.length || selectedAttachmentFiles.length ? (
                    <ul className="mt-3 grid gap-2">
                        {keptExistingAttachments.map((file) => (
                            <li
                                key={file.id}
                                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                                <span className="font-medium text-slate-900">{file.fileName || "Attachment"}</span>
                                <span className="ml-2">| {file.fileType || "Unknown type"}</span>
                                <span className="ml-2">| {formatBytes(file.fileSize || 0)}</span>
                                <span className="ml-2">| Existing</span>
                            </li>
                        ))}
                        {selectedAttachmentFiles.map((file) => (
                            <li
                                key={`${file.name}-${file.size}-${file.lastModified}`}
                                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                                <span className="font-medium text-slate-900">{file.name}</span>
                                <span className="ml-2">| {file.type || "Unknown type"}</span>
                                <span className="ml-2">| {formatBytes(file.size)}</span>
                                <span className="ml-2">| New</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">No attachments selected.</p>
                )}
            </div>
        </div>
    );
}
