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
import { useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import type { DataTableSortEvent } from "primereact/datatable";

import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type { ListHazardousEventsResult } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface HazardousEventsPageProps {
    data: ListHazardousEventsResult;
    filters: {
        search?: string;
        sortField?:
        | "workflowStatus"
        | "nationalSpecification"
        | "specificHazard"
        | "recordOriginator"
        | "id"
        | "startDate"
        | "updatedAt";
        sortOrder?: 1 | -1;
        hazardTypeId?: string;
        hazardClusterId?: string;
        hazardId?: string;
        recordOriginatorFilter?: string;
        hazardousEventStatus?: string;
        workflowStatusFilter?: string;
        startDateFrom?: Date | null;
        startDateTo?: Date | null;
        myRecords?: boolean;
    };
    countryName: string;
    totalHazardousEvents: number;
    hazardNameById: Record<string, string>;
    clusterNameById: Record<string, string>;
    typeNameById: Record<string, string>;
    hipTypes: Array<{ id: string; name_en: string }>;
    hipClusters: Array<{ id: string; typeId: string; name_en: string }>;
    hipHazards: Array<{ id: string; clusterId: string; name_en: string }>;
}

function statusTemplate(value: string | null | undefined) {
    if (!value) {
        return <span className="text-gray-500">-</span>;
    }
    return <Tag severity="info" value={value} />;
}

function specificHazardTemplate(
    row: HazardousEvent,
    hazardNameById: Record<string, string>,
    clusterNameById: Record<string, string>,
    typeNameById: Record<string, string>,
) {
    if (row.hipHazardId) {
        return hazardNameById[row.hipHazardId] || row.hipHazardId;
    }
    if (row.hipClusterId) {
        return clusterNameById[row.hipClusterId] || row.hipClusterId;
    }
    if (row.hipTypeId) {
        return typeNameById[row.hipTypeId] || row.hipTypeId;
    }
    return "-";
}

function shortUuid(value: string) {
    if (!value) return "-";
    return value.slice(0, 5);
}

function formatDate(value: Date | null | undefined): string {
    if (!value) return "-";
    if (!(value instanceof Date)) return "-";
    return value.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
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

const HAZARDOUS_EVENT_STATUS_OPTIONS = [
    { label: "Forecasted", value: "forecasted" },
    { label: "Ongoing", value: "ongoing" },
    { label: "Passed", value: "passed" },
];

const WORKFLOW_STATUS_OPTIONS = [
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Revision requested", value: "revision_requested" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Published", value: "published" },
];

export default function HazardousEventsPage({
    data,
    filters,
    countryName,
    totalHazardousEvents,
    hazardNameById,
    clusterNameById,
    typeNameById,
    hipTypes,
    hipClusters,
    hipHazards,
}: HazardousEventsPageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const rows = data.items as HazardousEvent[];
    const currentPage = Math.max(1, data.pagination.page || 1);
    const pageSize = Math.max(1, data.pagination.pageSize || 25);
    const sortField = filters.sortField || "updatedAt";
    const sortOrder = filters.sortOrder === 1 ? 1 : -1;

    const advancedPanelRef = useRef<Panel>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filterState, setFilterState] = useState({
        hazardTypeId: filters.hazardTypeId || "",
        hazardClusterId: filters.hazardClusterId || "",
        hazardId: filters.hazardId || "",
        recordOriginatorFilter: filters.recordOriginatorFilter || "",
        hazardousEventStatus: filters.hazardousEventStatus || "",
        workflowStatusFilter: filters.workflowStatusFilter || "",
        startDateFrom: filters.startDateFrom ? new Date(filters.startDateFrom) : null as Date | null,
        startDateTo: filters.startDateTo ? new Date(filters.startDateTo) : null as Date | null,
        myRecords: filters.myRecords || false,
    });

    // Dependent dropdown options
    const clusterOptions = hipClusters
        .filter((c) => !filterState.hazardTypeId || c.typeId === filterState.hazardTypeId)
        .map((c) => ({ label: c.name_en, value: c.id }));
    const hazardOptions = hipHazards
        .filter((h) => !filterState.hazardClusterId || h.clusterId === filterState.hazardClusterId)
        .map((h) => ({ label: h.name_en, value: h.id }));
    const typeOptions = hipTypes.map((t) => ({ label: t.name_en, value: t.id }));

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

    const handleApply = () => {
        const params = new URLSearchParams(location.search);
        params.set("page", "1");
        if (filterState.hazardTypeId) params.set("hazardTypeId", filterState.hazardTypeId);
        else params.delete("hazardTypeId");
        if (filterState.hazardClusterId) params.set("hazardClusterId", filterState.hazardClusterId);
        else params.delete("hazardClusterId");
        if (filterState.hazardId) params.set("hazardId", filterState.hazardId);
        else params.delete("hazardId");
        if (filterState.recordOriginatorFilter) params.set("recordOriginatorFilter", filterState.recordOriginatorFilter);
        else params.delete("recordOriginatorFilter");
        if (filterState.hazardousEventStatus) params.set("hazardousEventStatus", filterState.hazardousEventStatus);
        else params.delete("hazardousEventStatus");
        if (filterState.workflowStatusFilter) params.set("workflowStatusFilter", filterState.workflowStatusFilter);
        else params.delete("workflowStatusFilter");
        params.delete("approvalStatusFilter");
        if (filterState.startDateFrom) params.set("startDateFrom", filterState.startDateFrom.toISOString());
        else params.delete("startDateFrom");
        if (filterState.startDateTo) params.set("startDateTo", filterState.startDateTo.toISOString());
        else params.delete("startDateTo");
        if (filterState.myRecords) params.set("myRecords", "true");
        else params.delete("myRecords");
        navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    };

    const handleReset = () => {
        setFilterState({
            hazardTypeId: "",
            hazardClusterId: "",
            hazardId: "",
            recordOriginatorFilter: "",
            hazardousEventStatus: "",
            workflowStatusFilter: "",
            startDateFrom: null,
            startDateTo: null,
            myRecords: false,
        });
        const params = new URLSearchParams();
        const currentSortField = filters.sortField;
        const currentSortOrder = filters.sortOrder;
        if (currentSortField) params.set("sortField", currentSortField);
        if (currentSortOrder) params.set("sortOrder", String(currentSortOrder));
        navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    };

    const handlePageChange = (event: {
        first: number;
        rows: number;
        page?: number;
    }) => {
        const nextPage = typeof event.page === "number"
            ? event.page + 1
            : Math.floor(event.first / event.rows) + 1;

        const params = new URLSearchParams(location.search);
        params.set("page", String(nextPage));
        params.set("pageSize", String(event.rows));
        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        });
    };

    const handleSort = (event: DataTableSortEvent) => {
        const nextSortField =
            (event.sortField as
                | "workflowStatus"
                | "nationalSpecification"
                | "specificHazard"
                | "recordOriginator"
                | "id"
                | "startDate"
                | "updatedAt"
                | undefined) || "updatedAt";
        const nextSortOrder = event.sortOrder === 1 ? 1 : -1;

        const params = new URLSearchParams(location.search);
        params.set("sortField", nextSortField);
        params.set("sortOrder", String(nextSortOrder));
        params.set("page", "1");
        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        });
    };

    const actionsTemplate = (row: HazardousEvent) => {
        return (
            <div className="flex w-full flex-nowrap justify-end gap-2">
                <Link to={`/hazardous-event/${row.id}`}>
                    <Button icon="pi pi-eye" text size="small" title="View" aria-label="View" />
                </Link>
                <Link to={`/hazardous-event/${row.id}/edit`}>
                    <Button icon="pi pi-pencil" text size="small" title="Edit" aria-label="Edit" />
                </Link>
                <Link to={`/hazardous-event/${row.id}/delete`}>
                    <Button
                        icon="pi pi-trash"
                        text
                        size="small"
                        severity="danger"
                        type="button"
                        title="Delete"
                        aria-label="Delete"
                    />
                </Link>
            </div>
        );
    };

    return (
        <div className="p-8">
            <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">
                            Hazardous Events
                        </h1>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                            {`${totalHazardousEvents} Hazardous events in ${countryName}`}
                        </p>
                        <p className="text-sm text-slate-600">
                            Monitor and track potentially hazardous situations
                        </p>
                    </div>
                    <Link to="/hazardous-event/new">
                        <Button label="Create New" icon="pi pi-plus" />
                    </Link>
                </div>

                <div className="mb-4 ">
                    <Card className="border border-slate-200 !bg-slate-50">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="font-medium text-slate-600">Hazard Type</label>
                                <Dropdown
                                    value={filterState.hazardTypeId || null}
                                    options={typeOptions}
                                    onChange={(e) => handleTypeChange(e.value ?? "")}
                                    placeholder="All types"
                                    showClear
                                    filter
                                    className="w-48 p-inputtext-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-600">Hazard Cluster</label>
                                <Dropdown
                                    value={filterState.hazardClusterId || null}
                                    options={clusterOptions}
                                    onChange={(e) => handleClusterChange(e.value ?? "")}
                                    placeholder="All clusters"
                                    showClear
                                    filter
                                    disabled={!filterState.hazardTypeId}
                                    className="w-48 p-inputtext-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-600">Specific Hazard</label>
                                <Dropdown
                                    value={filterState.hazardId || null}
                                    options={hazardOptions}
                                    onChange={(e) => setFilterState((prev) => ({ ...prev, hazardId: e.value ?? "" }))}
                                    placeholder="All hazards"
                                    showClear
                                    filter
                                    disabled={!filterState.hazardClusterId}
                                    className="w-48 p-inputtext-sm"
                                />
                            </div>
                            <Button
                                label={showAdvanced ? "Hide Advanced" : "Advanced Filters"}
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
                                        <label className="text-slate-600">Record Originator</label>
                                        <InputText
                                            value={filterState.recordOriginatorFilter}
                                            onChange={(e) => setFilterState((prev) => ({ ...prev, recordOriginatorFilter: e.target.value }))}
                                            placeholder="Search originator..."
                                            className="w-48 p-inputtext-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-600">Event Status</label>
                                        <Dropdown
                                            value={filterState.hazardousEventStatus || null}
                                            options={HAZARDOUS_EVENT_STATUS_OPTIONS}
                                            onChange={(e) => setFilterState((prev) => ({ ...prev, hazardousEventStatus: e.value ?? "" }))}
                                            placeholder="Any status"
                                            showClear
                                            className="w-48 p-inputtext-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-600">Approval Status</label>
                                        <Dropdown
                                            value={filterState.workflowStatusFilter || null}
                                            options={WORKFLOW_STATUS_OPTIONS}
                                            onChange={(e) => setFilterState((prev) => ({ ...prev, workflowStatusFilter: e.value ?? "" }))}
                                            placeholder="Any approval"
                                            showClear
                                            className="w-48 p-inputtext-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-600">Start Date From</label>
                                        <Calendar
                                            value={filterState.startDateFrom}
                                            onChange={(e) => setFilterState((prev) => ({ ...prev, startDateFrom: e.value as Date | null }))}
                                            placeholder="From date"
                                            showIcon
                                            showButtonBar
                                            dateFormat="yy-mm-dd"
                                            className="p-inputtext-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-600">Start Date To</label>
                                        <Calendar
                                            value={filterState.startDateTo}
                                            onChange={(e) => setFilterState((prev) => ({ ...prev, startDateTo: e.value as Date | null }))}
                                            placeholder="To date"
                                            showIcon
                                            showButtonBar
                                            dateFormat="yy-mm-dd"
                                            className="p-inputtext-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        inputId="myRecords"
                                        checked={filterState.myRecords}
                                        onChange={(e) => setFilterState((prev) => ({ ...prev, myRecords: e.checked ?? false }))}
                                    />
                                    <label htmlFor="myRecords" className="cursor-pointer text-slate-700">
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
                                onClick={handleApply}
                            />
                            <Button
                                label="Reset"
                                icon="pi pi-times"
                                text
                                size="small"
                                type="button"
                                onClick={handleReset}
                            />
                        </div>
                    </Card>
                </div>

                <div className="w-full overflow-x-auto rounded-lg border border-slate-200 [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:min-w-[58rem] [&_.p-datatable-table]:w-full">
                    <DataTable
                        value={rows}
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        emptyMessage="No hazardous events found"
                        stripedRows
                        size="small"
                        className="text-sm"
                        tableClassName="!table w-full min-w-[58rem] border-collapse text-xs md:text-base"
                    >
                        <Column
                            field="workflowStatus"
                            header="Status"
                            sortable
                            headerClassName="whitespace-nowrap px-2 py-3 text-center md:px-3"
                            bodyClassName="whitespace-nowrap px-2 py-3 text-center align-middle md:px-3"
                            body={(row: HazardousEvent) =>
                                statusTemplate(row.workflowStatus)
                            }
                        />
                        <Column
                            field="nationalSpecification"
                            header="National Specification"
                            sortable
                            headerClassName="min-w-44 px-2 py-3 text-center md:px-3"
                            bodyClassName="min-w-44 break-words px-2 py-3 text-center align-middle md:px-3"
                        />
                        <Column
                            sortField="specificHazard"
                            header="Specific hazard"
                            sortable
                            headerClassName="min-w-40 px-2 py-3 text-center md:px-3"
                            bodyClassName="min-w-40 break-words px-2 py-3 text-center align-middle md:px-3"
                            body={(row: HazardousEvent) =>
                                specificHazardTemplate(
                                    row,
                                    hazardNameById,
                                    clusterNameById,
                                    typeNameById,
                                )
                            }
                        />
                        <Column
                            field="recordOriginator"
                            header="Organization"
                            sortable
                            headerClassName="min-w-40 px-2 py-3 text-center md:px-3"
                            bodyClassName="min-w-40 break-words px-2 py-3 text-center align-middle md:px-3"
                        />
                        <Column
                            field="id"
                            header="UUID"
                            sortable
                            headerClassName="whitespace-nowrap px-2 py-3 text-center md:px-3"
                            bodyClassName="whitespace-nowrap px-2 py-3 text-center align-middle md:px-3"
                            body={(row: HazardousEvent) =>
                                <div className="flex w-full items-center justify-center gap-1">
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
                            }
                        />
                        <Column
                            field="startDate"
                            header="Event start date"
                            sortable
                            headerClassName="whitespace-nowrap px-2 py-3 text-center md:px-3"
                            bodyClassName="whitespace-nowrap px-2 py-3 text-center align-middle md:px-3"
                            body={(row: HazardousEvent) => formatDate(row.startDate)}
                        />
                        <Column
                            header=""
                            headerClassName="whitespace-nowrap px-2 py-3 md:px-3"
                            bodyClassName="whitespace-nowrap px-2 py-3 align-middle md:px-3"
                            body={actionsTemplate}
                        />
                    </DataTable>
                </div>

                {data.pagination.totalItems > 0 ? (
                    <Paginator
                        first={(currentPage - 1) * pageSize}
                        rows={pageSize}
                        totalRecords={data.pagination.totalItems}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        onPageChange={handlePageChange}
                        className="mt-4 !justify-end"
                    />
                ) : null}
            </Card>
            <Outlet />
        </div>
    );
}
