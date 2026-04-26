import { PickList } from "primereact/picklist";

interface CausalEventOption {
    id: string;
    nationalSpecification: string;
    recordOriginator: string;
    startDate: string;
}

interface CausalityLinkStepProps {
    causalEventOptions: CausalEventOption[];
    selectedCauseHazardousEventIds: string[];
    onSelectedCauseHazardousEventIdsChange: (values: string[]) => void;
}

export default function CausalityLinkStep({
    causalEventOptions,
    selectedCauseHazardousEventIds,
    onSelectedCauseHazardousEventIdsChange,
}: CausalityLinkStepProps) {
    const selectedRows = causalEventOptions.filter((eventOption) =>
        selectedCauseHazardousEventIds.includes(eventOption.id),
    );

    const availableRows = causalEventOptions.filter(
        (eventOption) => !selectedCauseHazardousEventIds.includes(eventOption.id),
    );

    const itemTemplate = (eventOption: CausalEventOption) => {
        return (
            <div className="flex flex-col gap-1 py-1">
                <span className="font-medium text-slate-800">
                    {eventOption.nationalSpecification || "-"}
                </span>
                <span className="text-sm text-slate-600">
                    Originator: {eventOption.recordOriginator || "-"}
                </span>
                <span className="text-xs text-slate-500">
                    Start: {eventOption.startDate || "-"}
                </span>
            </div>
        );
    };

    return (
        <div className="grid gap-4 pb-2">
            <h2 className="text-lg font-semibold text-slate-800">Cascading hazardous events</h2>
            <p className="text-sm text-slate-600">Select one or more hazardous events that cause this event</p>

            <div className="rounded-lg border border-slate-200">
                <PickList
                    source={availableRows}
                    target={selectedRows}
                    dataKey="id"
                    itemTemplate={itemTemplate}
                    sourceHeader="Available hazardous events"
                    targetHeader="Selected causes"
                    sourceFilterPlaceholder="Search available"
                    targetFilterPlaceholder="Search selected"
                    filterBy="nationalSpecification"
                    showSourceControls={false}
                    showTargetControls={false}
                    filter
                    breakpoint="960px"
                    sourceStyle={{ height: "22rem" }}
                    targetStyle={{ height: "22rem" }}
                    onChange={(event) => {
                        const nextTarget =
                            ((event as { target?: CausalEventOption[] }).target || []);
                        onSelectedCauseHazardousEventIdsChange(
                            nextTarget.map((selectedOption) => selectedOption.id),
                        );
                    }}
                />
            </div>
        </div>
    );
}