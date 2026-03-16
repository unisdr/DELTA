import { useEffect, useRef, useState } from "react";
import {
    useFetcher,
    useLoaderData,
    useLocation,
    useNavigate,
} from "react-router";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { Toast } from "primereact/toast";
import { FilterMatchMode } from "primereact/api";

import { MainContainer } from "~/frontend/container";
import { ViewContext } from "~/frontend/context";
import { NavSettings } from "~/routes/$lang+/settings/nav";
import { canAddNewRecord, canEditRecord } from "~/frontend/user/roles";
import type { OrganizationActionResult } from "~/services/organizationService";
import type { loader } from "../routes/$lang+/settings+/organizations+/_index";

type OrganizationItem = { id: string; name: string };
type FetcherResultRef = { current: OrganizationActionResult | null };
type OrganizationTableFilters = {
    global: {
        value: string;
        matchMode: FilterMatchMode;
    };
};

function getNextFetcherResult(
    state: string,
    data: OrganizationActionResult | undefined,
    lastHandledRef: FetcherResultRef,
) {
    if (state !== "idle" || !data || lastHandledRef.current === data) {
        return null;
    }
    lastHandledRef.current = data;
    return data;
}

export default function OrganizationManagementPage() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const { filters } = ld;
    const { items, pagination } = ld.data;

    const createFetcher = useFetcher<OrganizationActionResult>();
    const updateFetcher = useFetcher<OrganizationActionResult>();
    const deleteFetcher = useFetcher<OrganizationActionResult>();
    const navigate = useNavigate();
    const location = useLocation();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OrganizationItem | undefined>(
        undefined,
    );

    const [newName, setNewName] = useState("");
    const [editName, setEditName] = useState("");
    const [addNameError, setAddNameError] = useState("");
    const [editNameError, setEditNameError] = useState("");
    const [tableFilters, setTableFilters] = useState<OrganizationTableFilters>({
        global: {
            value: filters.search ?? "",
            matchMode: FilterMatchMode.CONTAINS,
        },
    });
    const toast = useRef<Toast>(null);
    const lastHandledCreateData = useRef<OrganizationActionResult | null>(null);
    const lastHandledUpdateData = useRef<OrganizationActionResult | null>(null);
    const lastHandledDeleteData = useRef<OrganizationActionResult | null>(null);
    const pageSizeOptions = [10, 20, 30, 40, 50];

    const navSettings = <NavSettings ctx={ctx} userRole={ld.common.user?.role} />;

    const canAdd = canAddNewRecord(ctx.user?.role ?? null);
    const canEdit = canEditRecord(ctx.user?.role ?? null);
    const canDelete = canEditRecord(ctx.user?.role ?? null);

    const showErrorToast = (message: string) => {
        toast.current?.show({
            severity: "error",
            summary: ctx.t({ code: "common.error", msg: "Error" }),
            detail: message,
        });
    };

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

    const idBodyTemplate = (item: { id: string }) => item.id.slice(0, 8);

    const actionsBodyTemplate = (item: OrganizationItem) => (
        <div className="flex justify-evenly">
            {canEdit && (
                <Button
                    type="button"
                    aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
                    text
                    onClick={() => {
                        setSelectedItem(item);
                        setEditName(item.name || "");
                        setIsEditDialogOpen(true);
                    }}
                >
                    <i className="pi pi-pencil" aria-hidden="true" />
                </Button>
            )}
            {canDelete && (
                <Button
                    type="button"
                    text
                    aria-label={ctx.t({ code: "common.delete", msg: "Delete" })}
                    onClick={() => {
                        setSelectedItem(item);
                        setIsDeleteDialogOpen(true);
                    }}
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

    useEffect(() => {
        const result = getNextFetcherResult(
            createFetcher.state,
            createFetcher.data,
            lastHandledCreateData,
        );
        if (!result) {
            return;
        }

        if (result.ok) {
            setIsAddDialogOpen(false);
            setNewName("");
            setAddNameError("");
            toast.current?.show({
                severity: "success",
                summary: ctx.t({ code: "common.success", msg: "Success" }),
                detail: ctx.t({
                    code: "organizations.create_success",
                    msg: "Organization created successfully.",
                }),
            });
        } else if (result.error) {
            if (result.error.toLowerCase().includes("name")) {
                setAddNameError(result.error);
            } else {
                showErrorToast(result.error);
            }
        }
    }, [createFetcher.state, createFetcher.data]);

    useEffect(() => {
        const result = getNextFetcherResult(
            updateFetcher.state,
            updateFetcher.data,
            lastHandledUpdateData,
        );
        if (!result) {
            return;
        }

        if (result.ok) {
            setIsEditDialogOpen(false);
            setSelectedItem(undefined);
            setEditName("");
            setEditNameError("");
            toast.current?.show({
                severity: "success",
                summary: ctx.t({ code: "common.success", msg: "Success" }),
                detail: ctx.t({
                    code: "organizations.update_success",
                    msg: "Organization updated successfully.",
                }),
            });
        } else if (result.error) {
            if (result.error.toLowerCase().includes("name")) {
                setEditNameError(result.error);
            } else {
                showErrorToast(result.error);
            }
        }
    }, [updateFetcher.state, updateFetcher.data]);

    useEffect(() => {
        const result = getNextFetcherResult(
            deleteFetcher.state,
            deleteFetcher.data,
            lastHandledDeleteData,
        );
        if (!result) {
            return;
        }

        if (result.ok) {
            setIsDeleteDialogOpen(false);
            setSelectedItem(undefined);
            toast.current?.show({
                severity: "success",
                summary: ctx.t({ code: "common.success", msg: "Success" }),
                detail: ctx.t({
                    code: "organizations.delete_success",
                    msg: "Organization deleted successfully.",
                }),
            });
        } else if (result.error) {
            setIsDeleteDialogOpen(false);
            setSelectedItem(undefined);
            showErrorToast(result.error);
        }
    }, [deleteFetcher.state, deleteFetcher.data]);

    return (
        <MainContainer
            title={ctx.t({ code: "organizations", msg: "Organizations" })}
            headerExtra={navSettings}
        >
            <>
                <Toast ref={toast} position="top-right" />

                <div className="mb-4 w-full">
                    <div className="flex w-full justify-end">
                        {canAdd && (
                            <Button
                                id="add_new_organization"
                                label={ctx.t({
                                    code: "organizations.add_new",
                                    msg: "Add new organization",
                                })}
                                onClick={() => {
                                    setNewName("");
                                    setAddNameError("");
                                    setIsAddDialogOpen(true);
                                }}
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
                                header={ctx.t({ code: "common.id", msg: "ID" })}
                                body={idBodyTemplate}
                                headerClassName="w-1/4 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-1/4 px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                field="name"
                                header={ctx.t({ code: "common.name", msg: "Name" })}
                                headerClassName="w-2/4 bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-2/4 px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                header={ctx.t({ code: "common.actions", msg: "Actions" })}
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
                            className="mt-4"
                        />
                    )}
                </section>

                <Dialog
                    header={ctx.t({
                        code: "organizations.add",
                        msg: "Add organization",
                    })}
                    visible={isAddDialogOpen}
                    onHide={() => setIsAddDialogOpen(false)}
                    className="w-[32rem] max-w-full"
                >
                    <createFetcher.Form method="post" className="flex flex-col">
                        <input type="hidden" name="intent" value="create" />
                        <p className="mb-3 text-red-700">* Required information</p>
                        <div className="mb-3 flex flex-col gap-2">
                            <label htmlFor="create-organization-name">
                                <span className="inline-flex gap-1">
                                    <span>{ctx.t({ code: "common.name", msg: "Name" })}</span>
                                    <span className="text-red-700">*</span>
                                </span>
                            </label>
                            <InputText
                                id="create-organization-name"
                                name="name"
                                value={newName}
                                invalid={!!addNameError}
                                aria-invalid={addNameError ? true : false}
                                onChange={(e) => {
                                    setNewName(e.target.value);
                                    if (e.target.value.trim()) {
                                        setAddNameError("");
                                    }
                                }}
                            />
                            {addNameError ? <small className="text-red-700">{addNameError}</small> : null}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                type="button"
                                outlined
                                label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
                                onClick={() => {
                                    setIsAddDialogOpen(false);
                                    setAddNameError("");
                                }}
                            />
                            <Button
                                type="submit"
                                label={ctx.t({ code: "common.save", msg: "Save" })}
                                loading={createFetcher.state !== "idle"}
                            />
                        </div>
                    </createFetcher.Form>
                </Dialog>

                <Dialog
                    header={ctx.t({
                        code: "organizations.edit",
                        msg: "Edit organization",
                    })}
                    visible={isEditDialogOpen}
                    onHide={() => setIsEditDialogOpen(false)}
                    className="w-[32rem] max-w-full"
                >
                    <updateFetcher.Form method="post" className="flex flex-col">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={selectedItem?.id || ""} />
                        <p className="mb-3 text-red-700">* Required information</p>
                        <div className="mb-3 flex flex-col gap-2">
                            <label htmlFor="edit-organization-name">
                                <span className="inline-flex gap-1">
                                    <span>{ctx.t({ code: "common.name", msg: "Name" })}</span>
                                    <span className="text-red-700">*</span>
                                </span>
                            </label>
                            <InputText
                                id="edit-organization-name"
                                name="name"
                                value={editName}
                                invalid={!!editNameError}
                                aria-invalid={editNameError ? true : false}
                                onChange={(e) => {
                                    setEditName(e.target.value);
                                    if (e.target.value.trim()) {
                                        setEditNameError("");
                                    }
                                }}
                            />
                            {editNameError ? <small className="text-red-700">{editNameError}</small> : null}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                type="button"
                                outlined
                                label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
                                onClick={() => {
                                    setIsEditDialogOpen(false);
                                    setEditNameError("");
                                }}
                            />
                            <Button
                                type="submit"
                                label={ctx.t({ code: "common.save", msg: "Save" })}
                                loading={updateFetcher.state !== "idle"}
                            />
                        </div>
                    </updateFetcher.Form>
                </Dialog>

                <Dialog
                    header={ctx.t({
                        code: "common.record_deletion",
                        msg: "Record Deletion",
                    })}
                    visible={isDeleteDialogOpen}
                    onHide={() => setIsDeleteDialogOpen(false)}
                    className="w-[30rem] max-w-full"
                >
                    <deleteFetcher.Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={selectedItem?.id || ""} />
                        <p>
                            {ctx.t({
                                code: "common.confirm_deletion",
                                msg: "Please confirm deletion.",
                            })}
                        </p>
                        {selectedItem?.name ? <p>{selectedItem.name}</p> : null}
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                type="button"
                                outlined
                                label={ctx.t({ code: "common.cancel", msg: "Cancel" })}
                                onClick={() => setIsDeleteDialogOpen(false)}
                            />
                            <Button
                                type="submit"
                                severity="danger"
                                label={ctx.t({ code: "common.delete", msg: "Delete" })}
                                loading={deleteFetcher.state !== "idle"}
                            />
                        </div>
                    </deleteFetcher.Form>
                </Dialog>
            </>
        </MainContainer>
    );
}
