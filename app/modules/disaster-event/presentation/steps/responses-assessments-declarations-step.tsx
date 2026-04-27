import { useState } from "react";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";

import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type RADStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    responseTypes: Option[];
    assessmentTypes: Option[];
};

export default function ResponsesAssessmentsDeclarationsStep({
    state,
    onChange,
    responseTypes,
    assessmentTypes: _assessmentTypes,
}: RADStepProps) {
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [editingResponseIndex, setEditingResponseIndex] = useState<number | null>(null);
    const [responseTypeId, setResponseTypeId] = useState("");
    const [responseDate, setResponseDate] = useState<Date | null>(null);
    const [responseDescription, setResponseDescription] = useState("");

    const getResponseTypeLabel = (typeId: string): string => {
        return responseTypes.find((item) => item.value === typeId)?.label || typeId || "-";
    };

    const formatDateForStorage = (value: Date): string => {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const resetResponseForm = () => {
        setResponseTypeId("");
        setResponseDate(null);
        setResponseDescription("");
        setEditingResponseIndex(null);
    };

    const handleOpenAddResponse = () => {
        resetResponseForm();
        setShowResponseDialog(true);
    };

    const handleOpenEditResponse = (index: number) => {
        const target = state.responses[index];
        if (!target) {
            return;
        }

        setEditingResponseIndex(index);
        setResponseTypeId(target.responseTypeId || "");
        setResponseDate(
            target.responseDate ? new Date(`${target.responseDate}T00:00:00`) : null,
        );
        setResponseDescription(target.description || "");
        setShowResponseDialog(true);
    };

    const handleRemoveResponse = (index: number) => {
        onChange({
            ...state,
            responses: state.responses.filter((_, responseIndex) => responseIndex !== index),
        });
    };

    const handleAddResponse = () => {
        if (!responseTypeId || !responseDate || !responseDescription.trim()) {
            return;
        }

        const nextResponse = {
            responseTypeId,
            responseDate: formatDateForStorage(responseDate),
            description: responseDescription.trim(),
        };

        if (editingResponseIndex === null) {
            onChange({
                ...state,
                responses: [...state.responses, nextResponse],
            });
        } else {
            onChange({
                ...state,
                responses: state.responses.map((item, index) =>
                    index === editingResponseIndex ? nextResponse : item,
                ),
            });
        }

        resetResponseForm();
        setShowResponseDialog(false);
    };
    return (
        <div className="grid gap-4 pb-2">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Additional details</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Document responses, assessments, and official declarations related to this disaster event.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-md bg-blue-100 p-2">
                        <i className="pi pi-flag text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Responses</h3>
                        <p className="text-sm text-slate-600">Track early actions and response operations</p>
                    </div>
                </div>
                <Button
                    type="button"
                    label="Add response"
                    icon="pi pi-plus"
                    size="small"
                    outlined
                    onClick={handleOpenAddResponse}
                />
            </div>

            <div className="grid gap-2">
                {state.responses.length ? (
                    state.responses.map((response, index) => (
                        <div
                            key={`${response.responseTypeId}-${response.responseDate}-${index}`}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <div className="inline-flex rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                                        {getResponseTypeLabel(response.responseTypeId)}
                                    </div>
                                    <p className="text-xs text-slate-500">{response.responseDate || "-"}</p>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{response.description || "-"}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    icon="pi pi-pencil"
                                    text
                                    aria-label="Edit response"
                                    title="Edit response"
                                    onClick={() => handleOpenEditResponse(index)}
                                />
                                <Button
                                    type="button"
                                    icon="pi pi-trash"
                                    text
                                    severity="danger"
                                    aria-label="Remove response"
                                    title="Remove response"
                                    onClick={() => handleRemoveResponse(index)}
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                        No responses added.
                    </div>
                )}
            </div>

            <Dialog
                visible={showResponseDialog}
                onHide={() => {
                    setShowResponseDialog(false);
                    resetResponseForm();
                }}
                header={editingResponseIndex === null ? "Add response" : "Edit response"}
                modal
                style={{ width: "min(36rem, 92vw)" }}
            >
                <div className="grid gap-4">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
                        <Dropdown
                            options={responseTypes}
                            value={responseTypeId}
                            onChange={(e) => setResponseTypeId(e.value || "")}
                            placeholder="Select type"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
                        <Calendar
                            value={responseDate}
                            onChange={(e) => setResponseDate(e.value as Date)}
                            dateFormat="yy-mm-dd"
                            className="w-full"
                            showIcon
                            showButtonBar
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                        <InputTextarea
                            value={responseDescription}
                            onChange={(e) => setResponseDescription(e.target.value)}
                            placeholder="Enter description"
                            rows={4}
                            className="w-full"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            label="Cancel"
                            outlined
                            onClick={() => {
                                setShowResponseDialog(false);
                                resetResponseForm();
                            }}
                        />
                        <Button
                            type="button"
                            label={editingResponseIndex === null ? "Save" : "Update"}
                            onClick={handleAddResponse}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

