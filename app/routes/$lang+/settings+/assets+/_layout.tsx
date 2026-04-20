import { Outlet, Form, useLoaderData, useLocation, useNavigate } from "react-router";
import { useCallback } from "react";
import { authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { BackendContext } from "~/backend.server/context";
import { AssetRepository } from "~/db/queries/assetRepository";
import { NavSettings } from "~/frontend/components/NavSettings";
import { MainContainer } from "~/frontend/container";
import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/utils/link";

import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Paginator } from "primereact/paginator";
import { Tag } from "primereact/tag";

type LoaderItem = {
    id: string;
    name: string;
    nationalId: string | null;
    sectorIds: string;
    sectorData: { id: string; name: string }[] | null;
    isBuiltIn: boolean;
    customName: string | null;
    customCategory: string | null;
    customNotes: string | null;
};

export const loader = authLoaderWithPerm("ViewData", async (args) => {
    const { request } = args;
    const countryAccountsId = await getCountryAccountsIdFromSession(request);
    const ctx = new BackendContext(args);

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim();
    const builtInParam = url.searchParams.get("builtIn");
    const builtIn =
        builtInParam === "true"
            ? true
            : builtInParam === "false"
                ? false
                : undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
        1,
        parseInt(url.searchParams.get("pageSize") || "10", 10),
    );

    const { items, total } = await AssetRepository.list(
        ctx.lang,
        countryAccountsId,
        { search, builtIn },
        page,
        pageSize,
    );

    return {
        items: items as LoaderItem[],
        total,
        page,
        pageSize,
        search,
        builtIn: builtIn ?? null,
    };
});

export default function AssetsLayoutPage() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const navigate = useNavigate();
    const location = useLocation();

    const buildUrl = useCallback(
        (overrides: Record<string, string | number | null>) => {
            const params = new URLSearchParams(location.search);
            for (const [k, v] of Object.entries(overrides)) {
                if (v === null || v === "") params.delete(k);
                else params.set(k, String(v));
            }
            return `${location.pathname}?${params.toString()}`;
        },
        [location],
    );

    const nameBody = (item: LoaderItem) => <span>{item.name}</span>;

    const sectorBody = (item: LoaderItem) =>
        item.sectorData?.map((s) => s.name).join(", ") || "—";

    const builtInBody = (item: LoaderItem) => (
        <Tag
            value={
                item.isBuiltIn
                    ? ctx.t({ code: "assets.built_in", msg: "Built-in" })
                    : ctx.t({ code: "assets.custom", msg: "Custom" })
            }
            severity={item.isBuiltIn ? "info" : "success"}
        />
    );

    const actionsBody = (item: LoaderItem) => (
        <div className="flex gap-1">
            <LangLink lang={ctx.lang} to={`/settings/assets/${item.id}`}>
                <Button
                    icon="pi pi-eye"
                    text
                    size="small"
                    aria-label={ctx.t({ code: "common.view", msg: "View" })}
                />
            </LangLink>
            {!item.isBuiltIn && (
                <>
                    <LangLink lang={ctx.lang} to={`/settings/assets/edit/${item.id}`}>
                        <Button
                            icon="pi pi-pencil"
                            text
                            size="small"
                            aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
                        />
                    </LangLink>
                    <LangLink lang={ctx.lang} to={`/settings/assets/delete/${item.id}`}>
                        <Button
                            icon="pi pi-trash"
                            text
                            size="small"
                            severity="danger"
                            aria-label={ctx.t({ code: "common.delete", msg: "Delete" })}
                        />
                    </LangLink>
                </>
            )}
        </div>
    );

    return (
        <>
            <MainContainer
                title={ctx.t({ code: "assets", msg: "Assets" })}
                headerExtra={<NavSettings ctx={ctx} userRole={ctx.user?.role} />}
            >
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Form method="get" className="flex items-center gap-2 flex-wrap grow">
                        <InputText
                            name="search"
                            defaultValue={ld.search}
                            placeholder={ctx.t({ code: "common.search", msg: "Search…" })}
                            className="w-64"
                        />
                        <select
                            name="builtIn"
                            defaultValue={ld.builtIn === null ? "" : String(ld.builtIn)}
                            className="p-inputtext"
                        >
                            <option value="">
                                {ctx.t({ code: "common.all", msg: "All" })}
                            </option>
                            <option value="false">
                                {ctx.t({ code: "assets.custom", msg: "Custom" })}
                            </option>
                            <option value="true">
                                {ctx.t({ code: "assets.built_in", msg: "Built-in" })}
                            </option>
                        </select>
                        <Button
                            type="submit"
                            icon="pi pi-search"
                            label={ctx.t({ code: "common.search", msg: "Search" })}
                            size="small"
                        />
                        {(ld.search || ld.builtIn !== null) && (
                            <Button
                                type="button"
                                icon="pi pi-times"
                                label={ctx.t({ code: "common.clear", msg: "Clear" })}
                                size="small"
                                text
                                onClick={() => navigate(location.pathname)}
                            />
                        )}
                    </Form>
                    <div className="flex gap-2 ml-auto">
                        <LangLink lang={ctx.lang} to="/settings/assets/csv-import">
                            <Button
                                icon="pi pi-upload"
                                label={ctx.t({ code: "common.import_csv", msg: "Import CSV" })}
                                size="small"
                                outlined
                            />
                        </LangLink>
                        <LangLink lang={ctx.lang} to="/settings/assets/csv-export">
                            <Button
                                icon="pi pi-download"
                                label={ctx.t({ code: "common.export_csv", msg: "Export CSV" })}
                                size="small"
                                outlined
                            />
                        </LangLink>
                        <LangLink lang={ctx.lang} to="/settings/assets/new">
                            <Button
                                icon="pi pi-plus"
                                label={ctx.t({ code: "assets.add_new", msg: "Add new asset" })}
                                size="small"
                            />
                        </LangLink>
                    </div>
                </div>

                <DataTable
                    value={ld.items}
                    emptyMessage={ctx.t({
                        code: "common.no_results",
                        msg: "No results found",
                    })}
                >
                    <Column
                        field="name"
                        header={ctx.t({ code: "common.name", msg: "Name" })}
                        body={nameBody}
                    />
                    <Column
                        header={ctx.t({ code: "common.sectors", msg: "Sector(s)" })}
                        body={sectorBody}
                    />
                    <Column
                        header={ctx.t({ code: "assets.is_custom", msg: "Is custom" })}
                        body={builtInBody}
                        style={{ width: "8rem" }}
                    />
                    <Column
                        header={ctx.t({ code: "common.actions", msg: "Actions" })}
                        body={actionsBody}
                        style={{ width: "9rem" }}
                    />
                </DataTable>

                {ld.total > ld.pageSize && (
                    <Paginator
                        first={(ld.page - 1) * ld.pageSize}
                        rows={ld.pageSize}
                        totalRecords={ld.total}
                        rowsPerPageOptions={[10, 25, 50]}
                        onPageChange={(e) =>
                            navigate(
                                buildUrl({
                                    page: e.page + 1,
                                    pageSize: e.rows,
                                }),
                            )
                        }
                        className="mt-2 ml-auto w-fit"
                    />
                )}
            </MainContainer>
            <Outlet />
        </>
    );
}
