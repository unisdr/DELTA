import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

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

    return (
        <div className="grid gap-4 pb-2">
            <h2 className="text-lg font-semibold text-slate-800">Cascading hazardous events</h2>
            <p className="text-sm text-slate-600">Select one or more hazardous events that cause this event</p>

            <div className="rounded-lg border border-slate-200">
                <DataTable
                    value={causalEventOptions}
                    dataKey="id"
                    selection={selectedRows}
                    selectionMode="checkbox"
                    onSelectionChange={(event) => {
                        const nextSelection =
                            (((event as { value?: CausalEventOption[] | null }).value as
                                | CausalEventOption[]
                                | null) || []);
                        onSelectedCauseHazardousEventIdsChange(
                            nextSelection.map((selectedOption) => selectedOption.id),
                        );
                    }}
                    stripedRows
                    size="small"
                    className="text-sm"
                    emptyMessage="No hazardous events available to link"
                    paginator
                    rows={8}
                    rowsPerPageOptions={[8, 16, 32]}
                >
                    <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
                    <Column
                        field="nationalSpecification"
                        header="National specification"
                        body={(row: CausalEventOption) => row.nationalSpecification || "-"}
                    />
                    <Column
                        field="recordOriginator"
                        header="Record originator"
                        body={(row: CausalEventOption) => row.recordOriginator || "-"}
                    />
                    <Column
                        field="startDate"
                        header="Start date"
                        body={(row: CausalEventOption) => row.startDate || "-"}
                    />
                </DataTable>
            </div>
        </div>
    );
}