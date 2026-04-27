import { PickList } from "primereact/picklist";

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
    disasterOptions: _disasterOptions,
    hazardousOptions,
}: CausalityLinksStepProps) {
    const triggerCausalIds = state.hazardousCausalities
        .filter((item) => item.causeType === "HE_CAUSE_DE" && item.hazardousEventId)
        .map((item) => item.hazardousEventId);

    const triggeredSubsequentIds = state.hazardousCausalities
        .filter((item) => item.causeType === "DE_CAUSE_HE" && item.hazardousEventId)
        .map((item) => item.hazardousEventId);

    const triggeringTargets = hazardousOptions.filter((option) =>
        triggerCausalIds.includes(option.value),
    );
    const triggeringSource = hazardousOptions.filter(
        (option) => !triggerCausalIds.includes(option.value),
    );

    const triggeredTargets = hazardousOptions.filter((option) =>
        triggeredSubsequentIds.includes(option.value),
    );
    const triggeredSource = hazardousOptions.filter(
        (option) => !triggeredSubsequentIds.includes(option.value),
    );

    const itemTemplate = (eventOption: Option) => {
        return (
            <div className="flex flex-col gap-1 py-1">
                <span className="font-medium text-slate-800">{eventOption.label || "-"}</span>
                <span className="text-xs text-slate-500">ID: {eventOption.value}</span>
            </div>
        );
    };

    const mergeHazardousCausalities = (nextIds: string[], causeType: "HE_CAUSE_DE" | "DE_CAUSE_HE") => {
        const uniqueIds = [...new Set(nextIds)];
        const otherDirection = state.hazardousCausalities.filter((item) => item.causeType !== causeType);
        const mapped = uniqueIds.map((hazardousEventId) => ({
            hazardousEventId,
            causeType,
        }));

        onChange({
            ...state,
            hazardousCausalities: [...otherDirection, ...mapped],
        });
    };

    return (
        <div className="grid gap-4 mt-2">
            <div className="mb-2">
                <h3 className="text-lg font-semibold text-slate-800">Linked events</h3>
                <p className="text-sm text-slate-600">
                    Define relationships between this event and other system records.
                </p>
            </div>

            <div className="mb-2">
                <h4 className="font-semibold text-slate-800">Linked hazardous events</h4>
                <p className="text-sm text-slate-600">
                    Link this disaster event to related hazardous events.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                    <h5 className="text-sm font-semibold text-slate-700">Triggering (causal) event</h5>
                    <div className="rounded-lg border border-slate-200">
                        <PickList
                            source={triggeringSource}
                            target={triggeringTargets}
                            dataKey="value"
                            itemTemplate={itemTemplate}
                            sourceHeader="Available hazardous events"
                            targetHeader="Selected events"
                            sourceFilterPlaceholder="Search available"
                            targetFilterPlaceholder="Search selected"
                            filterBy="label"
                            showSourceControls={false}
                            showTargetControls={false}
                            filter
                            breakpoint="960px"
                            sourceStyle={{ height: "18rem" }}
                            targetStyle={{ height: "18rem" }}
                            onChange={(event) => {
                                const nextTarget = ((event as { target?: Option[] }).target || []);
                                mergeHazardousCausalities(
                                    nextTarget.map((selectedOption) => selectedOption.value),
                                    "HE_CAUSE_DE",
                                );
                            }}
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <h5 className="text-sm font-semibold text-slate-700">Triggered (subsequent) event</h5>
                    <div className="rounded-lg border border-slate-200">
                        <PickList
                            source={triggeredSource}
                            target={triggeredTargets}
                            dataKey="value"
                            itemTemplate={itemTemplate}
                            sourceHeader="Available hazardous events"
                            targetHeader="Selected events"
                            sourceFilterPlaceholder="Search available"
                            targetFilterPlaceholder="Search selected"
                            filterBy="label"
                            showSourceControls={false}
                            showTargetControls={false}
                            filter
                            breakpoint="960px"
                            sourceStyle={{ height: "18rem" }}
                            targetStyle={{ height: "18rem" }}
                            onChange={(event) => {
                                const nextTarget = ((event as { target?: Option[] }).target || []);
                                mergeHazardousCausalities(
                                    nextTarget.map((selectedOption) => selectedOption.value),
                                    "DE_CAUSE_HE",
                                );
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="mb-2">
                <h4 className="font-semibold text-slate-800">Linked disaster events</h4>
                <p className="text-sm text-slate-600">
                    Link this disaster event to its cause or its consequences.
                </p>
            </div>
        </div>
    );
}
