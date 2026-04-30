import { Outlet, useLoaderData, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import { MainContainer } from "~/frontend/container";
import { FictitiousCountryService } from "~/services/fictitiousCountryService";
import { NavSettings } from "~/frontend/components/NavSettings";
import { authLoaderWithPerm } from "~/utils/auth";
import { ViewContext } from "~/frontend/context";

type LoaderData = {
    items: Array<{ id: string; name: string; type: string }>;
};

export const loader = authLoaderWithPerm(
    "ViewFictitiousCountries",
    async () => {
        const items = await FictitiousCountryService.getAllFictionalOrderByName();

        return { items } satisfies LoaderData;
    },
);

export default function FictitiousCountryManagementLayout() {
    const ld = useLoaderData<typeof loader>();
    const ctx = new ViewContext();
    const navigate = useNavigate();

    return (
        <MainContainer
            title={ctx.t({
                code: "admin.fictitious_country_management",
                msg: "Fictitious Country Management",
            })}
            headerExtra={<NavSettings ctx={ctx} />}
        >
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
                        header=""
                        body={(row: { id: string; name: string }) => {
                            return (
                                <div className="flex w-full justify-end gap-2">
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
                                        onClick={() =>
                                            navigate(
                                                ctx.url(`/admin/fictitious-country-mgmt/delete/${row.id}`),
                                            )
                                        }
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
