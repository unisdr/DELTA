import { format } from "date-fns";
import { useEffect, useState } from "react";
import { MainContainer } from "~/frontend/container";
import { Pagination } from "~/frontend/pagination/view";
import { NavSettings } from "~/routes/$lang+/settings/nav";
import { LangLink } from "~/utils/link";
import { ViewContext } from "~/frontend/context";
import { getCountryRole, getCountryRoles } from "~/frontend/user/roles";
import { useLoaderData, useNavigate } from "react-router";
import type { loader } from "../routes/$lang+/settings+/access-mgmnt+/_layout";
import { Button } from "primereact/button";

export default function AccessManagementPage() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const navigate = useNavigate();
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

    // Dynamically calculate pagination
    const pagination = Pagination({
        ctx,
        itemsOnThisPage: filteredItems.length,
        totalItems: ld.pagination.total,
        page: ld.pagination.pageNumber,
        pageSize: ld.pagination.pageSize,
        extraParams: ld.pagination.extraParams,
    });

    const handleOrganizationFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase();
        setOrganizationFilter(value);
        setFilteredItems(
            items.filter((item) =>
                item.organization?.name.toLowerCase().includes(value),
            ),
        );
    };

    const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedRole = e.target.value;
        setRoleFilter(selectedRole);

        // Update the table data based on the selected role
        const filteredData =
            selectedRole === "all"
                ? items // Show all roles
                : items.filter((item) => item.role === selectedRole);
        setFilteredItems(filteredData);
    };

    // Calculate user stats
    const totalUsers = items.length;

    // Handle different formats for `emailVerified`
    const activatedUsers = filteredItems.filter((item) => {
        return item.user.emailVerified === true;
    }).length;

    const pendingUsers = filteredItems.filter(
        (item) => !item.user.emailVerified,
    ).length;

    const navSettings = <NavSettings ctx={ctx} userRole={ld.userRole} />;

    return (
        <MainContainer
            title={ctx.t({ code: "nav.access_management", msg: "Access management" })}
            headerExtra={navSettings}
        >
            <div className="dts-page-intro">
                <div className="dts-additional-actions">
                    <a
                        href={ctx.url("/about/technical-specifications")}
                        className="dts-link"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {ctx.t({
                            code: "nav.technical_specifications",
                            msg: "Technical specifications",
                        })}
                        <svg
                            aria-hidden="true"
                            focusable="false"
                            role="img"
                            style={{ marginLeft: "4px" }}
                        >
                            <use href="/assets/icons/external-link-open-new.svg#external"></use>
                        </svg>
                    </a>
                    <Button
                        type="button"
                        label={ctx.t({ code: "settings.access_mgmnt.add_user", msg: "Add user" })}
                        icon="pi pi-plus"
                        onClick={() => navigate(ctx.url("/settings/access-mgmnt/new"))}
                    />
                </div>
            </div>

            <section className="dts-page-section">
                <div className="dts-element-summary">
                    <h2 className="dts-element-summary__title">
                        <span>
                            {ctx.t(
                                {
                                    code: "settings.access_mgmnt.current_user_count",
                                    msg: "Currently there are [{totalUsers}] users in the system.",
                                },
                                { totalUsers: totalUsers },
                            )}
                        </span>
                    </h2>
                </div>
            </section>

            {/* Filter Form */}
            <form method="get" className="dts-form">
                <div className="mg-grid mg-grid__col-3">
                    {/* Organisation Filter */}
                    <div className="dts-form-component">
                        <label className="dts-form-component__label">
                            {ctx.t({ code: "common.organization", msg: "Organization" })}
                            <input
                                type="search"
                                name="organization"
                                value={organizationFilter}
                                placeholder="Type organisation name"
                                onChange={handleOrganizationFilter}
                                autoComplete="organization"
                            />
                        </label>
                    </div>

                    {/* Role Filter */}
                    <div className="dts-form-component">
                        <label className="dts-form-component__label">
                            {ctx.t({ code: "common.role", msg: "Role" })}
                            <select
                                name="role"
                                value={roleFilter}
                                onChange={handleRoleFilter}
                            >
                                <option value="all">
                                    {ctx.t({
                                        code: "access_management.all_roles",
                                        msg: "All Roles",
                                    })}
                                </option>
                                {getCountryRoles(ctx).map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>
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
                        {ctx.t({ code: "common.status_legend", msg: "Status legend" })}
                    </span>

                    <div className="dts-legend__item">
                        <span
                            className="dts-status dts-status--activated"
                            aria-labelledby="legend7"
                        ></span>
                        <span id="legend7">
                            {ctx.t({
                                code: "settings.access_mgmnt.account_activated",
                                msg: "Account activated",
                            })}
                            : {activatedUsers}
                        </span>
                    </div>

                    <div className="dts-legend__item">
                        <span aria-labelledby="legend8"></span>
                        <span id="legend8">
                            {ctx.t({
                                code: "settings.access_mgmnt.account_activation_pending",
                                msg: "Account activation pending",
                            })}
                            : {pendingUsers}
                        </span>
                    </div>
                </div>
            </section>

            {/* Users Table */}
            {isClient && (
                <section className="dts-page-section">
                    <table className="dts-table">
                        <thead>
                            <tr>
                                <th>{ctx.t({ code: "common.status", msg: "Status" })}</th>
                                <th>{ctx.t({ code: "common.name", msg: "Name" })}</th>
                                <th>{ctx.t({ code: "common.email", msg: "Email" })}</th>
                                <th>
                                    {ctx.t({ code: "common.organization", msg: "Organization" })}
                                </th>
                                <th>{ctx.t({ code: "common.role", msg: "Role" })}</th>
                                <th>{ctx.t({ code: "common.addedAt", msg: "Added At" })}</th>
                                <th>{ctx.t({ code: "common.actions", msg: "Actions" })}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <span
                                            className={`dts-access-management__status-dot ${item.user.emailVerified
                                                ? "dts-access-management__status-dot--activated"
                                                : "dts-access-management__status-dot--pending"
                                                }`}
                                        >
                                            <span className="dts-access-management__tooltip-text">
                                                {item.user.emailVerified
                                                    ? ctx.t({
                                                        code: "common.activated",
                                                        msg: "Activated",
                                                    })
                                                    : ctx.t({ code: "common.pending", msg: "Pending" })}
                                            </span>
                                            <span className="dts-access-management__tooltip-pointer"></span>
                                        </span>
                                    </td>

                                    <td>
                                        <LangLink
                                            lang={ctx.lang}
                                            to={`/settings/access-mgmnt/edit/${item.user.id}`}
                                            className="link"
                                        >
                                            {item.user.firstName} {item.user.lastName}
                                        </LangLink>
                                    </td>
                                    <td>{item.user.email}</td>
                                    <td>{item.organization?.name}</td>
                                    {/* Updated Role Column with Badge */}
                                    <td>
                                        <span>
                                            {(() => {
                                                const roleObj = getCountryRole(ctx, item.role);
                                                return roleObj ? roleObj.label : item.role;
                                            })()}{" "}{item.isPrimaryAdmin ? "(Primary Admin)" : ""}
                                        </span>
                                    </td>
                                    <td>
                                        {item.addedAt &&
                                            format(item.addedAt, "dd-MM-yyyy")}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <LangLink
                                                lang={ctx.lang}
                                                to={`/settings/access-mgmnt/edit/${item.user.id}`}
                                                aria-label={ctx.t({
                                                    code: "common.edit",
                                                    msg: "Edit",
                                                })}
                                                className="mg-button mg-button-table"
                                            >
                                                <svg
                                                    aria-hidden="true"
                                                    focusable="false"
                                                    role="img"
                                                    style={{ marginLeft: "4px" }}
                                                >
                                                    <use href="/assets/icons/edit.svg#edit"></use>
                                                </svg>
                                            </LangLink>
                                            <LangLink
                                                lang={ctx.lang}
                                                to={`/settings/access-mgmnt/delete/${item.user.id}`}
                                                aria-label={ctx.t({
                                                    code: "settings.access_mgmnt.delete_user",
                                                    msg: "Delete User",
                                                })}
                                                className="mg-button mg-button-table text-red-600"
                                            >
                                                <i className="pi pi-trash" aria-hidden="true" />
                                            </LangLink>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
            <section className="dts-page-section">{pagination}</section>
        </MainContainer>
    );
}
