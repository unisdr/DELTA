import {
    MetaFunction,
    Outlet,
    useLoaderData,
    useLocation,
    useNavigate,
} from "react-router";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";

import {
    CountryAccountsRepository,
    CountryAccountWithCountryAndPrimaryAdminUser,
} from "~/db/queries/countryAccountsRepository";
import { countryAccountsTable } from "~/drizzle/schema/countryAccountsTable";
import { dr } from "~/db.server";
import { MainContainer } from "~/frontend/container";
import { executeQueryForPagination3 } from "~/frontend/pagination/api.server";
import { NavSettings } from "../../settings/nav";
import { authLoaderWithPerm } from "~/utils/auth";
import {
    countryAccountStatuses,
    countryAccountTypesTable,
} from "~/drizzle/schema/countryAccountsTable";


import { htmlTitle } from "~/utils/htmlmeta";
import Tag from "~/components/Tag";
import { COUNTRY_TYPE } from "~/drizzle/schema";


export const meta: MetaFunction = () => {


    return [
        {
            title: htmlTitle(
                "Country Accounts - Super Admin",
            ),
        },
        {
            name: "description",
            content: "Super Admin Country Accounts Management",
        },
    ];
};

export const loader = authLoaderWithPerm(
    "ViewCountryAccounts",
    async (loaderArgs) => {
        const { request } = loaderArgs;
        const totalItems = await dr.$count(countryAccountsTable);
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

export function getCountryAccountTypeLabel(
    type: string,
) {
    switch (type) {
        case "Official":
            return "Official";
        case "Training":
            return "Training";
        default:
            return type;
    }
}

export default function CountryAccountsLayout() {
    const ld = useLoaderData<typeof loader>();

    const { items: countryAccounts, pagination } = ld;

    const navigate = useNavigate();
    const location = useLocation();
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
        return countryAccount.status === countryAccountStatuses.ACTIVE ? (
            <i
                className="pi pi-check-circle text-green-600"
                aria-label={"Active"}
                title={"Active"}
            ></i>
        ) : (
            <i
                className="pi pi-times-circle text-red-600"
                aria-label={"Inactive"}
                title={"Inactive"}
            ></i>
        );
    }

    function typeBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        if (countryAccount.type === countryAccountTypesTable.OFFICIAL) {
            return (
                <Tag
                    value={getCountryAccountTypeLabel(countryAccount.type)}
                />
            );
        }

        return (
            <Tag
                value={getCountryAccountTypeLabel(countryAccount.type)}
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

    function countryTypeBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        const countryType = countryAccount.country.type;
        return countryType === COUNTRY_TYPE.FICTIONAL ? (
            <Tag
                value={countryType}
                severity="warning"
            />
        ) : (
            <Tag
                value={countryType}
            />
        );
    }

    function actionsBodyTemplate(
        countryAccount: CountryAccountWithCountryAndPrimaryAdminUser,
    ) {
        const adminUser = countryAccount.userCountryAccounts[0]?.user;

        return (
            <>
                <Button
                    text
                    severity="secondary"
                    tooltip={"Edit"}
                    onClick={() =>
                        navigate(
                            `/admin/country-accounts/edit/${countryAccount.id}`,
                        )
                    }
                    className="p-2"
                >
                    <i className="pi pi-pencil" aria-hidden="true"></i>
                </Button>
                {adminUser && !adminUser.emailVerified ? (
                    <Button
                        text
                        type="button"
                        severity="help"
                        tooltip={"Resend invitation email"}
                        className="p-2"
                        onClick={() =>
                            navigate(
                                `/admin/country-accounts/resend-invitation/${countryAccount.id}`,
                            )
                        }
                    >
                        <i className="pi pi-envelope" aria-hidden="true"></i>
                    </Button>
                ) : null}
                {countryAccount.country.type === COUNTRY_TYPE.FICTIONAL ? (
                    <Button
                        text
                        severity="contrast"
                        tooltip="Clone Instance"
                        onClick={() =>
                            navigate(
                                `/admin/country-accounts/clone/${countryAccount.id}`,
                            )
                        }
                        className="p-2"
                        type="button"
                    >
                        <i className="pi pi-clone" aria-hidden="true"></i>
                    </Button>
                ) : null}
                {countryAccount.country.type === COUNTRY_TYPE.FICTIONAL && (
                    <Button
                        tooltip="Delete instance"
                        text
                        severity="danger"
                        onClick={() =>
                            navigate(
                                `/admin/country-accounts/delete/${countryAccount.id}`,
                            )
                        }
                        className="p-2"
                    >
                        <i className="pi pi-trash" style={{ fontSize: "1rem" }}></i>
                    </Button>
                )}
            </>
        );
    }

    return (
        <MainContainer
            title={"Manage Country Accounts - Super Admin"}
            headerExtra={<NavSettings />}
        >
            <div className="dts-page-intro" style={{ paddingRight: 0 }}>
                <div className="dts-additional-actions">
                    <Button
                        label={"Add country account"}
                        icon="pi pi-plus"
                        onClick={() => navigate("/admin/country-accounts/new")}
                    />
                </div>
            </div>
            <div className="w-full overflow-x-auto [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full">
                <DataTable
                    value={countryAccounts}
                    dataKey="id"
                    className="w-full"
                    tableClassName="!table w-full min-w-full border-collapse"
                    emptyMessage={"No data found"}
                >
                    <Column
                        header={"Country"}
                        body={(countryAccount: CountryAccountWithCountryAndPrimaryAdminUser) =>
                            countryAccount.country.name}
                    />
                    <Column
                        header={"Country Type"}
                        body={countryTypeBodyTemplate}
                    />
                    <Column
                        header={"Short description"}
                        field="shortDescription"
                    />
                    <Column
                        header={"Active"}
                        body={statusBodyTemplate}
                    />
                    <Column
                        header={"Type"}
                        body={typeBodyTemplate}
                    />
                    <Column
                        header={"Primary admin's email"}
                        body={(countryAccount: CountryAccountWithCountryAndPrimaryAdminUser) =>
                            countryAccount.userCountryAccounts[0].user.email}
                    />
                    <Column
                        header={"Created at"}
                        body={(countryAccount: CountryAccountWithCountryAndPrimaryAdminUser) =>
                            new Date(countryAccount.createdAt).toLocaleString()}
                    />
                    <Column
                        header={"Modified at"}
                        body={modifiedAtBodyTemplate}
                    />
                    <Column
                        header={"Actions"}
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
