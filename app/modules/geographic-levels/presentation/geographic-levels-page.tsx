import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Paginator } from "primereact/paginator";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";

import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/frontend/components/nav-settings";
import { TreeView } from "~/components/TreeView";
import type { DivisionBreadcrumbRow } from "~/backend.server/models/division";
import type { GeographicLevelListItem } from "~/modules/geographic-levels/domain/entities/geographic-level";
import GeographicLevelBreadcrumbs from "~/modules/geographic-levels/presentation/geographic-level-breadcrumbs";

interface GeographicLevelsPageProps {
    langs: Record<string, number>;
    selectedLangs: string[];
    breadcrumbs: DivisionBreadcrumbRow[] | null;
    treeData: unknown[];
    items: GeographicLevelListItem[];
    pagination: {
        totalItems: number;
        itemsOnThisPage: number;
        page: number;
        pageSize: number;
        extraParams: Record<string, string[]>;
    };
    userRole?: string | null;
}

export default function GeographicLevelsPage({
    langs,
    selectedLangs,
    breadcrumbs,
    treeData,
    items,
    pagination,
    userRole,
}: GeographicLevelsPageProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);
    const navSettings = <NavSettings userRole={userRole ?? undefined} />;

    const sortedLangs = useMemo(
        () => Object.entries(langs).sort(([a], [b]) => a.localeCompare(b)),
        [langs],
    );

    const updateQuery = (overrides: Record<string, string | number>) => {
        const params = new URLSearchParams(location.search);
        for (const [key, value] of Object.entries(overrides)) {
            params.set(key, String(value));
        }
        navigate(`${location.pathname}?${params.toString()}`);
    };

    const linkToChildren = (item: GeographicLevelListItem) =>
        item.hasChildren ? `?parent=${item.id}` : "";

    const clickableBody = (item: GeographicLevelListItem, value: string) => {
        const childLink = linkToChildren(item);
        return childLink ? (
            <button
                type="button"
                onClick={() => navigate(`/settings/geography${childLink}`)}
                className="text-left text-sky-700 hover:text-sky-900 hover:underline"
            >
                {value}
            </button>
        ) : (
            <span>{value}</span>
        );
    };

    const actionsBody = (item: GeographicLevelListItem) => (
        <div className="flex items-center justify-end gap-1">
            <Button
                type="button"
                text
                aria-label="View"
                onClick={() => navigate(`/settings/geography/${item.id}`)}
            >
                <i className="pi pi-eye" aria-hidden="true" />
            </Button>
            <Button
                type="button"
                text
                aria-label="Edit"
                onClick={() => navigate(`/settings/geography/${item.id}/edit`)}
            >
                <i className="pi pi-pencil" aria-hidden="true" />
            </Button>
        </div>
    );

    return (
        <MainContainer title={"Geographic levels"} headerExtra={navSettings}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Geographic levels</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Browse the hierarchy in tree or table form, and keep CSV upload/export available.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            label="Export CSV"
                            icon="pi pi-download"
                            severity="secondary"
                            outlined
                            onClick={() => navigate("/settings/geography/csv-export")}
                        />
                        <Button
                            type="button"
                            label="Upload CSV"
                            icon="pi pi-upload"
                            onClick={() => navigate("/settings/geography/upload")}
                        />
                    </div>
                </div>

                <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    <TabPanel header="Tree view">
                        <Card className="shadow-sm">
                            <TreeView
                                treeData={treeData as any}
                                rootCaption={"Geographic levels"}
                                dialogMode={false}
                                disableButtonSelect={true}
                                noSelect={true}
                                search={true}
                                expanded={true}
                                itemLink="/settings/geography/[id]/edit?view=tree"
                                expandByDefault={true}
                            />
                        </Card>
                    </TabPanel>
                    <TabPanel header="Table view">
                        {pagination.totalItems > 0 ? (
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3">
                                    <GeographicLevelBreadcrumbs rows={breadcrumbs} />
                                    <div className="flex flex-wrap gap-2">
                                        {sortedLangs.map(([lang, count]) => (
                                            <Tag
                                                key={lang}
                                                value={`${lang.toUpperCase()} (${count})`}
                                                severity={selectedLangs.includes(lang) ? "info" : "secondary"}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <DataTable
                                        value={items}
                                        dataKey="id"
                                        emptyMessage="No data found"
                                        tableClassName="min-w-full"
                                    >
                                        <Column
                                            header="ID"
                                            body={(item: GeographicLevelListItem) => clickableBody(item, item.id)}
                                        />
                                        <Column
                                            header="National ID"
                                            body={(item: GeographicLevelListItem) =>
                                                clickableBody(item, item.nationalId || "-")
                                            }
                                        />
                                        {selectedLangs.map((lang) => (
                                            <Column
                                                key={lang}
                                                header={lang.toUpperCase()}
                                                body={(item: GeographicLevelListItem) =>
                                                    clickableBody(item, item.name[lang] || "-")
                                                }
                                            />
                                        ))}
                                        <Column
                                            header="Actions"
                                            body={actionsBody}
                                            headerClassName="text-right"
                                            bodyClassName="text-right"
                                        />
                                    </DataTable>
                                </div>

                                <Paginator
                                    first={(pagination.page - 1) * pagination.pageSize}
                                    rows={pagination.pageSize}
                                    totalRecords={pagination.totalItems}
                                    rowsPerPageOptions={[10, 20, 50]}
                                    onPageChange={(e) =>
                                        updateQuery({ page: e.page + 1, pageSize: e.rows })
                                    }
                                />
                            </div>
                        ) : (
                            <Message
                                severity="info"
                                content={
                                    <div className="flex flex-col gap-3">
                                        <span>
                                            No administrative divisions configured. Please upload CSV with data.
                                        </span>
                                        <a href="/assets/division_sample.zip" className="font-medium text-sky-700 underline">
                                            See example
                                        </a>
                                    </div>
                                }
                            />
                        )}
                    </TabPanel>
                </TabView>
            </div>
        </MainContainer>
    );
}
