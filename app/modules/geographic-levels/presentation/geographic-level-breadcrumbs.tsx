import { useMemo } from "react";
import { useNavigate } from "react-router";
import { BreadCrumb } from "primereact/breadcrumb";
import type { MenuItem } from "primereact/menuitem";

import type { DivisionBreadcrumbRow } from "~/backend.server/models/division";

interface GeographicLevelBreadcrumbsProps {
    rows: DivisionBreadcrumbRow[] | null;
    linkLast?: boolean;
}

export default function GeographicLevelBreadcrumbs({
    rows,
    linkLast = false,
}: GeographicLevelBreadcrumbsProps) {
    const navigate = useNavigate();

    const model = useMemo<MenuItem[]>(() => {
        if (!rows?.length) {
            return [];
        }

        return rows.map((row, index) => ({
            label: row.name,
            command:
                index < rows.length - 1 || linkLast
                    ? () => navigate(`/settings/geography?parent=${row.id}`)
                    : undefined,
            disabled: !(index < rows.length - 1 || linkLast),
        }));
    }, [linkLast, navigate, rows]);

    return (
        <BreadCrumb
            home={{
                label: "Root",
                icon: "pi pi-home",
                command: () => navigate("/settings/geography"),
            }}
            model={model}
            className="border-none bg-transparent px-0 py-0"
        />
    );
}
