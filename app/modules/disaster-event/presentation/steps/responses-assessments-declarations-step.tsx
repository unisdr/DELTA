import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";

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
    assessmentTypes,
}: RADStepProps) {
    return (
        <div className="grid gap-4 mt-2">
            <section className="grid gap-2">
                <h4 className="font-semibold">Responses</h4>
                {state.responses.map((item, idx) => (
                    <div
                        key={idx}
                        className="grid md:grid-cols-4 gap-2 items-end"
                    >
                        <Dropdown
                            options={responseTypes}
                            value={item.responseTypeId || null}
                            onChange={(e) => {
                                const next = [...state.responses];
                                next[idx] = { ...next[idx], responseTypeId: e.value || "" };
                                onChange({ ...state, responses: next });
                            }}
                            placeholder="Type"
                        />
                        <InputText
                            type="date"
                            value={item.responseDate}
                            onChange={(e) => {
                                const next = [...state.responses];
                                next[idx] = { ...next[idx], responseDate: e.target.value };
                                onChange({ ...state, responses: next });
                            }}
                        />
                        <InputText
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => {
                                const next = [...state.responses];
                                next[idx] = { ...next[idx], description: e.target.value };
                                onChange({ ...state, responses: next });
                            }}
                        />
                        <Button
                            type="button"
                            label="Remove"
                            severity="danger"
                            onClick={() =>
                                onChange({
                                    ...state,
                                    responses: state.responses.filter((_, i) => i !== idx),
                                })
                            }
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    label="Add response"
                    onClick={() =>
                        onChange({
                            ...state,
                            responses: [
                                ...state.responses,
                                { responseTypeId: "", responseDate: "", description: "" },
                            ],
                        })
                    }
                />
            </section>

            <section className="grid gap-2">
                <h4 className="font-semibold">Assessments</h4>
                {state.assessments.map((item, idx) => (
                    <div
                        key={idx}
                        className="grid md:grid-cols-4 gap-2 items-end"
                    >
                        <Dropdown
                            options={assessmentTypes}
                            value={item.assessmentTypeId || null}
                            onChange={(e) => {
                                const next = [...state.assessments];
                                next[idx] = { ...next[idx], assessmentTypeId: e.value || "" };
                                onChange({ ...state, assessments: next });
                            }}
                            placeholder="Type"
                        />
                        <InputText
                            type="date"
                            value={item.assessmentDate}
                            onChange={(e) => {
                                const next = [...state.assessments];
                                next[idx] = { ...next[idx], assessmentDate: e.target.value };
                                onChange({ ...state, assessments: next });
                            }}
                        />
                        <InputText
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => {
                                const next = [...state.assessments];
                                next[idx] = { ...next[idx], description: e.target.value };
                                onChange({ ...state, assessments: next });
                            }}
                        />
                        <Button
                            type="button"
                            label="Remove"
                            severity="danger"
                            onClick={() =>
                                onChange({
                                    ...state,
                                    assessments: state.assessments.filter((_, i) => i !== idx),
                                })
                            }
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    label="Add assessment"
                    onClick={() =>
                        onChange({
                            ...state,
                            assessments: [
                                ...state.assessments,
                                { assessmentTypeId: "", assessmentDate: "", description: "" },
                            ],
                        })
                    }
                />
            </section>

            <section className="grid gap-2">
                <h4 className="font-semibold">Declarations</h4>
                {state.declarations.map((item, idx) => (
                    <div
                        key={idx}
                        className="grid md:grid-cols-3 gap-2 items-end"
                    >
                        <InputText
                            type="date"
                            value={item.declarationDate}
                            onChange={(e) => {
                                const next = [...state.declarations];
                                next[idx] = {
                                    ...next[idx],
                                    declarationDate: e.target.value,
                                };
                                onChange({ ...state, declarations: next });
                            }}
                        />
                        <InputText
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => {
                                const next = [...state.declarations];
                                next[idx] = { ...next[idx], description: e.target.value };
                                onChange({ ...state, declarations: next });
                            }}
                        />
                        <Button
                            type="button"
                            label="Remove"
                            severity="danger"
                            onClick={() =>
                                onChange({
                                    ...state,
                                    declarations: state.declarations.filter((_, i) => i !== idx),
                                })
                            }
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    label="Add declaration"
                    onClick={() =>
                        onChange({
                            ...state,
                            declarations: [
                                ...state.declarations,
                                { declarationDate: "", description: "" },
                            ],
                        })
                    }
                />
            </section>
        </div>
    );
}
