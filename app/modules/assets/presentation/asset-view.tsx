import { FieldsView, ViewComponent } from "~/frontend/form";
import type { Asset } from "~/modules/assets/domain/entities/asset";
import type { AssetSectorDisplay } from "~/modules/assets/domain/repositories/asset-repository";
import { ASSETS_ROUTE } from "~/modules/assets/presentation/asset-form";

const assetViewFieldsDef = [
    { key: "name" as const, label: "Name", type: "text" as const },
    { key: "category" as const, label: "Category", type: "text" as const },
    { key: "nationalId" as const, label: "National ID", type: "text" as const },
    { key: "notes" as const, label: "Notes", type: "textarea" as const },
    { key: "sectorIds" as const, label: "Sector", type: "other" as const },
];

interface AssetViewProps {
    item: Asset;
    sectorDisplay?: AssetSectorDisplay[];
}

export function AssetView({ item, sectorDisplay }: AssetViewProps) {
    const sectorNames =
        sectorDisplay?.map((s) => s.name).join(", ") || "N/A";

    return (
        <ViewComponent
            isPublic={item.isBuiltIn === true}
            path={ASSETS_ROUTE}
            id={item.id}
            title={"Assets"}
        >
            <FieldsView
                def={assetViewFieldsDef}
                fields={item as any}
                override={{
                    sectorIds: (
                        <p>
                            {"Sector"}: {sectorNames}
                        </p>
                    ),
                }}
            />
            {item.isBuiltIn === true && (
                <p className="mg-u-color--muted mg-u-margin-top--sm">
                    {"This is a built-in asset and cannot be edited or deleted."}
                </p>
            )}
        </ViewComponent>
    );
}
