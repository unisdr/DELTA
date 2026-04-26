import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";
import { Tag } from "primereact/tag";
import { Form, Link, useLocation, useNavigate } from "react-router";
import type { DataTableSortEvent } from "primereact/datatable";

import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";
import type { ListHazardousEventsResult } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface HazardousEventsPageProps {
    data: ListHazardousEventsResult;
    filters: {
        search?: string;
        sortField?:
        | "approvalStatus"
        | "nationalSpecification"
        | "specificHazard"
        | "recordOriginator"
        | "id"
        | "startDate"
        | "updatedAt";
        sortOrder?: 1 | -1;
    };
    countryName: string;
    totalHazardousEvents: number;
    hazardNameById: Record<string, string>;
    clusterNameById: Record<string, string>;
    typeNameById: Record<string, string>;
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

export default function HazardousEventsPage({
    data,
    filters,
    countryName,
    totalHazardousEvents,
    hazardNameById,
    clusterNameById,
    typeNameById,
}: HazardousEventsPageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const rows = data.items as HazardousEvent[];
    const currentPage = Math.max(1, data.pagination.page || 1);
    const pageSize = Math.max(1, data.pagination.pageSize || 25);
    const sortField = filters.sortField || "updatedAt";
    const sortOrder = filters.sortOrder === 1 ? 1 : -1;

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
                | "approvalStatus"
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
            <div className="flex w-full flex-wrap justify-end gap-2">
                <Link to={`/hazardous-event/${row.id}`}>
                    <Button icon="pi pi-eye" text size="small" title="View" aria-label="View" />
                </Link>
                <Link to={`/hazardous-event/${row.id}/edit`}>
                    <Button icon="pi pi-pencil" text size="small" title="Edit" aria-label="Edit" />
                </Link>
                <Form method="post" action={`/hazardous-event/${row.id}/delete`}>
                    <Button
                        icon="pi pi-trash"
                        text
                        size="small"
                        severity="danger"
                        type="submit"
                        title="Delete"
                        aria-label="Delete"
                        onClick={(event) => {
                            event.preventDefault();
                            const form = event.currentTarget.closest("form");
                            confirmDialog({
                                message: "Are you sure you want to delete this hazardous event?",
                                header: "Confirm Delete",
                                icon: "pi pi-exclamation-triangle",
                                acceptClassName: "p-button-danger",
                                accept: () => {
                                    if (form instanceof HTMLFormElement) {
                                        form.requestSubmit();
                                    }
                                },
                            });
                        }}
                    />
                </Form>
            </div>
        );
    };

    return (
        <div className="p-4">
            <ConfirmDialog />
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

                <DataTable
                    value={rows}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    emptyMessage="No hazardous events found"
                    stripedRows
                    size="small"
                    className="text-sm"
                >
                    <Column
                        field="approvalStatus"
                        header="Status"
                        sortable
                        body={(row: HazardousEvent) =>
                            statusTemplate(row.approvalStatus)
                        }
                    />
                    <Column
                        field="nationalSpecification"
                        header="National Specification"
                        sortable
                    />
                    <Column
                        sortField="specificHazard"
                        header="Specific hazard"
                        sortable
                        body={(row: HazardousEvent) =>
                            specificHazardTemplate(
                                row,
                                hazardNameById,
                                clusterNameById,
                                typeNameById,
                            )
                        }
                    />
                    <Column field="recordOriginator" header="Organization" sortable />
                    <Column
                        field="id"
                        header="UUID"
                        sortable
                        body={(row: HazardousEvent) =>
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
                        }
                    />
                    <Column field="startDate" header="Event start date" sortable body={(row: HazardousEvent) => formatDate(row.startDate)} />
                    <Column header="" body={actionsTemplate} />
                </DataTable>

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
        </div>
    );
}
