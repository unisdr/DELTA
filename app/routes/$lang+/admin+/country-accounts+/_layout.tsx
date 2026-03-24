import {
    MetaFunction,
    Outlet,
    useFetcher,
    useLoaderData,
    useLocation,
    useNavigate,
} from "react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";
import { Toast } from "primereact/toast";

import {
    CountryAccountsRepository,
    CountryAccountWithCountryAndPrimaryAdminUser,
} from "~/db/queries/countryAccountsRepository";
import { countryAccounts } from "~/drizzle/schema/countryAccounts";
import { dr } from "~/db.server";
import { MainContainer } from "~/frontend/container";
import { executeQueryForPagination3 } from "~/frontend/pagination/api.server";
import { NavSettings } from "../../settings/nav";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import {
    countryAccountStatuses,
    countryAccountTypesTable,
} from "~/drizzle/schema/countryAccounts";
import { ViewContext } from "~/frontend/context";
import { DContext } from "~/utils/dcontext";
import { htmlTitle } from "~/utils/htmlmeta";
import Tag from "~/components/Tag";

export const meta: MetaFunction = () => {
    const ctx = new ViewContext();

    return [
        {
            title: htmlTitle(
                ctx,
                ctx.t({
                    code: "meta.country_accounts_super_admin",
                    msg: "Country Accounts - Super Admin",
                }),
            ),
        },
        {
            name: "description",
            content: ctx.t({
                code: "meta.super_admin_country_accounts_management",
                msg: "Super Admin Country Accounts Management",
            }),
        },
    ];
};

export const loader = authLoaderWithPerm(
    "manage_country_accounts",
    async (loaderArgs) => {
        const { request } = loaderArgs;
        const totalItems = await dr.$count(countryAccounts);
        const data = await executeQueryForPagination3(
            request,
            totalItems,
            (pagination) =>
                CountryAccountsRepository.getAllWithUserCountryAccountsAndUserPaginated(
                    pagination.offset,
                    pagination.limit,
                ),
            [],
        );

        return data;
    },
);

type ActionData =
    | { errors: string[] };

export const action = authActionWithPerm(
    "manage_country_accounts",
    async () => {
        return { errors: ["Unknown intent"] } satisfies ActionData;
    },
);

export function getCountryAccountTypeLabel(
    ctx: DContext,
    type: string,
) {
    switch (type) {
        case "Official":
            return ctx.t({
                code: "admin.country_account_type.official",
                msg: "Official",
            });
        case "Training":
            return ctx.t({
                code: "admin.country_account_type.training",
                msg: "Training",
            });
        default:
            return type;
    }
}

export default function CountryAccountsLayout() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const { items: countryAccounts, pagination } = ld;

    const navigate = useNavigate();
    const location = useLocation();
    const resetFetcher = useFetcher<{ success?: true; operation?: "reset"; errors?: string[] }>();
    const toast = useRef<Toast>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const pageSizeOptions = [10, 20, 30, 40, 50];

    const updatePaginationParams = (nextPage: number, nextPageSize: number) => {
        const params = new URLSearchParams(location.search);
        params.set("page", String(nextPage));
        params.set("pageSize", String(nextPageSize));
        navigate(`${location.pathname}?${params.toString()}`);
    };

    function statusBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        return countryAccount.status === countryAccountStatuses.ACTIVE
            ? ctx.t({ code: "common.active", msg: "Active" })
            : ctx.t({ code: "common.inactive", msg: "Inactive" });
    }

    function typeBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        if (countryAccount.type === countryAccountTypesTable.OFFICIAL) {
            return (
                <Tag
                    value={getCountryAccountTypeLabel(ctx, countryAccount.type)}
                />
            );
        }

        return (
            <Tag
                value={getCountryAccountTypeLabel(ctx, countryAccount.type)}
                severity="warning"
            />
        );
    }

    function modifiedAtBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        return countryAccount.updatedAt
            ? new Date(countryAccount.updatedAt).toLocaleString()
            : "";
    }

    function actionsBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        const isResettingThisRow =
            resetFetcher.state !== "idle" && resettingId === countryAccount.id;

        return (
            <>
                <Button
                    text
                    severity="secondary"
                    onClick={() =>
                        navigate(
                            ctx.url(`/admin/country-accounts/edit/${countryAccount.id}`),
                        )
                    }
                    className="p-2"
                >
                    <i className="pi pi-pencil" aria-hidden="true"></i>
                </Button>
                {countryAccount.country.type === "Fictional" ? (
                    <Button
                        text
                        severity="contrast"
                        tooltip="Clone Instance"
                        className="p-2"
                        type="button"
                    >
                        <i className="pi pi-clone" aria-hidden="true"></i>
                    </Button>
                ) : null}
                {countryAccount.country.name === "Disaster Land" && (
                    <Button
                        tooltip="Reset all instance data"
                        loading={isResettingThisRow}
                        text
                        severity="danger"
                        onClick={() => handleResetInstanceData(countryAccount)}
                        className="p-2"
                    >
                        <i className="pi pi-replay" style={{ fontSize: "1rem" }}></i>
                    </Button>
                )}
            </>
        );
    }

    function handleResetInstanceData(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        confirmDialog({
            message: ctx.t({
                code: "admin.reset_instance_data_confirm_message",
                msg: "Are you sure you want to reset all instance data? This action cannot be undone.",
            }),
            header: ctx.t({
                code: "admin.reset_instance_data_confirm_header",
                msg: "Reset All Instance Data",
            }),
            icon: "pi pi-exclamation-triangle",
            acceptIcon: "pi pi-replay",
            rejectClassName: "p-button-outlined ml-2",
            acceptClassName: "p-button-danger p-button-outlined",
            defaultFocus: "reject",
            acceptLabel: ctx.t({ code: "common.yes", msg: "Yes" }),
            rejectLabel: ctx.t({ code: "common.no", msg: "No" }),
            accept: () => {
                setResettingId(countryAccount.id);
                resetFetcher.submit(
                    {},
                    {
                        method: "post",
                        action: ctx.url(`/admin/country-accounts/reset/${countryAccount.id}`),
                    },
                );
            },
            reject: () => {
                setResettingId(null);
            },
        });
    }

    useEffect(() => {
        if (resetFetcher.state !== "idle") {
            return;
        }

        if (resetFetcher.data?.success && resetFetcher.data.operation === "reset") {
            setResettingId(null);
            toast.current?.show({
                severity: "info",
                summary: ctx.t({ code: "common.success", msg: "Success" }),
                detail: ctx.t({
                    code: "admin.instance_data_reset",
                    msg: "Instance data has been reset successfully",
                }),
            });
            return;
        }

        if (resetFetcher.data?.errors?.length) {
            setResettingId(null);
            toast.current?.show({
                severity: "error",
                summary: ctx.t({ code: "common.error", msg: "Error" }),
                detail: resetFetcher.data.errors[0],
            });
        }
    }, [resetFetcher.data, resetFetcher.state]);

    return (
        <MainContainer
            title={ctx.t({
                code: "admin.manage_country_accounts_super_admin",
                msg: "Manage Country Accounts - Super Admin",
            })}
            headerExtra={<NavSettings ctx={ctx} />}
        >
            <ConfirmDialog />
            <Toast ref={toast} />

            <div className="dts-page-intro" style={{ paddingRight: 0 }}>
                <div className="dts-additional-actions">
                    <Button
                        label={ctx.t({
                            code: "admin.add_country_account",
                            msg: "Add country account",
                        })}
                        icon="pi pi-plus"
                        onClick={() => navigate(ctx.url("/admin/country-accounts/new"))}
                    />
                </div>
            </div>
            <div className="w-full overflow-x-auto [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full">
                <DataTable
                    value={countryAccounts}
                    dataKey="id"
                    className="w-full"
                    tableClassName="!table w-full min-w-full border-collapse"
                    emptyMessage={ctx.t({ code: "common.no_data_found", msg: "No data found" })}
                >
                    <Column
                        header={ctx.t({ code: "common.country", msg: "Country" })}
                        body={(countryAccount: CountryAccountWithCountryAndPrimaryAdminUser) =>
                            countryAccount.country.name}
                    />
                    <Column
                        header={ctx.t({ code: "common.short_description", msg: "Short description" })}
                        field="shortDescription"
                    />
                    <Column
                        header={ctx.t({ code: "common.status", msg: "Status" })}
                        body={statusBodyTemplate}
                    />
                    <Column
                        header={ctx.t({ code: "common.type", msg: "Type" })}
                        body={typeBodyTemplate}
                    />
                    <Column
                        header={ctx.t({
                            code: "admin.primary_admin_email",
                            msg: "Primary admin's email",
                        })}
                        body={(countryAccount: CountryAccountWithCountryAndPrimaryAdminUser) =>
                            countryAccount.userCountryAccounts[0].user.email}
                    />
                    <Column
                        header={ctx.t({ code: "common.created_at", msg: "Created at" })}
                        body={(countryAccount: CountryAccountWithCountryAndPrimaryAdminUser) =>
                            new Date(countryAccount.createdAt).toLocaleString()}
                    />
                    <Column
                        header={ctx.t({ code: "common.modified_at", msg: "Modified at" })}
                        body={modifiedAtBodyTemplate}
                    />
                    <Column
                        header={ctx.t({ code: "common.actions", msg: "Actions" })}
                        body={actionsBodyTemplate}
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
            <Outlet />
        </MainContainer>
    );
}
