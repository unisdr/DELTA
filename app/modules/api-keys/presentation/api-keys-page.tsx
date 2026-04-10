import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";

import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/frontend/components/nav-settings";
import type { ApiKeysListResult, ApiKeyListItem } from "~/modules/api-keys/domain/entities/api-key";

type ApiKeysPageProps = {
    apiKeys: ApiKeysListResult;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    userRole: string | null;
};

function getApiKeysBasePath(pathname: string) {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length >= 2) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment === "edit" || lastSegment === "delete") {
            return `/${segments.slice(0, -2).join("/")}`;
        }

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

export default function ApiKeyManagementPage({
    apiKeys,
    canCreate,
    canUpdate,
    canDelete,
    userRole,
}: ApiKeysPageProps) {
    const { items, pagination } = apiKeys;
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = useMemo(() => getApiKeysBasePath(location.pathname), [location.pathname]);
    const pageSizeOptions = [10, 20, 30, 40, 50];
    const navSettings = <NavSettings userRole={userRole ?? undefined} />;

    const withCurrentSearch = (path: string) =>
        location.search ? `${path}${location.search}` : path;

    const updatePaginationParams = (nextPage: number, nextPageSize: number) => {
        const params = new URLSearchParams(location.search);
        params.set("page", String(nextPage));
        params.set("pageSize", String(nextPageSize));
        navigate(`${location.pathname}?${params.toString()}`);
    };

    const actionsBodyTemplate = (item: ApiKeyListItem) => (
        <div className="flex items-center justify-center gap-1">
            {canUpdate && (
                <Button
                    type="button"
                    aria-label={"Edit"}
                    text
                    onClick={() => navigate(withCurrentSearch(`${basePath}/${item.id}/edit`))}
                >
                    <i className="pi pi-pencil" aria-hidden="true" />
                </Button>
            )}
            {canDelete && (
                <Button
                    type="button"
                    text
                    severity="danger"
                    aria-label={"Delete"}
                    onClick={() => navigate(withCurrentSearch(`${basePath}/${item.id}/delete`))}
                >
                    <i className="pi pi-trash" aria-hidden="true" />
                </Button>
            )}
        </div>
    );

    const nameBodyTemplate = (item: ApiKeyListItem) => {
        const displayName = item.cleanName || item.name;
        const assignmentInfo = item.assignedUserId
            ? ` (Assigned to user: ${item.assignedUserId})`
            : "";

        return (
            <span title={item.issues.join("\n")}>
                {displayName}
                {assignmentInfo}
            </span>
        );
    };

    const statusBodyTemplate = (item: ApiKeyListItem) => {
        const statusStyle = item.isActive
            ? { color: "green", fontWeight: "bold" as const }
            : { color: "red", fontWeight: "bold" as const };
        const statusText = item.isActive ? "Active" : "Disabled";

        return <span style={statusStyle}>{statusText}</span>;
    };

    const secretBodyTemplate = (item: ApiKeyListItem) => {
        const masked =
            item.secret.length > 12
                ? `${item.secret.substring(0, 8)}...${item.secret.substring(item.secret.length - 4)}`
                : item.secret;

        const handleCopy = () => {
            navigator.clipboard.writeText(item.secret);
        };

        return (
            <div className="flex items-center gap-2">
                <code title={item.secret}>{masked}</code>
                <Button
                    type="button"
                    text
                    icon="pi pi-copy"
                    aria-label="Copy to clipboard"
                    onClick={handleCopy}
                    className="p-0 h-auto"
                />
            </div>
        );
    };

    return (
        <MainContainer title={"API keys"} headerExtra={navSettings}>
            <>
                <div className="mb-4 w-full">
                    <div className="flex w-full justify-end">
                        {canCreate && (
                            <Button
                                id="add_new_api_key"
                                label={"Add new API key"}
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
                            emptyMessage={"No data found"}
                        >
                            <Column
                                header={"Secret"}
                                body={secretBodyTemplate}
                                headerClassName="w-[22%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[22%] px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                field="createdAt"
                                header={"Created at"}
                                body={(item: ApiKeyListItem) => item.createdAt.toLocaleDateString()}
                                headerClassName="w-[16%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[16%] px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                field="managedByUser.email"
                                header={"Managed by"}
                                headerClassName="w-[18%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[18%] px-2 py-3 border-b border-gray-200 break-words"
                            />
                            <Column
                                header={"Key Name"}
                                body={nameBodyTemplate}
                                headerClassName="w-[24%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[24%] px-2 py-3 border-b border-gray-200 break-words"
                            />
                            <Column
                                header={"Status"}
                                body={statusBodyTemplate}
                                headerClassName="w-[10%] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                                bodyClassName="w-[10%] px-2 py-3 border-b border-gray-200"
                            />
                            <Column
                                header={""}
                                body={actionsBodyTemplate}
                                headerClassName="w-[10%] bg-gray-100 px-2 py-3 text-center font-medium border-b border-gray-200"
                                bodyClassName="w-[10%] px-2 py-3 border-b border-gray-200"
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