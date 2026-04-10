import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";

import DTSMap from "~/frontend/dtsmap/dtsmap";
import type { DivisionBreadcrumbRow } from "~/backend.server/models/division";
import type { GeographicLevelDetail as GeographicLevelDetailEntity } from "~/modules/geographic-levels/domain/entities/geographic-level";
import GeographicLevelBreadcrumbs from "~/modules/geographic-levels/presentation/geographic-level-breadcrumbs";

interface GeographicLevelDetailProps {
    division: GeographicLevelDetailEntity;
    breadcrumbs: DivisionBreadcrumbRow[] | null;
}

export default function GeographicLevelDetail({
    division,
    breadcrumbs,
}: GeographicLevelDetailProps) {
    const navigate = useNavigate();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const nameRows = Object.entries(division.name || {}).map(([lang, name]) => ({
        lang: lang.toUpperCase(),
        name: name || "N/A",
    }));

    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-3">
                    <GeographicLevelBreadcrumbs rows={breadcrumbs} linkLast />
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Division details</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Review the division metadata and map geometry.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        type="button"
                        label="Edit"
                        icon="pi pi-pencil"
                        onClick={() => navigate(`/settings/geography/${division.id}/edit`)}
                    />
                    <Button
                        type="button"
                        label="Back to list"
                        icon="pi pi-arrow-left"
                        severity="secondary"
                        outlined
                        onClick={() => navigate("/settings/geography")}
                    />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ID</p>
                            <p className="mt-1 text-sm text-slate-900">{division.id}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent ID</p>
                            <p className="mt-1 text-sm text-slate-900">{division.parentId || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">National ID</p>
                            <p className="mt-1 text-sm text-slate-900">{division.nationalId || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Level</p>
                            <p className="mt-1 text-sm text-slate-900">{division.level ?? "-"}</p>
                        </div>
                    </div>
                </Card>

                <Card className="shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold text-slate-900">Localized names</h3>
                    <DataTable
                        value={nameRows}
                        size="small"
                        tableClassName="min-w-full"
                        emptyMessage="No localized names"
                    >
                        <Column field="lang" header="Language" />
                        <Column field="name" header="Name" />
                    </DataTable>
                </Card>
            </div>

            <Card className="shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Map</h3>
                {isClient ? (
                    division.geojson ? (
                        <DTSMap geoData={division.geojson} />
                    ) : (
                        <Message severity="info" text="No geodata for this division" />
                    )
                ) : null}
            </Card>
        </div>
    );
}
