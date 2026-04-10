import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/frontend/components/nav-settings";
import type {
    AssetsListResult,
    AssetListItem,
} from "~/modules/assets/domain/entities/asset";

type AssetsPageProps = {
    result: AssetsListResult;
    filters: { search: string; builtIn?: boolean };
    instanceName?: string;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    userRole: string | null;
};

const builtInOptions = [
    { label: "All", value: "" },
    { label: "Custom", value: "false" },
    { label: "Built-in", value: "true" },
];

export default function AssetsPage({
    result,
    filters,
    canCreate,
    canUpdate,
    canDelete,
    userRole,
}: AssetsPageProps) {
    const { items, pagination } = result;
    const navigate = useNavigate();
    const location = useLocation();
    const navSettings = <NavSettings userRole={userRole ?? undefined} />;

    const basePath = useMemo(() => {
        const segments = location.pathname.split("/").filter(Boolean);
        const last = segments[segments.length - 1];
        if (last === "new") return `/${segments.slice(0, -1).join("/")}`;
        if (last === "edit" || last === "delete") {
            return `/${segments.slice(0, -2).join("/")}`;
        }
        const secondLast = segments[segments.length - 2];
        if (secondLast === "edit" || secondLast === "delete") {
            return `/${segments.slice(0, -2).join("/")}`;
        }
        return location.pathname;
    }, [location.pathname]);

    const updateParams = (overrides: Record<string, string | number>) => {
        const params = new URLSearchParams(location.search);
        for (const [k, v] of Object.entries(overrides)) {
            params.set(k, String(v));
        }
        navigate(`${basePath}?${params.toString()}`);
    };

    const actionsBodyTemplate = (item: AssetListItem) => (
        <div className="flex items-center justify-center gap-1">
            {canUpdate && !item.isBuiltIn && (
                <Button
                    type="button"
                    aria-label={"Edit"}
                    text
                    onClick={() => navigate(`${basePath}/${item.id}/edit`)}
                >
                    <i className="pi pi-pencil" aria-hidden="true" />
                </Button>
            )}
            {canDelete && !item.isBuiltIn && (
                <Button
                    type="button"
                    text
                    severity="danger"
                    aria-label={"Delete"}
                    onClick={() => navigate(`${basePath}/${item.id}/delete`)}
                >
                    <i className="pi pi-trash" aria-hidden="true" />
                </Button>
            )}
        </div>
    );

    const isCustomBodyTemplate = (item: AssetListItem) => (
        <span>{item.isBuiltIn ? "No" : "Yes"}</span>
    );

    const idBodyTemplate = (item: AssetListItem) => (
        <a href={`${basePath}/${item.id}`}>{item.id.slice(0, 8)}</a>
    );

    return (
        <MainContainer title={"Assets"} headerExtra={navSettings}>
            <>
                {/* Filters */}
                <div className="mb-4 flex flex-wrap items-end gap-3">
                    <form
                        method="get"
                        action={basePath}
                        className="flex flex-wrap items-end gap-3 flex-1"
                    >
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">{"Search"}</label>
                            <InputText
                                name="search"
                                defaultValue={filters.search}
                                placeholder={"Search..."}
                                className="h-9"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">{"Is custom?"}</label>
                            <Dropdown
                                name="builtIn"
                                defaultValue={
                                    filters.builtIn === undefined
                                        ? ""
                                        : String(filters.builtIn)
                                }
                                options={builtInOptions}
                                optionLabel="label"
                                optionValue="value"
                                className="h-9"
                            />
                        </div>
                        <Button
                            type="submit"
                            label={"Filter"}
                            icon="pi pi-filter"
                            className="h-9"
                        />
                        <Button
                            type="button"
                            label={"Clear"}
                            icon="pi pi-times"
                            severity="secondary"
                            className="h-9"
                            onClick={() => navigate(basePath)}
                        />
                    </form>

                    {canCreate && (
                        <Button
                            id="add_new_asset"
                            label={"Add new asset"}
                            icon="pi pi-plus"
                            onClick={() => navigate(`${basePath}/new`)}
                        />
                    )}
                </div>

                {/* Table */}
                <section className="mt-4 w-full">
                    <div className="w-full overflow-x-auto [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full [&_.p-datatable-table]:table-fixed">
                        <DataTable
                            value={items}
                            dataKey="id"
                            className="w-full"
                            tableClassName="!table w-full min-w-full table-fixed border-collapse text-sm md:text-base"
                            emptyMessage={"No data found"}
                        >
                            <Column
                                header={"ID"}
                                body={idBodyTemplate}
                                headerClassName="w-[12%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[12%] px-2 py-3 border-b border-gray-200 font-mono text-xs"
                            />
                            <Column
                                field="name"
                                header={"Name"}
                                headerClassName="w-[28%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[28%] px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                field="sectorNames"
                                header={"Sector(s)"}
                                headerClassName="w-[32%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[32%] px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                header={"Is custom"}
                                body={isCustomBodyTemplate}
                                headerClassName="w-[12%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[12%] px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                header={"Actions"}
                                body={actionsBodyTemplate}
                                headerClassName="w-[16%] bg-gray-100 px-2 py-3 text-center font-medium border-b border-gray-200"
                                bodyClassName="w-[16%] px-2 py-3 border-b border-gray-200"
                            />
                        </DataTable>
                    </div>

                    {pagination.totalItems > 0 && (
                        <Paginator
                            first={(pagination.page - 1) * pagination.pageSize}
                            rows={pagination.pageSize}
                            totalRecords={pagination.totalItems}
                            rowsPerPageOptions={[10, 20, 50]}
                            onPageChange={(e) =>
                                updateParams({
                                    page: e.page + 1,
                                    pageSize: e.rows,
                                })
                            }
                            className="mt-4"
                        />
                    )}
                </section>
            </>
        </MainContainer>
    );
}
