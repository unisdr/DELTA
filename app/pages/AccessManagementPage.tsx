import { format } from "date-fns";
import { useEffect, useState } from "react";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/frontend/components/nav-settings";

import { getCountryRole, getCountryRoles } from "~/frontend/user/roles";
import { useLoaderData, useLocation, useNavigate } from "react-router";
import type { loader } from "../routes/settings/access-mgmnt/_layout";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { InputText } from "primereact/inputtext";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";

export default function AccessManagementPage() {
    const ld = useLoaderData<typeof loader>();

    const navigate = useNavigate();
    const location = useLocation();
    const { items } = ld;

    const [isClient, setIsClient] = useState(false);

    // Ensure client-specific rendering only occurs after the component mounts
    useEffect(() => {
        setIsClient(true);
        setFilteredItems(items); // Ensure data is consistent
    }, [items]);

    // State for search and filtered users
    const [filteredItems, setFilteredItems] = useState(items);
    const [organizationFilter, setOrganizationFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");

    const pageSizeOptions = [10, 20, 30, 40, 50];

    const updatePaginationParams = (nextPage: number, nextPageSize: number) => {
        const params = new URLSearchParams(location.search);
        params.set("page", String(nextPage));
        params.set("pageSize", String(nextPageSize));
        navigate(`${location.pathname}?${params.toString()}`);
    };

    const handleOrganizationFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase();
        setOrganizationFilter(value);
        setFilteredItems(
            items.filter((item) =>
                item.organization?.name.toLowerCase().includes(value),
            ),
        );
    };

    const handleRoleFilter = (e: DropdownChangeEvent) => {
        const selectedRole = String(e.value || "all");
        setRoleFilter(selectedRole);

        // Update the table data based on the selected role
        const filteredData =
            selectedRole === "all"
                ? items // Show all roles
                : items.filter((item) => item.role === selectedRole);
        setFilteredItems(filteredData);
    };

    const roleOptions = [
        { label: "All Roles", value: "all" },
        ...getCountryRoles().map((role) => ({
            label: role.label,
            value: role.id,
        })),
    ];

    // Calculate user stats
    const totalUsers = items.length;

    // Handle different formats for `emailVerified`
    const activatedUsers = filteredItems.filter((item) => {
        return item.user.emailVerified === true;
    }).length;

    const pendingUsers = filteredItems.filter(
        (item) => !item.user.emailVerified,
    ).length;

    const navSettings = <NavSettings userRole={ld.userRole} />;

    const statusBodyTemplate = (item: (typeof filteredItems)[number]) => (
        <span
            className={`dts-access-management__status-dot ${item.user.emailVerified
                ? "dts-access-management__status-dot--activated"
                : "dts-access-management__status-dot--pending"
                }`}
        >
            <span className="dts-access-management__tooltip-text">
                {item.user.emailVerified
                    ? "Activated"
                    : "Pending"}
            </span>
            <span className="dts-access-management__tooltip-pointer"></span>
        </span>
    );

    const nameBodyTemplate = (item: (typeof filteredItems)[number]) => (
        <Button
            type="button"
            link
            label={`${item.user.firstName} ${item.user.lastName}`}
            onClick={() => navigate(`/settings/access-mgmnt/${item.user.id}/edit`)}
        />
    );

    const roleBodyTemplate = (item: (typeof filteredItems)[number]) => {
        const roleObj = getCountryRole(item.role);
        return (
            <span>
                {roleObj ? roleObj.label : item.role}{" "}
                {item.isPrimaryAdmin ? "(Primary Admin)" : ""}
            </span>
        );
    };

    const addedAtBodyTemplate = (item: (typeof filteredItems)[number]) => (
        item.addedAt ? format(item.addedAt, "dd-MM-yyyy") : ""
    );

    const actionsBodyTemplate = (item: (typeof filteredItems)[number]) => (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                text
                aria-label={"Edit"}
                onClick={() => navigate(`/settings/access-mgmnt/${item.user.id}/edit`)}
            >
                <i className="pi pi-pencil" aria-hidden="true" />
            </Button>
            {!item.user.emailVerified ? (
                <Button
                    type="button"
                    text
                    severity="help"
                    aria-label={"Resend invitation email"}
                    title={"Resend invitation email"}
                    onClick={() =>
                        navigate(`/settings/access-mgmnt/${item.user.id}/resend-invitation`)
                    }
                >
                    <i className="pi pi-envelope" aria-hidden="true" />
                </Button>
            ) : null}
            <Button
                type="button"
                text
                severity="danger"
                aria-label={"Delete User"}
                onClick={() => navigate(`/settings/access-mgmnt/${item.user.id}/delete`)}
            >
                <i className="pi pi-trash" aria-hidden="true" />
            </Button>
        </div>
    );

    return (
        <MainContainer
            title={"Access management"}
            headerExtra={navSettings}
        >
            <div className="dts-page-intro">
                <div className="dts-additional-actions">
                    <Button
                        type="button"
                        label={"Add user"}
                        icon="pi pi-plus"
                        onClick={() => navigate("/settings/access-mgmnt/new")}
                    />
                </div>
            </div>

            <section className="dts-page-section">
                <div className="dts-element-summary">
                    <h2 className="dts-element-summary__title">
                        <span>{`Currently there are ${totalUsers} users in the system.`}</span>
                    </h2>
                </div>
            </section>

            {/* Filter Form */}
            <form method="get" className="dts-form">
                <div className="mg-grid mg-grid__col-3">
                    {/* Organisation Filter */}
                    <div className="dts-form-component">
                        <label className="dts-form-component__label" htmlFor="organizationFilter">
                            {"Organization"}
                        </label>
                        <InputText
                            id="organizationFilter"
                            name="organization"
                            value={organizationFilter}
                            placeholder="Type organisation name"
                            onChange={handleOrganizationFilter}
                            autoComplete="organization"
                            className="w-full"
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="dts-form-component">
                        <label className="dts-form-component__label" htmlFor="roleFilter">
                            {"Role"}
                        </label>
                        <Dropdown
                            id="roleFilter"
                            name="role"
                            value={roleFilter || "all"}
                            onChange={handleRoleFilter}
                            options={roleOptions}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select role"
                            className="w-full"
                        />
                    </div>
                </div>
            </form>

            <section className="dts-page-section">
                <div>
                    <strong className="dts-body-label">
                        {filteredItems.length} of {totalUsers} Users
                    </strong>
                </div>

                {/* Status Legend */}
                <div className="dts-legend">
                    <span className="dts-body-label">
                        {"Status legend"}
                    </span>

                    <div className="dts-legend__item">
                        <span
                            className="dts-status dts-status--activated"
                            aria-labelledby="legend7"
                        ></span>
                        <span id="legend7">
                            {"Account activated"}
                            : {activatedUsers}
                        </span>
                    </div>

                    <div className="dts-legend__item">
                        <span aria-labelledby="legend8"></span>
                        <span id="legend8">
                            {"Account activation pending"}
                            : {pendingUsers}
                        </span>
                    </div>
                </div>
            </section>

            {/* Users Table */}
            {isClient && (
                <section className="dts-page-section">
                    <DataTable
                        value={filteredItems}
                        dataKey="id"
                        emptyMessage={"No data found"}
                    >
                        <Column
                            header={"Status"}
                            body={statusBodyTemplate}
                        />
                        <Column
                            header={"Name"}
                            body={nameBodyTemplate}
                        />
                        <Column
                            header={"Email"}
                            body={(item) => item.user.email}
                        />
                        <Column
                            header={"Organization"}
                            body={(item) => item.organization?.name || ""}
                        />
                        <Column
                            header={"Role"}
                            body={roleBodyTemplate}
                        />
                        <Column
                            header={"Added At"}
                            body={addedAtBodyTemplate}
                        />
                        <Column
                            header={"Actions"}
                            body={actionsBodyTemplate}
                        />
                    </DataTable>
                </section>
            )}
            {ld.pagination.total > 0 && (
                <section className="dts-page-section">
                    <Paginator
                        first={(ld.pagination.pageNumber - 1) * ld.pagination.pageSize}
                        rows={ld.pagination.pageSize}
                        totalRecords={ld.pagination.total}
                        rowsPerPageOptions={pageSizeOptions}
                        onPageChange={(event) => {
                            updatePaginationParams(event.page + 1, event.rows);
                        }}
                        className="mt-4 !justify-end"
                    />
                </section>
            )}
        </MainContainer>
    );
}


