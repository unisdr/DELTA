import { useMemo, useState } from "react";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Paginator } from "primereact/paginator";
import { Tag } from "primereact/tag";
import { Form, Link, useLocation, useNavigate } from "react-router";

import type { ListDisasterEventsResult } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";

type DisasterEventsPageProps = {
    data: ListDisasterEventsResult;
    filters: {
        search: string;
        approvalStatus: string;
        fromDate: string;
        toDate: string;
    };
    usePrimeUiV2: boolean;
};

const STATUS_OPTIONS = [
    { label: "All statuses", value: "" },
    { label: "Draft", value: "draft" },
    { label: "Waiting for validation", value: "waiting-for-validation" },
    { label: "Needs revision", value: "needs-revision" },
    { label: "Validated", value: "validated" },
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
    if (status === "published" || status === "validated") {
        return "success";
    }
    if (status === "needs-revision") {
        return "danger";
    }
    if (status === "waiting-for-validation") {
        return "warning";
    }
    return "info";
}

export default function DisasterEventsPage({
    data,
    filters,
    usePrimeUiV2,
}: DisasterEventsPageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const currentPage = Math.max(1, data.pagination.page || 1);
    const pageSize = Math.max(1, data.pagination.pageSize || 25);
    const [search, setSearch] = useState(filters.search);
    const [approvalStatus, setApprovalStatus] = useState(filters.approvalStatus);
    const [fromDate, setFromDate] = useState<Date | null>(
        parseDateInput(filters.fromDate),
    );
    const [toDate, setToDate] = useState<Date | null>(parseDateInput(filters.toDate));

    const activeFilterCount = useMemo(() => {
        const values = [
            search.trim(),
            approvalStatus.trim(),
            formatDateInput(fromDate),
            formatDateInput(toDate),
        ];
        return values.filter((value) => value.length > 0).length;
    }, [search, approvalStatus, fromDate, toDate]);

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
        const nextSearch = search.trim();
        const nextStatus = approvalStatus.trim();
        const nextFromDate = formatDateInput(fromDate);
        const nextToDate = formatDateInput(toDate);

        if (nextSearch) params.set("search", nextSearch);
        else params.delete("search");

        if (nextStatus) params.set("approvalStatus", nextStatus);
        else params.delete("approvalStatus");

        if (nextFromDate) params.set("fromDate", nextFromDate);
        else params.delete("fromDate");

        if (nextToDate) params.set("toDate", nextToDate);
        else params.delete("toDate");

        params.set("page", "1");
        navigate({
            pathname: location.pathname,
            search: `?${params.toString()}`,
        });
    };

    const clearFilters = () => {
        setSearch("");
        setApprovalStatus("");
        setFromDate(null);
        setToDate(null);
        navigate({ pathname: location.pathname, search: "" });
    };

    void usePrimeUiV2;

    const statusBodyTemplate = (row: (typeof data.items)[number]) => {
        if (!row.approvalStatus) {
            return <span className="text-gray-500">-</span>;
        }
        return (
            <Tag
                value={row.approvalStatus}
                severity={statusTagSeverity(row.approvalStatus)}
            />
        );
    };

    const dateBodyTemplate = (value: string | null) => value || "-";

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
            <Form method="post" action={`/disaster-event/${row.id}/delete`}>
                <Button
                    type="submit"
                    text
                    severity="danger"
                    aria-label="Delete"
                    onClick={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget.closest("form");
                        confirmDialog({
                            message: "Are you sure you want to delete this disaster event?",
                            header: "Confirm delete",
                            icon: "pi pi-exclamation-triangle",
                            acceptClassName: "p-button-danger",
                            accept: () => {
                                if (form instanceof HTMLFormElement) {
                                    form.requestSubmit();
                                }
                            },
                        });
                    }}
                >
                    <i className="pi pi-trash" aria-hidden="true" />
                </Button>
            </Form>
        </div>
    );

    return (
        <div className="p-8">
            <ConfirmDialog />
            <Card className="shadow-sm border border-slate-200">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">Disaster Events</h1>
                        <p className="text-sm text-slate-500">Manage and track disaster event records.</p>
                        <p className="mt-1 text-xs text-slate-400">{data.pagination.totalItems} total records</p>
                    </div>
                    <Link to="/disaster-event/new">
                        <Button
                            label="Create New"
                            icon="pi pi-plus"
                            raised
                        />
                    </Link>
                </div>

                <section className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-5 md:items-end">
                    <div className="md:col-span-2">
                        <label
                            htmlFor="de-search"
                            className="mb-1 block text-sm font-medium text-slate-700"
                        >
                            Search
                        </label>
                        <InputText
                            id="de-search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by national id, name, institution"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="de-status"
                            className="mb-1 block text-sm font-medium text-slate-700"
                        >
                            Approval status
                        </label>
                        <Dropdown
                            inputId="de-status"
                            value={approvalStatus}
                            onChange={(event) => setApprovalStatus(event.value || "")}
                            options={STATUS_OPTIONS}
                            placeholder="Select status"
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="de-from"
                            className="mb-1 block text-sm font-medium text-slate-700"
                        >
                            From date
                        </label>
                        <input
                            id="de-from"
                            type="date"
                            value={formatDateInput(fromDate)}
                            onChange={(event) => setFromDate(parseDateInput(event.target.value))}
                            className="w-full rounded-md border border-slate-300 px-3 py-[0.65rem] text-sm"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="de-to"
                            className="mb-1 block text-sm font-medium text-slate-700"
                        >
                            To date
                        </label>
                        <input
                            id="de-to"
                            type="date"
                            value={formatDateInput(toDate)}
                            onChange={(event) => setToDate(parseDateInput(event.target.value))}
                            className="w-full rounded-md border border-slate-300 px-3 py-[0.65rem] text-sm"
                        />
                    </div>

                    <div className="flex gap-2 md:col-span-5 md:justify-end">
                        <Button
                            type="button"
                            label="Clear"
                            outlined
                            onClick={clearFilters}
                        />
                        <Button
                            type="button"
                            label={`Apply${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`}
                            onClick={applyFilters}
                        />
                    </div>
                </section>

                <div className="w-full overflow-x-auto rounded-lg border border-slate-200 [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full [&_.p-datatable-table]:table-fixed">
                    <DataTable
                        value={data.items}
                        dataKey="id"
                        emptyMessage="No disaster events found"
                        stripedRows
                        size="small"
                        className="w-full"
                        tableClassName="!table w-full min-w-full table-fixed border-collapse text-sm md:text-base"
                    >
                        <Column
                            field="nationalDisasterId"
                            header="National ID"
                            headerClassName="w-1/6 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="w-1/6 px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="nameNational"
                            header="Name"
                            headerClassName="w-2/6 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="w-2/6 px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="recordingInstitution"
                            header="Institution"
                            headerClassName="w-2/6 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="w-2/6 px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            field="startDate"
                            header="Start"
                            body={(row) => dateBodyTemplate(row.startDate)}
                            headerClassName="w-1/6 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="w-1/6 px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            header="Status"
                            body={statusBodyTemplate}
                            headerClassName="w-1/6 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="w-1/6 px-2 py-3 border-b border-gray-200"
                        />
                        <Column
                            header=""
                            body={actionsBodyTemplate}
                            headerClassName="w-1/6 bg-gray-100 px-2 py-3 border-b border-gray-200"
                            bodyClassName="w-1/6 px-2 py-3 border-b border-gray-200"
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
