import { FormEvent, useMemo, useState } from "react";
import { Form, useLocation, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";

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
    const [searchValue, setSearchValue] = useState(filters.search || "");
    const [builtInValue, setBuiltInValue] = useState(
        filters.builtIn === undefined ? "" : String(filters.builtIn),
    );
    const navSettings = <NavSettings userRole={userRole ?? undefined} />;
    const hasActiveFilters = searchValue.trim() !== "" || builtInValue !== "";

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

    const submitFilters = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const params = new URLSearchParams();

        const trimmedSearch = searchValue.trim();
        if (trimmedSearch) {
            params.set("search", trimmedSearch);
        }
        if (builtInValue !== "") {
            params.set("builtIn", builtInValue);
        }

        navigate(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
    };

    const actionsBodyTemplate = (item: AssetListItem) => (
        <div className="flex items-center justify-end gap-1">
            <Button
                type="button"
                aria-label={"View"}
                text
                onClick={() => navigate(`${basePath}/${item.id}`)}
            >
                <i className="pi pi-eye" aria-hidden="true" />
            </Button>
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
        <Tag
            value={item.isBuiltIn ? "Built-in" : "Custom"}
            severity={item.isBuiltIn ? "info" : "success"}
        />
    );

    return (
        <MainContainer title={"Assets"} headerExtra={navSettings}>
            <>
                {/* Filters */}
                <div className="mb-4 flex flex-wrap items-end gap-3">
                    <Form
                        method="get"
                        action={basePath}
                        onSubmit={submitFilters}
                        className="flex flex-wrap items-end gap-3 flex-1"
                    >
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">{"Search"}</label>
                            <InputText
                                name="search"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder={"Search..."}
                                className="p-inputtext-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">{"Is custom?"}</label>
                            <Dropdown
                                name="builtIn"
                                value={builtInValue}
                                onChange={(e) => setBuiltInValue(e.value)}
                                options={builtInOptions}
                                optionLabel="label"
                                optionValue="value"
                                className="p-inputtext-sm"
                            />
                        </div>
                        <Button
                            type="submit"
                            label={"Search"}
                            icon="pi pi-search"
                            size="small"
                        />
                        {hasActiveFilters && (
                            <Button
                                type="button"
                                label={"Clear"}
                                icon="pi pi-times"
                                text
                                size="small"
                                onClick={() => {
                                    setSearchValue("");
                                    setBuiltInValue("");
                                    navigate(basePath);
                                }}
                            />
                        )}
                    </Form>

                    {canCreate && (
                        <Button
                            id="add_new_asset"
                            label={"Add new asset"}
                            icon="pi pi-plus"
                            size="small"
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
                                field="name"
                                header={"Name"}
                                headerClassName="w-[40%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[40%] px-2 py-3 border-b border-gray-200"
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
                                header={""}
                                body={actionsBodyTemplate}
                                headerClassName="w-[16%] bg-gray-100 px-2 py-3 text-right font-medium border-b border-gray-200"
                                bodyClassName="w-[16%] px-2 py-3 border-b border-gray-200"
                            />
                        </DataTable>
                    </div>

                    {pagination.totalItems > 0 && (
                        <Paginator
                            first={(pagination.page - 1) * pagination.pageSize}
                            rows={10}
                            totalRecords={pagination.totalItems}
                            rowsPerPageOptions={[10]}
                            onPageChange={(e) =>
                                updateParams({
                                    page: e.page + 1,
                                })
                            }
                            className="mt-4 !justify-end"
                        />
                    )}
                </section>
            </>
        </MainContainer>
    );
}
