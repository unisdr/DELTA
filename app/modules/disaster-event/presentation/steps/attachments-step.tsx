import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type AttachmentsStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
};

export default function AttachmentsStep({ state, onChange }: AttachmentsStepProps) {
    const ids = state.disasterEventAttachmentIds;

    return (
        <div className="grid gap-3 mt-2">
            {ids.map((id, idx) => (
                <div
                    key={idx}
                    className="flex gap-2 items-center border rounded p-2"
                >
                    <InputText
                        className="flex-1"
                        placeholder="Attachment ID"
                        value={id}
                        onChange={(e) => {
                            const next = [...ids];
                            next[idx] = e.target.value;
                            onChange({ ...state, disasterEventAttachmentIds: next });
                        }}
                    />
                    <Button
                        type="button"
                        label="Remove"
                        severity="danger"
                        onClick={() =>
                            onChange({
                                ...state,
                                disasterEventAttachmentIds: ids.filter((_, i) => i !== idx),
                            })
                        }
                    />
                </div>
            ))}
            <Button
                type="button"
                label="Add attachment"
                onClick={() =>
                    onChange({
                        ...state,
                        disasterEventAttachmentIds: [...ids, ""],
                    })
                }
            />
        </div>
    );
}
