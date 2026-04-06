import { Outlet, useLoaderData, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import { MainContainer } from "~/frontend/container";
import { FictitiousCountryService } from "~/services/fictitiousCountryService";
import { NavSettings } from "../../settings/nav";
import { authLoaderWithPerm } from "~/utils/auth";


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

    const navigate = useNavigate();

    return (
        <MainContainer
            title={"Fictitious Country Management"}
            headerExtra={<NavSettings />}
        >
            <div className="dts-page-intro" style={{ paddingRight: 0 }}>
                <div className="dts-additional-actions">
                    <Button
                        label={"Add fictitious country"}
                        icon="pi pi-plus"
                        onClick={() => navigate("/admin/fictitious-country-mgmt/new")}
                    />
                </div>
            </div>

            <div className="w-full overflow-x-auto [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-full">
                <DataTable
                    value={ld.items}
                    dataKey="id"
                    className="w-full"
                    tableClassName="!table w-full min-w-full border-collapse"
                    emptyMessage={"No data found"}
                >
                    <Column
                        field="name"
                        header={"Name"}
                    />
                    <Column
                        header={"Actions"}
                        body={(row: { id: string; name: string }) => {
                            return (
                                <div className="flex gap-2">
                                    <Button
                                        text
                                        severity="secondary"
                                        onClick={() =>
                                            navigate(
                                                `/admin/fictitious-country-mgmt/edit/${row.id}`,
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
                                                `/admin/fictitious-country-mgmt/delete/${row.id}`,
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
