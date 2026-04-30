import { useMemo, useRef, useState } from "react";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Panel } from "primereact/panel";
import { Paginator } from "primereact/paginator";
import { Tag } from "primereact/tag";
import { Link, useLocation, useNavigate } from "react-router";

import type { ListDisasterEventsResult } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";

type DisasterEventsPageProps = {
    data: ListDisasterEventsResult;
    countryName: string;
    filters: {
        search: string;
        recordingInstitution: string;
        hazardTypeId: string;
        hazardClusterId: string;
        hazardId: string;
        workflowStatus: string;
        fromDate: string;
        toDate: string;
        myRecords?: boolean;
    };
    usePrimeUiV2: boolean;
    hipTypes: Array<{ id: string; name_en: string }>;
    hipClusters: Array<{ id: string; typeId: string; name_en: string }>;
    hipHazards: Array<{ id: string; clusterId: string; name_en: string }>;
};

const STATUS_OPTIONS = [
    { label: "All statuses", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Waiting for validation", value: "submitted" },
    { label: "Needs revision", value: "revision_requested" },
    { label: "Validated", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Published", value: "published" },
];

function parseDateInput(value: string): Date | null {
    if (!value) {
        return null;
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(value: Date | null): string {
    if (!value) {
        return "";
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function statusTagSeverity(status: string) {
    if (status === "published" || status === "approved") {
        return "success";
    }
    if (status === "rejected") {
        return "danger";
    }
    if (status === "submitted" || status === "revision_requested") {
        return "warning";
    }
    return "info";
}

function statusDisplayLabel(status: string) {
    if (status === "submitted") {
        return "Waiting for validation";
    }
    if (status === "revision_requested" || status === "revisition_requested") {
        return "Needs revision";
    }
    if (status === "approved") {
        return "Validated";
    }
    return status;
}

function shortUuid(value: string) {
    if (!value) return "-";
    return value.slice(0, 5);
}

async function copyUuidToClipboard(value: string) {
    if (!value) {
        return;
    }
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        // Silently ignore clipboard errors.
    }
}

export default function DisasterEventsPage({
    data,
    countryName,
    filters,
    usePrimeUiV2,
    hipTypes,
    hipClusters,
    hipHazards,
}: DisasterEventsPageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPage = Math.max(1, data.pagination.page || 1);
    const pageSize = Math.max(1, data.pagination.pageSize || 25);
    const advancedPanelRef = useRef<Panel>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filterState, setFilterState] = useState({
        search: filters.search,
        recordingInstitution: filters.recordingInstitution,
        hazardTypeId: filters.hazardTypeId,
        hazardClusterId: filters.hazardClusterId,
        hazardId: filters.hazardId,
        workflowStatus: filters.workflowStatus,
        fromDate: parseDateInput(filters.fromDate),
        toDate: parseDateInput(filters.toDate),
        myRecords: filters.myRecords || false,
    });

    const clusterOptions = hipClusters
        .filter((cluster) => !filterState.hazardTypeId || cluster.typeId === filterState.hazardTypeId)
        .map((cluster) => ({ label: cluster.name_en, value: cluster.id }));
    const hazardOptions = hipHazards
        .filter((hazard) => !filterState.hazardClusterId || hazard.clusterId === filterState.hazardClusterId)
        .map((hazard) => ({ label: hazard.name_en, value: hazard.id }));
    const typeOptions = hipTypes.map((type) => ({ label: type.name_en, value: type.id }));

    const handleTypeChange = (value: string) => {
        setFilterState((prev) => ({
            ...prev,
            hazardTypeId: value,
            hazardClusterId: "",
            hazardId: "",
        }));
    };

    const handleClusterChange = (value: string) => {
        setFilterState((prev) => ({
            ...prev,
            hazardClusterId: value,
            hazardId: "",
        }));
    };

    const activeFilterCount = useMemo(() => {
        const values = [
            filterState.search.trim(),
            filterState.recordingInstitution.trim(),
            filterState.hazardTypeId.trim(),
            filterState.hazardClusterId.trim(),
            filterState.hazardId.trim(),
            filterState.workflowStatus.trim(),
            formatDateInput(filterState.fromDate),
            formatDateInput(filterState.toDate),
        ];
        return values.filter((value) => value.length > 0).length + (filterState.myRecords ? 1 : 0);
    }, [filterState]);

    const updatePaginationParams = (nextPage: number, nextPageSize: number) => {
        const params = new URLSearchParams(location.search);
        params.set("page", String(nextPage));
        params.set("pageSize", String(nextPageSize));
        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        });
    };

    const applyFilters = () => {
        const params = new URLSearchParams(location.search);
        const nextSearch = filterState.search.trim();
        const nextRecordingInstitution = filterState.recordingInstitution.trim();
        const nextHazardTypeId = filterState.hazardTypeId.trim();
        const nextHazardClusterId = filterState.hazardClusterId.trim();
        const nextHazardId = filterState.hazardId.trim();
        const nextStatus = filterState.workflowStatus.trim();
        const nextFromDate = formatDateInput(filterState.fromDate);
        const nextToDate = formatDateInput(filterState.toDate);

        if (nextSearch) params.set("search", nextSearch);
        else params.delete("search");

        if (nextRecordingInstitution) {
            params.set("recordingInstitution", nextRecordingInstitution);
        } else {
            params.delete("recordingInstitution");
        }

        if (nextHazardTypeId) params.set("hazardTypeId", nextHazardTypeId);
        else params.delete("hazardTypeId");

        if (nextHazardClusterId) params.set("hazardClusterId", nextHazardClusterId);
        else params.delete("hazardClusterId");

        if (nextHazardId) params.set("hazardId", nextHazardId);
        else params.delete("hazardId");

        if (nextStatus) params.set("workflowStatus", nextStatus);
        else params.delete("workflowStatus");
        params.delete("approvalStatus");

        if (nextFromDate) params.set("fromDate", nextFromDate);
        else params.delete("fromDate");

        if (nextToDate) params.set("toDate", nextToDate);
        else params.delete("toDate");

        if (filterState.myRecords) params.set("myRecords", "true");
        else params.delete("myRecords");

        params.set("page", "1");
        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        });
    };

    const clearFilters = () => {
        setFilterState({
            search: "",
            recordingInstitution: "",
            hazardTypeId: "",
            hazardClusterId: "",
            hazardId: "",
            workflowStatus: "",
            fromDate: null,
            toDate: null,
            myRecords: false,
        });
        navigate({ pathname: location.pathname, search: "" });
    };

    void usePrimeUiV2;

    const statusBodyTemplate = (row: (typeof data.items)[number]) => {
        if (!row.workflowStatus) {
            return <span className="text-gray-500">-</span>;
        }
        return (
            <Tag
                value={statusDisplayLabel(row.workflowStatus)}
                severity={statusTagSeverity(row.workflowStatus)}
            />
        );
    };

    const dateBodyTemplate = (value: Date | null) => {
        if (!value) {
            return "-";
        }

        return value.toLocaleDateString("en-CA");
    };

    const actionsBodyTemplate = (row: (typeof data.items)[number]) => (
        <div className="flex w-full items-center justify-end gap-1">
            <Link to={`/disaster-event/${row.id}`}>
                <Button
                    type="button"
                    text
                    aria-label="View"
                >
                    <i className="pi pi-eye" aria-hidden="true" />
                </Button>
            </Link>
            <Link to={`/disaster-event/${row.id}/edit`}>
                <Button
                    type="button"
                    text
                    aria-label="Edit"
                >
                    <i className="pi pi-pencil" aria-hidden="true" />
                </Button>
            </Link>
            <Link to={`/disaster-event/${row.id}/delete`}>
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

    return (
        <div className="p-8">
            <Card className="shadow-sm border border-slate-200">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">Disaster Events</h1>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                            {data.pagination.totalItems} Disaster events in {countryName}
                        </p>
                        <p className="text-sm text-slate-500">Disaster event data management</p>
                    </div>
                    <Link to="/disaster-event/new">
                        <Button
                            label="Create New"
                            icon="pi pi-plus"
                            raised
                        />
                    </Link>
                </div>

                <div className="mb-4">
                    <Card className="border border-slate-200 !bg-slate-50">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="de-event-name" className="font-medium text-slate-600">
                                    Disaster event name
                                </label>
                                <InputText
                                    id="de-event-name"
                                    value={filterState.search}
                                    onChange={(event) => setFilterState((prev) => ({ ...prev, search: event.target.value }))}
                                    placeholder="Search by event name..."
                                    className="w-64 p-inputtext-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="de-recording-organization" className="font-medium text-slate-600">
                                    Recording organization
                                </label>
                                <InputText
                                    id="de-recording-organization"
                                    value={filterState.recordingInstitution}
                                    onChange={(event) => setFilterState((prev) => ({ ...prev, recordingInstitution: event.target.value }))}
                                    placeholder="Search organization"
                                    className="w-64 p-inputtext-sm"
                                />
                            </div>
                            <Button
                                label={showAdvanced ? `Hide Advanced${activeFilterCount ? ` (${activeFilterCount})` : ""}` : `Advanced Filters${activeFilterCount ? ` (${activeFilterCount})` : ""}`}
                                icon={showAdvanced ? "pi pi-chevron-up" : "pi pi-sliders-h"}
                                outlined
                                size="small"
                                type="button"
                                onClick={(event) => advancedPanelRef.current?.toggle(event)}
                            />
                        </div>

                        <Panel
                            ref={advancedPanelRef}
                            header=""
                            toggleable
                            collapsed={!showAdvanced}
                            onToggle={(event) => setShowAdvanced(!event.value)}
                            transitionOptions={{ timeout: 700 }}
                            className="mt-4 overflow-hidden rounded-xl border border-slate-200 [&_.p-panel-header]:!hidden [&_.p-panel-toggler]:!hidden"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="de-hazard-type" className="text-slate-600">
                                            Hazard Type
                                        </label>
                                        <Dropdown
                                            inputId="de-hazard-type"
                                            value={filterState.hazardTypeId || null}
                                            options={typeOptions}
                                            onChange={(event) => handleTypeChange(event.value || "")}
                                            placeholder="All types"
                                            showClear
                                            filter
                                            className="w-48 p-inputtext-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="de-hazard-cluster" className="text-slate-600">
                                            Hazard Cluster
                                        </label>
                                        <Dropdown
                                            inputId="de-hazard-cluster"
                                            value={filterState.hazardClusterId || null}
                                            options={clusterOptions}
                                            onChange={(event) => handleClusterChange(event.value || "")}
                                            placeholder="All clusters"
                                            showClear
                                            filter
                                            disabled={!filterState.hazardTypeId}
                                            className="w-48 p-inputtext-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="de-specific-hazard" className="text-slate-600">
                                            Specific Hazard
                                        </label>
                                        <Dropdown
                                            inputId="de-specific-hazard"
                                            value={filterState.hazardId || null}
                                            options={hazardOptions}
                                            onChange={(event) => setFilterState((prev) => ({ ...prev, hazardId: event.value || "" }))}
                                            placeholder="All hazards"
                                            showClear
                                            filter
                                            disabled={!filterState.hazardClusterId}
                                            className="w-48 p-inputtext-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="de-status" className="text-slate-600">
                                            Record Status
                                        </label>
                                        <Dropdown
                                            inputId="de-status"
                                            value={filterState.workflowStatus || null}
                                            onChange={(event) => setFilterState((prev) => ({ ...prev, workflowStatus: event.value || "" }))}
                                            options={STATUS_OPTIONS}
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="All statuses"
                                            className="w-48 p-inputtext-sm"
                                            showClear
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="de-from" className="text-slate-600">
                                            From Date
                                        </label>
                                        <Calendar
                                            id="de-from"
                                            value={filterState.fromDate}
                                            onChange={(event) => setFilterState((prev) => ({ ...prev, fromDate: (event.value as Date | null) ?? null }))}
                                            dateFormat="yy-mm-dd"
                                            showIcon
                                            showButtonBar
                                            className="p-inputtext-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="de-to" className="text-slate-600">
                                            To Date
                                        </label>
                                        <Calendar
                                            id="de-to"
                                            value={filterState.toDate}
                                            onChange={(event) => setFilterState((prev) => ({ ...prev, toDate: (event.value as Date | null) ?? null }))}
                                            dateFormat="yy-mm-dd"
                                            showIcon
                                            showButtonBar
                                            className="p-inputtext-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        inputId="de-my-records"
                                        checked={filterState.myRecords}
                                        onChange={(e) => setFilterState((prev) => ({ ...prev, myRecords: e.checked ?? false }))}
                                    />
                                    <label htmlFor="de-my-records" className="cursor-pointer text-slate-700">
                                        My records only
                                    </label>
                                </div>
                            </div>
                        </Panel>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <Button
                                label="Apply"
                                icon="pi pi-search"
                                size="small"
                                type="button"
                                onClick={applyFilters}
                            />
                            <Button
                                label="Reset"
                                icon="pi pi-times"
                                text
                                size="small"
                                type="button"
                                onClick={clearFilters}
                            />
                        </div>
                    </Card>
                </div>

                <div className="w-full overflow-x-auto rounded-lg border border-slate-200 [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-[72rem] [&_.p-datatable-table]:table-auto">
                    <DataTable
                        value={data.items}
                        dataKey="id"
                        emptyMessage="No disaster events found"
                        stripedRows
                        size="small"
                        className="w-full"
                        tableClassName="!table w-full min-w-[72rem] table-auto border-collapse text-sm md:text-base"
                    >
                        <Column
                            header="Status"
                            body={statusBodyTemplate}
                            headerClassName="min-w-[9rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[9rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="nameNational"
                            header="Disaster event name"
                            headerClassName="min-w-[14rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[14rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="recordingInstitution"
                            header="Recording organization"
                            headerClassName="min-w-[14rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[14rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="id"
                            header="UUID"
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
                            headerClassName="min-w-[10rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[10rem] px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            header=""
                            body={actionsBodyTemplate}
                            headerClassName="min-w-[8rem] bg-gray-100 px-2 py-3 border-b border-gray-200"
                            bodyClassName="min-w-[8rem] px-2 py-3 border-b border-gray-200"
                        />
                    </DataTable>
                </div>

                {data.pagination.totalItems > 0 ? (
                    <Paginator
                        first={(currentPage - 1) * pageSize}
                        rows={pageSize}
                        totalRecords={data.pagination.totalItems}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        onPageChange={(event) => {
                            updatePaginationParams(event.page + 1, event.rows);
                        }}
                        className="mt-4 !justify-end"
                    />
                ) : null}
            </Card>
        </div>
    );
}
