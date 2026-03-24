import { Outlet, useFetcher, useLoaderData, useNavigate } from "react-router";
import { eq } from "drizzle-orm";
import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Toast } from "primereact/toast";

import { dr } from "~/db.server";
import { countriesTable } from "~/drizzle/schema/countriesTable";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../../settings/nav";
import { authLoaderWithPerm } from "~/utils/auth";
import { ViewContext } from "~/frontend/context";

type LoaderData = {
    items: Array<{ id: string; name: string; type: string }>;
};

type DeleteActionData =
    | { success: true; operation: "delete" }
    | { errors: string[] };

export const loader = authLoaderWithPerm(
    "manage_country_accounts",
    async () => {
        const items = await dr
            .select({
                id: countriesTable.id,
                name: countriesTable.name,
                type: countriesTable.type,
            })
            .from(countriesTable)
            .where(eq(countriesTable.type, "Fictional"))
            .orderBy(countriesTable.name);

        return { items } satisfies LoaderData;
    },
);

export default function FictitiousCountryManagementLayout() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const navigate = useNavigate();
    const deleteFetcher = useFetcher<DeleteActionData>();
    const toast = useRef<Toast>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    function handleDelete(countryId: string, countryName: string) {
        confirmDialog({
            message: ctx.t({
                code: "admin.fictitious_country_delete_confirm",
                msg: `Delete fictitious country \"${countryName}\"?`,
            }),
            header: ctx.t({
                code: "common.record_deletion",
                msg: "Record Deletion",
            }),
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger p-button-outlined",
            rejectClassName: "p-button-outlined ml-2",
            defaultFocus: "reject",
            acceptLabel: ctx.t({ code: "common.yes", msg: "Yes" }),
            rejectLabel: ctx.t({ code: "common.no", msg: "No" }),
            accept: () => {
                setDeletingId(countryId);
                deleteFetcher.submit(
                    {},
                    {
                        method: "post",
                        action: ctx.url(`/admin/fictitious-country-mgmt/delete/${countryId}`),
                    },
                );
            },
            reject: () => {
                setDeletingId(null);
            },
        });
    }

    useEffect(() => {
        if (deleteFetcher.state !== "idle") {
            return;
        }

        if (deleteFetcher.data && "success" in deleteFetcher.data) {
            setDeletingId(null);
            toast.current?.show({
                severity: "success",
                summary: ctx.t({ code: "common.success", msg: "Success" }),
                detail: ctx.t({
                    code: "admin.fictitious_country_deleted",
                    msg: "Fictitious country deleted successfully",
                }),
            });
            return;
        }

        if (deleteFetcher.data && "errors" in deleteFetcher.data) {
            setDeletingId(null);
            toast.current?.show({
                severity: "error",
                summary: ctx.t({ code: "common.error", msg: "Error" }),
                detail: deleteFetcher.data.errors[0],
            });
        }
    }, [deleteFetcher.data, deleteFetcher.state]);

    return (
        <MainContainer
            title={ctx.t({
                code: "admin.fictitious_country_management",
                msg: "Fictitious Country Management",
            })}
            headerExtra={<NavSettings ctx={ctx} />}
        >
            <ConfirmDialog />
            <Toast ref={toast} />

            <div className="dts-page-intro" style={{ paddingRight: 0 }}>
                <div className="dts-additional-actions">
                    <Button
                        label={ctx.t({
                            code: "admin.add_fictitious_country",
                            msg: "Add fictitious country",
                        })}
                        icon="pi pi-plus"
                        onClick={() => navigate(ctx.url("/admin/fictitious-country-mgmt/new"))}
                    />
                </div>
            </div>

            <div className="w-full overflow-x-auto [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full">
                <DataTable
                    value={ld.items}
                    dataKey="id"
                    className="w-full"
                    tableClassName="!table w-full min-w-full border-collapse"
                    emptyMessage={ctx.t({ code: "common.no_data_found", msg: "No data found" })}
                >
                    <Column
                        field="name"
                        header={ctx.t({ code: "common.name", msg: "Name" })}
                    />
                    <Column
                        header={ctx.t({ code: "common.actions", msg: "Actions" })}
                        body={(row: { id: string; name: string }) => {
                            const isDeleting =
                                deleteFetcher.state !== "idle" && deletingId === row.id;

                            return (
                                <div className="flex gap-2">
                                    <Button
                                        text
                                        severity="secondary"
                                        onClick={() =>
                                            navigate(
                                                ctx.url(`/admin/fictitious-country-mgmt/edit/${row.id}`),
                                            )
                                        }
                                        className="p-2"
                                    >
                                        <i className="pi pi-pencil" aria-hidden="true"></i>
                                    </Button>
                                    <Button
                                        text
                                        severity="danger"
                                        loading={isDeleting}
                                        onClick={() => handleDelete(row.id, row.name)}
                                        className="p-2"
                                    >
                                        <i className="pi pi-trash" aria-hidden="true"></i>
                                    </Button>
                                </div>
                            );
                        }}
                    />
                </DataTable>
            </div>

            <Outlet />
        </MainContainer>
    );
}
