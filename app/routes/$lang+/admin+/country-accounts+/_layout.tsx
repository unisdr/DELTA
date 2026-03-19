import { MetaFunction, Outlet, useFetcher, useLoaderData, useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Toast } from "primereact/toast";

import {
    CountryAccountWithCountryAndPrimaryAdminUser,
    getCountryAccountsWithUserCountryAccountsAndUser,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../../settings/nav";
import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";
import {
    countryAccountStatuses,
    countryAccountTypesTable,
} from "~/drizzle/schema/countryAccounts";
import { resetInstanceData } from "~/services/countryAccountService";
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
    async () => {
        const countryAccounts =
            await getCountryAccountsWithUserCountryAccountsAndUser();
        return { countryAccounts };
    },
);

type ActionData =
    | { success: true; operation: "reset" }
    | { errors: string[] };

export const action = authActionWithPerm(
    "manage_country_accounts",
    async (actionArgs) => {
        const { request } = actionArgs;
        const formData = await request.formData();
        const intent = formData.get("intent") as string;
        const id = formData.get("id") as string;

        if (intent === "reset") {
            await resetInstanceData(id);
            return { success: true, operation: "reset" } satisfies ActionData;
        }

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
    const { countryAccounts } = ld;

    const navigate = useNavigate();
    const resetFetcher = useFetcher<ActionData>();
    const toast = useRef<Toast>(null);

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
                resetFetcher.submit(
                    { intent: "reset", id: countryAccount.id },
                    { method: "post" },
                );
            },
        });
    }

    useEffect(() => {
        if (
            resetFetcher.data &&
            "success" in resetFetcher.data &&
            resetFetcher.data.operation === "reset"
        ) {
            toast.current?.show({
                severity: "info",
                summary: ctx.t({ code: "common.success", msg: "Success" }),
                detail: ctx.t({
                    code: "admin.instance_data_reset",
                    msg: "Instance data has been reset successfully",
                }),
            });
        }
    }, [resetFetcher.data]);

    return (
        <MainContainer
            title={ctx.t({
                code: "admin.manage_country_accounts_super_admin",
                msg: "Manage Country Accounts - Super Admin",
            })}
            headerExtra={<NavSettings ctx={ctx} />}
        >
            <ConfirmDialog />

            <div className="card flex justify-content-center">
                <Toast ref={toast} />
            </div>
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
            <table className="dts-table">
                <thead>
                    <tr>
                        <th>{ctx.t({ code: "common.country", msg: "Country" })}</th>
                        <th>
                            {ctx.t({
                                code: "common.short_description",
                                msg: "Short description",
                            })}
                        </th>
                        <th>{ctx.t({ code: "common.status", msg: "Status" })}</th>
                        <th>{ctx.t({ code: "common.type", msg: "Type" })}</th>
                        <th>
                            {ctx.t({
                                code: "admin.primary_admin_email",
                                msg: "Primary admin's email",
                            })}
                        </th>
                        <th>{ctx.t({ code: "common.created_at", msg: "Created at" })}</th>
                        <th>
                            {ctx.t({ code: "common.modified_at", msg: "Modified at" })}
                        </th>
                        <th>{ctx.t({ code: "common.actions", msg: "Actions" })}</th>
                    </tr>
                </thead>
                <tbody>
                    {countryAccounts.map((countryAccount) => (
                        <tr key={countryAccount.id}>
                            <td>{countryAccount.country.name}</td>
                            <td>{countryAccount.shortDescription}</td>
                            <td>
                                {countryAccount.status === countryAccountStatuses.ACTIVE
                                    ? ctx.t({ code: "common.active", msg: "Active" })
                                    : ctx.t({ code: "common.inactive", msg: "Inactive" })}
                            </td>
                            <td>
                                {countryAccount.type === countryAccountTypesTable.OFFICIAL ? (
                                    <Tag
                                        value={getCountryAccountTypeLabel(ctx, countryAccount.type)}
                                    />
                                ) : (
                                    <Tag
                                        value={getCountryAccountTypeLabel(ctx, countryAccount.type)}
                                        severity="warning"
                                    />
                                )}
                            </td>
                            <td>{countryAccount.userCountryAccounts[0].user.email}</td>
                            <td>{new Date(countryAccount.createdAt).toLocaleString()}</td>
                            <td>
                                {countryAccount.updatedAt
                                    ? new Date(countryAccount.updatedAt).toLocaleString()
                                    : ""}
                            </td>
                            <td>
                                <Button
                                    text
                                    severity="secondary"
                                    onClick={() =>
                                        navigate(
                                            ctx.url(
                                                `/admin/country-accounts/edit/${countryAccount.id}`,
                                            ),
                                        )
                                    }
                                    className="p-2"
                                >
                                    <i className="pi pi-pencil" aria-hidden="true"></i>
                                </Button>
                                {countryAccount.country.name === "Disaster Land" && (
                                    <Button
                                        tooltip="Reset all instance data"
                                        loading={resetFetcher.state === "submitting"}
                                        text
                                        severity="danger"
                                        onClick={() => handleResetInstanceData(countryAccount)}
                                        className="p-2"
                                    >
                                        <i
                                            className="pi pi-replay"
                                            style={{ fontSize: "1rem" }}
                                        ></i>
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Outlet />
        </MainContainer>
    );
}
