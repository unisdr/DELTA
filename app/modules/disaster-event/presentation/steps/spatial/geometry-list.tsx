import { Button } from "primereact/button";
import { ListBox, type ListBoxChangeEvent } from "primereact/listbox";
import { Tag } from "primereact/tag";
import type { GeometryItem } from "./types";

type GeometryListProps = {
    geometries: GeometryItem[];
    selectedGeometryId: string | null;
    onSelectGeometryId: (id: string | null) => void;
    onSetPrimary: (id: string) => void;
    onDeleteGeometry: (id: string) => void;
};

function geometryLabel(item: GeometryItem, index: number): string {
    if (item.name?.trim()) {
        return item.name.trim();
    }
    return `${item.geometryType} ${index + 1}`;
}

export default function GeometryList({
    geometries,
    selectedGeometryId,
    onSelectGeometryId,
    onSetPrimary,
    onDeleteGeometry,
}: GeometryListProps) {
    const selectedItem =
        geometries.find((geometry) => geometry.id === selectedGeometryId) || null;

    return (
        <div className="grid gap-3">
            <div>
                <h3 className="text-sm font-semibold text-slate-800">Geometry List</h3>
                <p className="text-xs text-slate-500">Select a geometry to edit or set as primary.</p>
            </div>

            <ListBox
                value={selectedGeometryId}
                onChange={(event: ListBoxChangeEvent) =>
                    onSelectGeometryId((event.value as string | null) || null)
                }
                options={geometries.map((item, index) => ({
                    value: item.id,
                    item,
                    index,
                }))}
                optionLabel="value"
                className="w-full"
                emptyMessage="No geometries added yet"
                itemTemplate={(option: { item: GeometryItem; index: number }) => {
                    const item = option.item;
                    return (
                        <div className="flex w-full items-center justify-between gap-2 py-1">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">
                                    {geometryLabel(item, option.index)}
                                </p>
                                <p className="text-xs text-slate-500">{item.geometryType}</p>
                            </div>
                            {item.isPrimary ? <Tag value="Primary" severity="success" /> : null}
                        </div>
                    );
                }}
            />

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    label="Set as Primary"
                    icon="pi pi-star"
                    size="small"
                    disabled={!selectedItem || selectedItem.isPrimary}
                    onClick={() => {
                        if (selectedItem) {
                            onSetPrimary(selectedItem.id);
                        }
                    }}
                />
                <Button
                    type="button"
                    label="Delete"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    outlined
                    disabled={!selectedItem}
                    onClick={() => {
                        if (selectedItem) {
                            onDeleteGeometry(selectedItem.id);
                        }
                    }}
                />
            </div>
        </div>
    );
}
