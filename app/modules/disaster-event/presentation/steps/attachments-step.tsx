import { Button } from "primereact/button";

const BYTES_IN_MB = 1024 * 1024;

interface AttachmentsStepProps {
    selectedFiles: File[];
    existingFiles?: Array<{
        id: string;
        fileName: string;
        fileType: string;
        fileSize: number;
    }>;
    removedExistingFileIds?: string[];
    maxTotalBytes: number;
    attachmentError?: string;
    attachmentWarning?: string;
    onPickFiles: () => void;
    onRemoveFile: (index: number) => void;
    onMarkRemoveExistingFile?: (id: string) => void;
    onUndoRemoveExistingFile?: (id: string) => void;
}

function formatBytes(value: number): string {
    if (!value) {
        return "0 B";
    }

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < BYTES_IN_MB) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / BYTES_IN_MB).toFixed(2)} MB`;
}

export default function AttachmentsStep({
    selectedFiles,
    existingFiles = [],
    removedExistingFileIds = [],
    maxTotalBytes,
    attachmentError,
    attachmentWarning,
    onPickFiles,
    onRemoveFile,
    onMarkRemoveExistingFile,
    onUndoRemoveExistingFile,
}: AttachmentsStepProps) {
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    return (
        <div className="grid gap-4 pb-2">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Attachments</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Upload files related to this disaster event. Allowed: images, videos, audios, PDF, Word, and Excel.
                </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-700">
                        <p>
                            Total selected size: <span className="font-semibold">{formatBytes(totalSize)}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                            Maximum total size: {formatBytes(maxTotalBytes)}
                        </p>
                    </div>
                    <Button
                        type="button"
                        label="Select Files"
                        icon="pi pi-upload"
                        onClick={onPickFiles}
                    />
                </div>

                {attachmentError ? (
                    <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {attachmentError}
                    </p>
                ) : null}

                {attachmentWarning ? (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {attachmentWarning}
                    </p>
                ) : null}
            </div>

            {existingFiles.length ? (
                <div className="grid gap-2">
                    <h3 className="text-sm font-semibold text-slate-700">Existing Attachments</h3>
                    {existingFiles.map((file) => {
                        const isMarkedForRemoval = removedExistingFileIds.includes(file.id);

                        return (
                            <div
                                key={file.id}
                                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${isMarkedForRemoval
                                        ? "border-red-200 bg-red-50"
                                        : "border-slate-200 bg-slate-50"
                                    }`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                        {file.fileName || "Attachment"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {file.fileType || "Unknown type"} • {formatBytes(file.fileSize || 0)}
                                    </p>
                                    {isMarkedForRemoval ? (
                                        <p className="mt-1 text-xs font-semibold text-red-700">
                                            Will be removed when you save.
                                        </p>
                                    ) : null}
                                </div>
                                {isMarkedForRemoval ? (
                                    <Button
                                        type="button"
                                        label="Undo"
                                        text
                                        onClick={() => onUndoRemoveExistingFile?.(file.id)}
                                    />
                                ) : (
                                    <Button
                                        type="button"
                                        icon="pi pi-times"
                                        text
                                        severity="danger"
                                        aria-label="Remove existing file"
                                        title="Remove existing file"
                                        onClick={() => onMarkRemoveExistingFile?.(file.id)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <div className="grid gap-2">
                {selectedFiles.length ? (
                    selectedFiles.map((file, index) => (
                        <div
                            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                                <p className="text-xs text-slate-500">
                                    {file.type || "Unknown type"} • {formatBytes(file.size)}
                                </p>
                            </div>
                            <Button
                                type="button"
                                icon="pi pi-times"
                                text
                                severity="danger"
                                aria-label="Remove file"
                                title="Remove file"
                                onClick={() => onRemoveFile(index)}
                            />
                        </div>
                    ))
                ) : (
                    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                        {existingFiles.length ? "No new files selected." : "No files selected."}
                    </div>
                )}
            </div>
        </div>
    );
}
