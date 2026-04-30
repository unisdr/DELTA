import { useEffect, useMemo, useState } from "react";
import {
    useLoaderData,
    useLocation,
    useNavigate,
} from "react-router";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { FilterMatchMode } from "primereact/api";

import { MainContainer } from "~/frontend/container";
import { ViewContext } from "~/frontend/context";
import { NavSettings } from "~/frontend/components/NavSettings";
import { canAddNewRecord, canEditRecord } from "~/frontend/user/roles";
import type { loader } from "../routes/$lang+/settings+/organizations+/_layout";

type OrganizationItem = { id: string; name: string };
type OrganizationTableFilters = {
    global: {
        value: string;
        matchMode: FilterMatchMode;
    };
};

function getOrganizationsBasePath(pathname: string) {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length >= 2) {
        const actionSegment = segments[segments.length - 2];
        if (actionSegment === "edit" || actionSegment === "delete") {
            return `/${segments.slice(0, -2).join("/")}`;
        }
    }

    if (segments[segments.length - 1] === "new") {
        return `/${segments.slice(0, -1).join("/")}`;
    }

    return pathname;
}

export default function OrganizationManagementPage() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const { filters } = ld;
    const { items, pagination } = ld.data;

    const navigate = useNavigate();
    const location = useLocation();
    const basePath = useMemo(
        () => getOrganizationsBasePath(location.pathname),
        [location.pathname],
    );

    const [tableFilters, setTableFilters] = useState<OrganizationTableFilters>({
        global: {
            value: filters.search ?? "",
            matchMode: FilterMatchMode.CONTAINS,
        },
    });
    const pageSizeOptions = [10, 20, 30, 40, 50];

    const navSettings = <NavSettings ctx={ctx} userRole={ld.common.user?.role} />;

    const canAdd = canAddNewRecord(ctx.user?.role ?? null);
    const canEdit = canEditRecord(ctx.user?.role ?? null);
    const canDelete = canEditRecord(ctx.user?.role ?? null);

    const withCurrentSearch = (path: string) =>
        location.search ? `${path}${location.search}` : path;

    const updatePaginationParams = (nextPage: number, nextPageSize: number) => {
        const params = new URLSearchParams(location.search);
        params.set("page", String(nextPage));
        params.set("pageSize", String(nextPageSize));
        navigate(`${location.pathname}?${params.toString()}`);
    };

    useEffect(() => {
        setTableFilters((prev) => ({
            ...prev,
            global: {
                value: filters.search ?? "",
                matchMode: FilterMatchMode.CONTAINS,
            },
        }));
    }, [filters.search]);

    useEffect(() => {
        const nextSearch = String(tableFilters?.global?.value ?? "").trim();
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(location.search);
            const currentSearch = (params.get("search") ?? "").trim();

            if (currentSearch === nextSearch) {
                return;
            }

            if (nextSearch) {
                params.set("search", nextSearch);
            } else {
                params.delete("search");
            }

            params.set("page", "1");
            navigate(`${location.pathname}?${params.toString()}`);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [tableFilters, location.search, location.pathname, navigate]);

    const actionsBodyTemplate = (item: OrganizationItem) => (
        <div className="flex w-full items-center justify-end gap-1">
            {canEdit && (
                <Button
                    type="button"
                    aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
                    text
                    onClick={() => navigate(withCurrentSearch(`${basePath}/edit/${item.id}`))}
                >
                    <i className="pi pi-pencil" aria-hidden="true" />
                </Button>
            )}
            {canDelete && (
                <Button
                    type="button"
                    text
                    severity="danger"
                    aria-label={ctx.t({ code: "common.delete", msg: "Delete" })}
                    onClick={() =>
                        navigate(withCurrentSearch(`${basePath}/delete/${item.id}`))
                    }
                >
                    <i className="pi pi-trash" aria-hidden="true" />
                </Button>
            )}
        </div>
    );

    const tableHeader = (
        <div className="w-full sm:w-80">
            <InputText
                value={tableFilters.global.value}
                onChange={(e) => {
                    setTableFilters((prev) => ({
                        ...prev,
                        global: {
                            value: e.target.value,
                            matchMode: FilterMatchMode.CONTAINS,
                        },
                    }));
                }}
                placeholder={ctx.t({ code: "common.search", msg: "Search" })}
                className="w-full"
            />
        </div>
    );

    return (
        <MainContainer
            title={ctx.t({ code: "organizations", msg: "Organizations" })}
            headerExtra={navSettings}
        >
            <>
                <div className="mb-4 w-full">
                    <div className="flex w-full justify-end">
                        {canAdd && (
                            <Button
                                id="add_new_organization"
                                label={ctx.t({
                                    code: "organizations.add_new",
                                    msg: "Add new organization",
                                })}
                                icon="pi pi-plus"
                                onClick={() => navigate(withCurrentSearch(`${basePath}/new`))}
                            />
                        )}
                    </div>
                </div>

                <section className="mt-4 w-full">
                    <div className="w-full overflow-x-auto [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full [&_.p-datatable-table]:table-fixed">
                        <DataTable
                            value={items}
                            dataKey="id"
                            className="w-full"
                            tableClassName="!table w-full min-w-full table-fixed border-collapse text-sm md:text-base"
                            header={tableHeader}
                            filters={tableFilters}
                            globalFilterFields={["id", "name"]}
                            onFilter={(event) =>
                                setTableFilters(event.filters as OrganizationTableFilters)
                            }
                            emptyMessage={ctx.t({ code: "common.no_data_found", msg: "No data found" })}
                        >
                            <Column
                                field="name"
                                header={ctx.t({ code: "common.name", msg: "Name" })}
                                headerClassName="w-3/4 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-3/4 px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                header=""
                                body={actionsBodyTemplate}
                                headerClassName="w-1/4 bg-gray-100 px-2 py-3 text-center font-medium border-b border-gray-200"
                                bodyClassName="w-1/4 px-2 py-3 border-b border-gray-200"
                            />
                        </DataTable>
                    </div>
                    {pagination.totalItems > 0 && (
                        <Paginator
                            first={(pagination.page - 1) * pagination.pageSize}
                            rows={pagination.pageSize}
                            totalRecords={pagination.totalItems}
                            rowsPerPageOptions={pageSizeOptions}
                            onPageChange={(event) => {
                                updatePaginationParams(event.page + 1, event.rows);
                            }}
                            className="mt-4 !justify-end"
                        />
                    )}
                </section>
            </>
        </MainContainer>
    );
}
