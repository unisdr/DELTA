import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";

import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type AttachmentsStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
};

export default function AttachmentsStep({ state, onChange }: AttachmentsStepProps) {
    return (
        <div className="grid gap-3 mt-2">
            {state.attachments.map((item, idx) => (
                <div
                    key={idx}
                    className="grid md:grid-cols-5 gap-2 items-end border rounded p-2"
                >
                    <InputText
                        placeholder="Title"
                        value={item.title}
                        onChange={(e) => {
                            const next = [...state.attachments];
                            next[idx] = { ...next[idx], title: e.target.value };
                            onChange({ ...state, attachments: next });
                        }}
                    />
                    <InputText
                        placeholder="File Key"
                        value={item.fileKey}
                        onChange={(e) => {
                            const next = [...state.attachments];
                            next[idx] = { ...next[idx], fileKey: e.target.value };
                            onChange({ ...state, attachments: next });
                        }}
                    />
                    <InputText
                        placeholder="File Name"
                        value={item.fileName}
                        onChange={(e) => {
                            const next = [...state.attachments];
                            next[idx] = { ...next[idx], fileName: e.target.value };
                            onChange({ ...state, attachments: next });
                        }}
                    />
                    <InputText
                        placeholder="File Type"
                        value={item.fileType}
                        onChange={(e) => {
                            const next = [...state.attachments];
                            next[idx] = { ...next[idx], fileType: e.target.value };
                            onChange({ ...state, attachments: next });
                        }}
                    />
                    <div className="flex gap-2">
                        <InputNumber
                            placeholder="Size"
                            value={item.fileSize}
                            onValueChange={(e) => {
                                const next = [...state.attachments];
                                next[idx] = {
                                    ...next[idx],
                                    fileSize: Number(e.value || 0),
                                };
                                onChange({ ...state, attachments: next });
                            }}
                        />
                        <Button
                            type="button"
                            label="Remove"
                            severity="danger"
                            onClick={() =>
                                onChange({
                                    ...state,
                                    attachments: state.attachments.filter((_, i) => i !== idx),
                                })
                            }
                        />
                    </div>
                </div>
            ))}
            <Button
                type="button"
                label="Add attachment"
                onClick={() =>
                    onChange({
                        ...state,
                        attachments: [
                            ...state.attachments,
                            { title: "", fileKey: "", fileName: "", fileType: "", fileSize: 0 },
                        ],
                    })
                }
            />
        </div>
    );
}
