import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import { Checkbox, CheckboxChangeEvent } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Paginator } from "primereact/paginator";
import { TabPanel, TabView } from "primereact/tabview";
import { Tree, TreeExpandedKeysType } from "primereact/tree";
import { TreeNode } from "primereact/treenode";
import { VirtualScroller } from "primereact/virtualscroller";
import { BreadCrumb as PrimeBreadCrumb } from "primereact/breadcrumb";
import { MenuItem } from "primereact/menuitem";
import { authLoaderWithPerm } from "~/utils/auth";
import { NavSettings } from "~/frontend/components/NavSettings";
import {
    DivisionBreadcrumbRow,
} from "~/backend.server/models/division";
import { DivisionRepository } from "~/db/queries/divisonRepository";
import { MainContainer } from "~/frontend/container";
import { buildTree } from "~/components/TreeView";
import { getCountryAccountsIdFromSession, getUserRoleFromSession } from "~/utils/session";
import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/utils/link";

interface ItemRes {
    id: string;
    nationalId: string;
    hasChildren: boolean;
    name: Record<string, string>;
}

type BreadcrumbProps = {
    ctx: ViewContext;
    rows: DivisionBreadcrumbRow[] | null;
    linkLast?: boolean;
};

function GeographyBreadcrumb({ ctx, rows, linkLast }: BreadcrumbProps) {
    if (!rows) {
        return null;
    }

    const home: MenuItem = {
        label: "Root",
        template: (item, options) => (
            <LangLink
                lang={ctx.lang}
                to="/settings/geography"
                className={options.className}
            >
                {item.label}
            </LangLink>
        ),
    };

    const model: MenuItem[] = rows.map((row, index) => {
        const isLink = index < rows.length - 1 || linkLast;
        return {
            label: row.name,
            template: (item, options) => {
                if (!isLink) {
                    return <span className={options.className}>{item.label}</span>;
                }
                return (
                    <LangLink
                        lang={ctx.lang}
                        to={`/settings/geography?parent=${row.id}&view=table`}
                        className={options.className}
                    >
                        {item.label}
                    </LangLink>
                );
            },
        };
    });

    return (
        <PrimeBreadCrumb
            className="mb-3"
            home={home}
            model={model}
        />
    );
}

export const loader = authLoaderWithPerm(
    "ManageCountrySettings",
    async (loaderArgs) => {
        const { request } = loaderArgs;
        const countryAccountsId = await getCountryAccountsIdFromSession(request);

        const url = new URL(request.url);
        const parentId = url.searchParams.get("parent") || null;

        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const pageSize = Math.max(
            1,
            parseInt(url.searchParams.get("pageSize") || "10", 10),
        );

        const allRows = await DivisionRepository.getByCountryAccountsId(
            countryAccountsId,
        );

        const rowsByParent = allRows.filter((row) =>
            parentId ? row.parentId === parentId : row.parentId === null,
        );

        const langs: Record<string, number> = {};
        for (const row of rowsByParent) {
            for (const lang of Object.keys((row.name || {}) as Record<string, string>)) {
                langs[lang] = (langs[lang] || 0) + 1;
            }
        }

        const selectedLangs = Object.entries(langs)
            .sort(([ak, ac], [bk, bc]) => {
                if (bc !== ac) {
                    return bc - ac;
                }
                return ak.localeCompare(bk);
            })
            .slice(0, 3)
            .map(([lang]) => lang)
            .sort();

        let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
        if (parentId) {
            const byId = new Map(allRows.map((row) => [row.id, row]));
            const selectedLang = selectedLangs[0];
            breadcrumbs = [];
            let currentId: string | null = parentId;
            while (currentId) {
                const row = byId.get(currentId);
                if (!row) {
                    break;
                }
                const nameMap = (row.name || {}) as Record<string, string>;
                const nameLang =
                    (selectedLang && nameMap[selectedLang] ? selectedLang : Object.keys(nameMap)[0]) ||
                    "";
                breadcrumbs.unshift({
                    id: row.id,
                    parentId: row.parentId,
                    nameLang,
                    name: nameLang ? nameMap[nameLang] || "" : "",
                });
                currentId = row.parentId;
            }
        }

        const childrenParentSet = new Set(
            allRows.filter((row) => row.parentId).map((row) => row.parentId),
        );

        const totalItems = rowsByParent.length;
        const offset = (page - 1) * pageSize;
        const items: ItemRes[] = rowsByParent.slice(offset, offset + pageSize).map((row) => ({
            id: row.id,
            nationalId: row.nationalId || "",
            name: (row.name || {}) as Record<string, string>,
            hasChildren: childrenParentSet.has(row.id),
        }));

        const treeData = buildTree(allRows, "id", "parentId", "name", "en");

        const extraParams: Record<string, string[]> = {};
        if (parentId) {
            extraParams.parent = [parentId];
        }

        const userRole = await getUserRoleFromSession(request);

        return {
            langs,
            breadcrumbs,
            selectedLangs,
            treeData,
            items,
            pagination: {
                totalItems,
                itemsOnThisPage: items.length,
                page,
                pageSize,
                extraParams,
            },
            userRole,
        };
    },
);

type LanguageCheckboxesProps = {
    langs: Record<string, number>;
    selectedLangs: string[];
    onChange: (lang: string, checked: boolean) => void;
};

function LanguageCheckboxes({
    langs,
    selectedLangs,
    onChange,
}: LanguageCheckboxesProps) {
    const sortedLangs = Object.entries(langs).sort(([a], [b]) =>
        a.localeCompare(b),
    );

    return (
        <div className="mb-3 flex flex-wrap gap-3">
            {sortedLangs.map(([lang, count]) => (
                <div key={lang} className="flex items-center gap-2">
                    <Checkbox
                        inputId={lang}
                        name={lang}
                        checked={selectedLangs.includes(lang)}
                        onChange={(e: CheckboxChangeEvent) =>
                            onChange(lang, !!e.checked)
                        }
                    />
                    <label htmlFor={lang}>
                        {lang.toUpperCase()} ({count})
                    </label>
                </div>
            ))}
        </div>
    );
}

type DivisionsTableProps = {
    ctx: ViewContext;
    items: ItemRes[];
    langs: string[];
};

function relLinkOrText(linkUrl: string, text: string | number) {
    return linkUrl ? <Link to={linkUrl}>{text}</Link> : <span>{text}</span>;
}

function DivisionsTable({ ctx, items, langs }: DivisionsTableProps) {
    const idBody = (item: ItemRes) => {
        const linkUrl = item.hasChildren ? `?parent=${item.id}&view=table` : "";
        return relLinkOrText(linkUrl, item.id);
    };

    const nationalIdBody = (item: ItemRes) => {
        const linkUrl = item.hasChildren ? `?parent=${item.id}&view=table` : "";
        return relLinkOrText(linkUrl, item.nationalId);
    };

    const actionBody = (item: ItemRes) => {
        return (
            <div className="flex justify-end gap-2">
                <LangLink lang={ctx.lang} to={`/settings/geography/${item.id}`}>
                    <Button
                        type="button"
                        icon="pi pi-eye"
                        text
                        size="small"
                        aria-label={ctx.t({ code: "common.view", msg: "View" })}
                    />
                </LangLink>
                <LangLink lang={ctx.lang} to={`/settings/geography/edit/${item.id}?view=table`}>
                    <Button
                        type="button"
                        icon="pi pi-pencil"
                        text
                        size="small"
                        aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
                    />
                </LangLink>
            </div>
        );
    };

    return (
        <DataTable value={items} size="small" stripedRows className="w-full">
            <Column
                field="id"
                header={ctx.t({ code: "common.id", msg: "ID" })}
                body={idBody}
            />
            <Column
                field="nationalId"
                header={ctx.t({
                    code: "geographies.national_id",
                    desc: "Label showing the national ID code assigned to a geographical subdivision (e.g. region, district, or administrative level). Used in geo-level data management and location hierarchies.",
                    msg: "National ID",
                })}
                body={nationalIdBody}
            />
            {langs.map((lang) => (
                <Column
                    key={lang}
                    header={lang.toUpperCase()}
                    body={(item: ItemRes) => {
                        const linkUrl = item.hasChildren ? `?parent=${item.id}&view=table` : "";
                        return relLinkOrText(linkUrl, item.name[lang] || "-");
                    }}
                />
            ))}
            <Column body={actionBody} />
        </DataTable>
    );
}

type DivisionTreeNodeInput = {
    id: string | number;
    name: string;
    children?: DivisionTreeNodeInput[];
};

function toPrimeTreeNodes(nodes: DivisionTreeNodeInput[]): TreeNode[] {
    return nodes.map((node) => ({
        key: String(node.id),
        label: node.name,
        data: { id: node.id },
        children: toPrimeTreeNodes(node.children || []),
    }));
}

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
    if (!query.trim()) {
        return nodes;
    }

    const q = query.toLowerCase();

    const out: TreeNode[] = [];
    for (const node of nodes) {
        const label = String(node.label || "").toLowerCase();
        const children = filterTreeNodes(node.children || [], query);
        if (label.includes(q) || children.length > 0) {
            out.push({ ...node, children });
        }
    }

    return out;
}

function expandAllNodes(nodes: TreeNode[], keys: TreeExpandedKeysType = {}) {
    for (const node of nodes) {
        if (node.key) {
            keys[String(node.key)] = true;
        }
        if (node.children?.length) {
            expandAllNodes(node.children, keys);
        }
    }
    return keys;
}

export default function Screen() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const navigate = useNavigate();
    const location = useLocation();
    const navSettings = <NavSettings ctx={ctx} userRole={ld.userRole} />;
    const primeTreeNodes = useMemo(
        () => toPrimeTreeNodes(ld.treeData as DivisionTreeNodeInput[]),
        [ld.treeData],
    );

    const tabFromSearch = useCallback((search: string) => {
        const params = new URLSearchParams(search);
        return params.get("view") === "table" ? 1 : 0;
    }, []);

    const [selectedLangs, setSelectedLangs] = useState(ld.selectedLangs);
    const [activeTab, setActiveTab] = useState(() => tabFromSearch(location.search));
    const [treeSearchTerm, setTreeSearchTerm] = useState("");
    const [expandedKeys, setExpandedKeys] = useState<TreeExpandedKeysType>({});
    const [isPending, startTransition] = useTransition();

    const filteredNodes = useMemo(
        () => filterTreeNodes(primeTreeNodes, treeSearchTerm),
        [primeTreeNodes, treeSearchTerm],
    );

    const expandedFilteredKeys = useMemo(
        () => expandAllNodes(filteredNodes),
        [filteredNodes],
    );

    useEffect(() => {
        setActiveTab(tabFromSearch(location.search));
    }, [location.search, tabFromSearch]);

    // Auto-expand matched nodes when searching, collapse when search is cleared
    useEffect(() => {
        if (treeSearchTerm.trim()) {
            setExpandedKeys(expandedFilteredKeys);
        } else {
            setExpandedKeys({});
        }
    }, [expandedFilteredKeys, treeSearchTerm]);

    const onLangChange = (lang: string, checked: boolean) => {
        setSelectedLangs((prev) => {
            if (checked) {
                return prev.includes(lang) ? prev : [...prev, lang].sort();
            }
            return prev.filter((l) => l !== lang);
        });
    };

    const onExpandAll = () => {
        startTransition(() => {
            setExpandedKeys(expandedFilteredKeys);
        });
    };

    const onCollapseAll = () => {
        if (Object.keys(expandedKeys).length === 0) {
            return;
        }
        setExpandedKeys({});
    };

    const treeNodeTemplate = useCallback(
        (node: TreeNode) => {
            const id = String((node.data as { id?: string | number })?.id || "");
            const label = String(node.label || "");

            if (!id) {
                return (
                    <div className="w-full border-b border-slate-100 py-0.5">
                        {label}
                    </div>
                );
            }

            return (
                <LangLink
                    lang={ctx.lang}
                    to={`/settings/geography/edit/${id}?view=tree`}
                >
                    {label}
                </LangLink>
            );
        },
        [ctx.lang],
    );
    const GeographicLevelsTable = () => (
        <>
            <div className="mb-4 mt-3 flex w-full flex-wrap justify-end gap-2">
                <Button
                    type="button"
                    outlined
                    icon="pi pi-download"
                    label={ctx.t({ code: "common.csv_export", msg: "CSV export" })}
                    onClick={() => navigate(ctx.url("/settings/geography/csv-export"))}
                    size="small"
                />
                <Button
                    type="button"
                    icon="pi pi-upload"
                    label={ctx.t({ code: "common.upload_csv", msg: "Upload CSV" })}
                    onClick={() => navigate(ctx.url("/settings/geography/upload"))}
                    size="small"
                />
            </div>
            {ld.pagination.totalItems > 0 ? (
                <>
                    <LanguageCheckboxes
                        langs={ld.langs}
                        selectedLangs={selectedLangs}
                        onChange={onLangChange}
                    />
                    <GeographyBreadcrumb ctx={ctx} rows={ld.breadcrumbs} />
                    <div className="w-full">
                        <DivisionsTable ctx={ctx} langs={selectedLangs} items={ld.items} />
                    </div>
                    <Paginator
                        first={(ld.pagination.page - 1) * ld.pagination.pageSize}
                        rows={ld.pagination.pageSize}
                        totalRecords={ld.pagination.totalItems}
                        rowsPerPageOptions={[10, 20, 30, 40, 50]}
                        onPageChange={(event) => {
                            const params = new URLSearchParams();
                            const page = Math.floor(event.first / event.rows) + 1;
                            params.set("page", String(page));
                            params.set("pageSize", String(event.rows));
                            params.set("view", "table");

                            const extraParams = ld.pagination.extraParams || {};
                            for (const [key, values] of Object.entries(extraParams)) {
                                for (const value of values) {
                                    params.append(key, value);
                                }
                            }

                            navigate(`?${params.toString()}`);
                        }}
                        className="mt-4 !justify-end"
                    />
                </>
            ) : (
                <p>
                    {ctx.t({
                        code: "geographies.no_admin_divisions_configured",
                        msg: "No administrative divisions configured. Please upload CSV with data.",
                    })}
                    <a href="/assets/division_sample.zip">
                        {ctx.t({ code: "geographies.see_example", msg: "See example" })}
                    </a>
                </p>
            )}
        </>
    );

    return (
        <MainContainer
            title={ctx.t({
                code: "geographies.geographic_levels",
                msg: "Geographic levels",
            })}
            headerExtra={navSettings}
        >
            <div className="w-full">
                <TabView
                    className="w-full"
                    activeIndex={activeTab}
                    onTabChange={(e) => {
                        const nextIndex = e.index;
                        setActiveTab(nextIndex);
                        const params = new URLSearchParams(location.search);
                        params.set("view", nextIndex === 1 ? "table" : "tree");
                        navigate(`?${params.toString()}`, { replace: true });
                    }}
                >
                    <TabPanel
                        header={ctx.t({ code: "common.tree_view", msg: "Tree view" })}
                    >
                        <div className="p-3 sm:p-6">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                    label={ctx.t({ code: "common.expand_all", msg: "Expand All" })}
                                    onClick={onExpandAll}
                                    disabled={isPending}
                                    outlined
                                    size="small"
                                    icon="pi pi-plus"
                                />
                                <Button
                                    label={ctx.t({ code: "common.collapse_all", msg: "Collapse All" })}
                                    onClick={onCollapseAll}
                                    size="small"
                                    outlined
                                    icon="pi pi-minus"
                                />
                                <InputText
                                    value={treeSearchTerm}
                                    onChange={(e) => setTreeSearchTerm(e.target.value)}
                                    placeholder={ctx.t({
                                        code: "common.search_placeholder_dotdotdot",
                                        msg: "Search...",
                                    })}
                                    size="small"
                                />
                            </div>
                            <VirtualScroller disabled className="w-full">
                                <div className="dts-tree-shell max-h-[32rem] overflow-auto rounded-md border border-slate-200 bg-white pr-2 shadow-sm">
                                    <Tree
                                        selectionMode="single"
                                        value={filteredNodes}
                                        className="w-full"
                                        nodeTemplate={treeNodeTemplate}
                                        expandedKeys={expandedKeys}
                                        onToggle={(e) => setExpandedKeys(e.value as TreeExpandedKeysType)}
                                    />
                                </div>
                            </VirtualScroller>
                        </div>
                    </TabPanel>
                    <TabPanel
                        header={ctx.t({ code: "common.table_view", msg: "Table view" })}
                    >
                        <div className="p-3 sm:p-6">
                            <GeographicLevelsTable />
                        </div>
                    </TabPanel>
                </TabView>
            </div>
        </MainContainer>
    );
}
