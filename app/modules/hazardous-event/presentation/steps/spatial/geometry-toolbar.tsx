import { Button } from "primereact/button";
import type { SpatialTool } from "./types";

type GeometryToolbarProps = {
    currentTool: SpatialTool;
    onToolChange: (tool: SpatialTool) => void;
    onDeleteSelected: () => void;
    disableDelete: boolean;
};

function toolButtonClass(isActive: boolean): string {
    return isActive ? "p-button-primary" : "p-button-outlined";
}

export default function GeometryToolbar({
    currentTool,
    onToolChange,
    onDeleteSelected,
    disableDelete,
}: GeometryToolbarProps) {
    return (
        <div className="grid grid-cols-1 gap-2">
            <Button
                type="button"
                label="Point"
                icon="pi pi-map-marker"
                className={toolButtonClass(currentTool === "point")}
                onClick={() => onToolChange("point")}
            />
            <Button
                type="button"
                label="Polygon"
                icon="pi pi-stop"
                className={toolButtonClass(currentTool === "polygon")}
                onClick={() => onToolChange("polygon")}
            />
            <Button
                type="button"
                label="Add Area"
                icon="pi pi-plus-circle"
                className={toolButtonClass(currentTool === "add-area")}
                onClick={() => onToolChange("add-area")}
            />
            <Button
                type="button"
                label="Edit"
                icon="pi pi-pencil"
                className={toolButtonClass(currentTool === "edit")}
                onClick={() => onToolChange("edit")}
            />
            <Button
                type="button"
                label="Delete"
                icon="pi pi-trash"
                severity="danger"
                outlined
                disabled={disableDelete}
                onClick={onDeleteSelected}
            />
        </div>
    );
}
