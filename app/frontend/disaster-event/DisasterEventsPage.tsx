import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ViewContext } from "../context";


type DisasterEventsPageProps = {
    data: any[];
    pagination?: {
        totalItems: number;
        itemsOnThisPage: number;
        page: number;
        pageSize: number;
    };
    countryName?: string;
    filters?: {
        disasterEventName?: string;
        recordingOrganization?: string;
        viewMyRecords?: boolean;
        pendingMyAction?: boolean;
    };
};


export default function DisasterEventsPage({
    data,
    pagination,
    countryName,
    filters,
}: DisasterEventsPageProps) {
    const ctx = new ViewContext();
    const toast = useRef<Toast>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [disasterEventNameFilter, setDisasterEventNameFilter] = useState(
        filters?.disasterEventName ?? "",
    );
    const [recordingOrganizationFilter, setRecordingOrganizationFilter] = useState(
        filters?.recordingOrganization ?? "",
    );
    const [viewMyRecordsChecked, setViewMyRecordsChecked] = useState(
        filters?.viewMyRecords ?? false,
    );
    const [pendingMyActionChecked, setPendingMyActionChecked] = useState(
        filters?.pendingMyAction ?? false,
    );

    useEffect(() => {
        setDisasterEventNameFilter(filters?.disasterEventName ?? "");
        setRecordingOrganizationFilter(filters?.recordingOrganization ?? "");
        setViewMyRecordsChecked(filters?.viewMyRecords ?? false);
        setPendingMyActionChecked(filters?.pendingMyAction ?? false);
    }, [
        filters?.disasterEventName,
        filters?.recordingOrganization,
        filters?.viewMyRecords,
        filters?.pendingMyAction,
    ]);

    const updateFilterParam = (paramName: string, value: string) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        if (value.trim()) {
            nextSearchParams.set(paramName, value);
        } else {
            nextSearchParams.delete(paramName);
        }
        nextSearchParams.delete("page");
        setSearchParams(nextSearchParams, { replace: true });
    };

    const getStatusCircleClassName = (status: unknown) => {
        const normalizedStatus =
            typeof status === "string"
                ? status.trim().toLowerCase().replaceAll(" ", "-")
                : "";

        switch (normalizedStatus) {
            case "waiting-for-validation":
                return "h-2.5 w-2.5 rounded-full bg-[#D87838]";
            case "needs-revision":
                return "h-2.5 w-2.5 rounded-full bg-[#AD66A1]";
            case "validated":
                return "h-2.5 w-2.5 rounded-full bg-[#106CB8]";
            case "published":
                return "h-2.5 w-2.5 rounded-full bg-[#6D9A75]";
            case "draft":
            default:
                return "h-2.5 w-2.5 rounded-full border border-[#E2E8F0] bg-white";
        }
    };

    const actionsBodyTemplate = (row: (typeof data)[number]) => (
        <div className="flex w-full items-center justify-end gap-1">
            <Link to={`/${ctx.lang}/disaster-event/${row.id}`}>
                <Button
                    type="button"
                    text
                    aria-label="View"
                >
                    <i className="pi pi-eye" aria-hidden="true" />
                </Button>
            </Link>
            <Link to={`/${ctx.lang}/disaster-event/edit/${row.id}`}>
                <Button
                    type="button"
                    text
                    aria-label="Edit"
                >
                    <i className="pi pi-pencil" aria-hidden="true" />
                </Button>
            </Link>
            <Link to={``}>
                <Button
                    type="button"
                    text
                    severity="danger"
                    aria-label="Delete"
                >
                    <i className="pi pi-trash" aria-hidden="true" />
                </Button>
            </Link>
        </div>
    );
    const statusBodyTemplate = (row: (typeof data)[number]) => {
        return (
            <span className="inline-flex items-center" title={String(row.approvalStatus ?? "") || undefined}>
                <span
                    className={`${getStatusCircleClassName(row.approvalStatus)} shadow-[0_1px_2px_rgba(15,23,42,0.35)]`}
                    aria-hidden="true"
                />
            </span>
        );
    };
    function shortUuid(value: string) {
        if (!value) return "-";
        return value.slice(0, 6);
    }
    async function copyUuidToClipboard(value: string) {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            toast.current?.show({
                severity: "success",
                summary: "Copied",
                detail: `UUID ${shortUuid(value)}… copied to clipboard`,
                life: 2000,
            });
        } catch {
            toast.current?.show({
                severity: "error",
                summary: "Failed",
                detail: "Could not copy to clipboard",
                life: 3000,
            });
        }
    }

    const dateBodyTemplate = (value: Date | string | number | null | undefined) => {
        if (value == null || value === "") {
            return "-";
        }

        const dateValue =
            value instanceof Date ? value : new Date(value);

        if (Number.isNaN(dateValue.getTime())) {
            return "-";
        }

        return dateValue.toLocaleDateString("en-CA");
    };

    const getDisasterEventName = (row: (typeof data)[number]) =>
        row.nameNational?.trim() || row.nameGlobalOrRegional?.trim() || "";

    return (
        <div id="disaster-events-page" className="py-8 px-[272px]">
            <Toast ref={toast} />
            <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                            {pagination?.totalItems} Disaster events in {countryName}
                        </p>
                        <p className="text-sm text-[#334155]">Disaster event data management</p>
                    </div>
                    <Link to={`/${ctx.lang}/disaster-event/edit/new`}>
                        <Button
                            label="Add new event "
                            icon="pi pi-plus"
                            raised
                        />
                    </Link>
                </div>

                <div
                    id="filtersCard"
                    className="mb-6 min-h-[4rem] rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-full min-w-[16rem] flex-1">
                            <label
                                htmlFor="disaster-event-name-filter"
                                className="mb-2 block text-sm font-medium text-slate-900"
                            >
                                Disaster event name
                            </label>
                            <div className="relative">
                                <InputText
                                    id="disaster-event-name-filter"
                                    type="text"
                                    placeholder="Search disaster event name..."
                                    className="w-full pr-10"
                                    value={disasterEventNameFilter}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setDisasterEventNameFilter(nextValue);
                                        updateFilterParam("disasterEventName", nextValue);
                                    }}
                                />
                                <i
                                    className="pi pi-search pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>

                        <div className="w-full min-w-[16rem] flex-1">
                            <label
                                htmlFor="recording-organization-filter"
                                className="mb-2 block text-sm font-medium text-slate-900"
                            >
                                Recording organization
                            </label>
                            <div className="relative">
                                <InputText
                                    id="recording-organization-filter"
                                    type="text"
                                    placeholder="Search organization"
                                    className="w-full pr-10"
                                    value={recordingOrganizationFilter}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setRecordingOrganizationFilter(nextValue);
                                        updateFilterParam("recordingOrganization", nextValue);
                                    }}
                                />
                                <i
                                    className="pi pi-search pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>

                    </div>

                    <div className="mt-6 border-t border-slate-200" aria-hidden="true" />

                    <div className="mt-4 flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                inputId="view-my-records-filter"
                                checked={viewMyRecordsChecked}
                                onChange={(e) => {
                                    const isChecked = Boolean(e.checked);
                                    setViewMyRecordsChecked(isChecked);
                                    updateFilterParam(
                                        "viewMyRecords",
                                        isChecked ? "true" : "",
                                    );
                                }}
                            />
                            <label
                                htmlFor="view-my-records-filter"
                                className="text-sm font-medium text-slate-900"
                            >
                                View my records
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                inputId="pending-my-action-filter"
                                checked={pendingMyActionChecked}
                                onChange={(e) => {
                                    const isChecked = Boolean(e.checked);
                                    setPendingMyActionChecked(isChecked);
                                    updateFilterParam(
                                        "pendingMyAction",
                                        isChecked ? "true" : "",
                                    );
                                }}
                            />
                            <label
                                htmlFor="pending-my-action-filter"
                                className="text-sm font-medium text-slate-900"
                            >
                                Pending my action
                            </label>
                        </div>
                    </div>
                </div>

                <div
                    id="statusLegend"
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700"
                >
                    <span className="font-semibold text-slate-900">Status Legend</span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("draft")} />
                        <span>Draft</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("waiting-for-validation")} />
                        <span>Waiting for validation</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("needs-revision")} />
                        <span>Needs revision</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("validated")} />
                        <span>Validated</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("published")} />
                        <span>Published</span>
                    </span>
                </div>

                <div className="my-6 border-t border-slate-200" aria-hidden="true" />

                <div className="w-full overflow-x-auto rounded-lg border border-slate-200 [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-[72rem] [&_.p-datatable-table]:table-auto">
                    <DataTable
                        value={data}
                        dataKey="id"
                        emptyMessage="No disaster events found"
                        sortMode="multiple"
                        removableSort
                        size="small"
                        className="w-full"
                        tableClassName="!table w-full min-w-[72rem] table-auto border-collapse text-sm md:text-base"
                    >
                        <Column
                            field="approvalStatus"
                            header="Status"
                            body={statusBodyTemplate}
                            sortable
                            headerClassName="min-w-[9rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[9rem] px-2 py-3 border-b border-gray-200"
                            bodyStyle={{ textAlign: 'center' }}
                            pt={{
                                headerContent: { style: { justifyContent: 'center' } },
                            }}
                        />
                        <Column
                            field="nameNational"
                            header="Disaster event name"
                            sortable
                            body={(row) => getDisasterEventName(row)}
                            headerClassName="min-w-[14rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[14rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="recordingInstitution"
                            header="Recording organization"
                            sortable
                            headerClassName="min-w-[14rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[14rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="id"
                            header="UUID"
                            sortable
                            headerClassName="min-w-[9rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[9rem] px-2 py-3 border-b border-gray-200"
                            body={(row) => (
                                <div className="flex items-center gap-1">
                                    <span>{shortUuid(row.id)}</span>
                                    <Button
                                        type="button"
                                        icon="pi pi-copy"
                                        text
                                        size="small"
                                        title="Copy UUID"
                                        aria-label="Copy UUID"
                                        onClick={() => {
                                            void copyUuidToClipboard(row.id);
                                        }}
                                    />
                                </div>
                            )}
                        />
                        <Column
                            field="startDate"
                            header="Event start date"
                            body={(row) => dateBodyTemplate(row.startDate)}
                            sortable
                            headerClassName="min-w-[10rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[10rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="linkedRecordsCount"
                            header="Linked records"
                            sortable
                            body={(row) => (
                                <Link
                                    to={`/${ctx.lang}/disaster-record?disasterEventUUID=${encodeURIComponent(row.id)}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {row.linkedRecordsCount ?? 0}
                                </Link>
                            )}
                            bodyStyle={{ textAlign: 'center' }}
                            pt={{
                                headerContent: { style: { justifyContent: 'center' } },
                            }}
                        />

                        <Column
                            header=""
                            body={actionsBodyTemplate}
                            headerClassName="min-w-[8rem] bg-gray-100 px-2 py-3 border-b border-gray-200"
                            bodyClassName="min-w-[8rem] px-2 py-3 border-b border-gray-200"
                        />
                    </DataTable>
                </div>

            </div>
        </div>
    );
}