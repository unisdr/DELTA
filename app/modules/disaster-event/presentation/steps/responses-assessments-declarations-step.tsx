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
    const [responseTypeId, setResponseTypeId] = useState("");
    const [responseDate, setResponseDate] = useState<Date | null>(null);
    const [responseDescription, setResponseDescription] = useState("");

    const handleAddResponse = () => {
        if (!responseTypeId || !responseDate || !responseDescription.trim()) {
            return;
        }

        const dateString = responseDate.toISOString().split("T")[0];
        onChange({
            ...state,
            responses: [
                ...state.responses,
                {
                    responseTypeId,
                    responseDate: dateString,
                    description: responseDescription,
                },
            ],
        });

        setResponseTypeId("");
        setResponseDate(null);
        setResponseDescription("");
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
                    onClick={() => setShowResponseDialog(true)}
                />
            </div>

            <Dialog
                visible={showResponseDialog}
                onHide={() => setShowResponseDialog(false)}
                header="Add response"
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
                            onClick={() => setShowResponseDialog(false)}
                        />
                        <Button
                            type="button"
                            label="Save"
                            onClick={handleAddResponse}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

