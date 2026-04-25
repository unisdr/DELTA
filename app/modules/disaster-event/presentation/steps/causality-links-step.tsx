import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";

import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type CausalityLinksStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    disasterOptions: Option[];
    hazardousOptions: Option[];
};

export default function CausalityLinksStep({
    state,
    onChange,
    disasterOptions,
    hazardousOptions,
}: CausalityLinksStepProps) {
    return (
        <div className="grid gap-4 mt-2">
            <section className="grid gap-2">
                <h4 className="font-semibold">Disaster to Disaster</h4>
                {state.causedByDisasters.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex gap-2 items-center"
                    >
                        <Dropdown
                            className="w-full"
                            value={item.causeDisasterId || null}
                            onChange={(e) => {
                                const next = [...state.causedByDisasters];
                                next[idx] = { causeDisasterId: e.value || "" };
                                onChange({ ...state, causedByDisasters: next });
                            }}
                            options={disasterOptions}
                            filter
                            placeholder="Cause disaster"
                        />
                        <Button
                            type="button"
                            severity="danger"
                            label="Remove"
                            onClick={() =>
                                onChange({
                                    ...state,
                                    causedByDisasters: state.causedByDisasters.filter(
                                        (_, i) => i !== idx,
                                    ),
                                })
                            }
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    label="Add disaster link"
                    onClick={() =>
                        onChange({
                            ...state,
                            causedByDisasters: [
                                ...state.causedByDisasters,
                                { causeDisasterId: "" },
                            ],
                        })
                    }
                />
            </section>

            <section className="grid gap-2">
                <h4 className="font-semibold">Disaster to Hazardous Event</h4>
                {state.hazardousCausalities.map((item, idx) => (
                    <div
                        key={idx}
                        className="grid md:grid-cols-3 gap-2 items-center"
                    >
                        <Dropdown
                            value={item.hazardousEventId || null}
                            onChange={(e) => {
                                const next = [...state.hazardousCausalities];
                                next[idx] = {
                                    ...next[idx],
                                    hazardousEventId: e.value || "",
                                };
                                onChange({ ...state, hazardousCausalities: next });
                            }}
                            options={hazardousOptions}
                            filter
                            placeholder="Hazardous event"
                        />
                        <Dropdown
                            value={item.causeType}
                            onChange={(e) => {
                                const next = [...state.hazardousCausalities];
                                next[idx] = {
                                    ...next[idx],
                                    causeType: e.value,
                                };
                                onChange({ ...state, hazardousCausalities: next });
                            }}
                            options={[
                                { label: "Disaster causes hazardous event", value: "DE_CAUSE_HE" },
                                { label: "Hazardous event causes disaster", value: "HE_CAUSE_DE" },
                            ]}
                        />
                        <Button
                            type="button"
                            severity="danger"
                            label="Remove"
                            onClick={() =>
                                onChange({
                                    ...state,
                                    hazardousCausalities: state.hazardousCausalities.filter(
                                        (_, i) => i !== idx,
                                    ),
                                })
                            }
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    label="Add hazardous link"
                    onClick={() =>
                        onChange({
                            ...state,
                            hazardousCausalities: [
                                ...state.hazardousCausalities,
                                {
                                    hazardousEventId: "",
                                    causeType: "DE_CAUSE_HE",
                                },
                            ],
                        })
                    }
                />
            </section>
        </div>
    );
}
