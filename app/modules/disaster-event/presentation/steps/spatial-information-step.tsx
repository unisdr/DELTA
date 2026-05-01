import { useState } from "react";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { InputText } from "primereact/inputtext";
import type { Geometry, MultiPolygon, Polygon } from "geojson";
import GeometryList from "./spatial/geometry-list";
import GeometryToolbar from "./spatial/geometry-toolbar";
import MapComponent from "./spatial/map-component";
import type { GeometryItem, GeometryType, SpatialTool } from "./spatial/types";

type SpatialInformationStepProps = {
    geometries: GeometryItem[];
    selectedGeometryId: string | null;
    currentTool: SpatialTool;
    onGeometriesChange: (geometries: GeometryItem[]) => void;
    onSelectedGeometryIdChange: (id: string | null) => void;
    onCurrentToolChange: (tool: SpatialTool) => void;
};

function makeId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `geom-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function instructionForTool(tool: SpatialTool): string {
    if (tool === "point") {
        return "Click on map to add location.";
    }
    if (tool === "polygon") {
        return "Click to start drawing, double-click to finish polygon.";
    }
    if (tool === "add-area") {
        return "Draw another polygon area to merge into a MULTIPOLYGON.";
    }
    if (tool === "edit") {
        return "Select a geometry and drag vertices to edit.";
    }
    return "Select a tool to begin mapping.";
}

function mergePolygonIntoMulti(
    target: GeometryItem,
    newPolygon: Polygon,
): GeometryItem {
    if (target.geometryType === "POLYGON" && target.geojson.type === "Polygon") {
        const merged: MultiPolygon = {
            type: "MultiPolygon",
            coordinates: [target.geojson.coordinates, newPolygon.coordinates],
        };
        return {
            ...target,
            geojson: merged,
            geometryType: "MULTIPOLYGON",
        };
    }

    if (
        target.geometryType === "MULTIPOLYGON" &&
        target.geojson.type === "MultiPolygon"
    ) {
        const merged: MultiPolygon = {
            type: "MultiPolygon",
            coordinates: [...target.geojson.coordinates, newPolygon.coordinates],
        };
        return {
            ...target,
            geojson: merged,
            geometryType: "MULTIPOLYGON",
        };
    }

    return target;
}

function fallbackGeometryType(geometry: Geometry): GeometryType | null {
    switch (geometry.type) {
        case "Point":
            return "POINT";
        case "LineString":
            return "LINESTRING";
        case "Polygon":
            return "POLYGON";
        case "MultiPolygon":
            return "MULTIPOLYGON";
        default:
            return null;
    }
}

export default function SpatialInformationStep({
    geometries,
    selectedGeometryId,
    currentTool,
    onGeometriesChange,
    onSelectedGeometryIdChange,
    onCurrentToolChange,
}: SpatialInformationStepProps) {
    const [zoomToGeometryId, setZoomToGeometryId] = useState<string | null>(null);
    const selectedGeometry = geometries.find((item) => item.id === selectedGeometryId) || null;

    const handleListSelect = (id: string | null) => {
        onSelectedGeometryIdChange(id);
        if (id) {
            setZoomToGeometryId(id);
        }
    };

    const handleDeleteById = (id: string) => {
        const toDelete = geometries.find((item) => item.id === id);
        if (!toDelete) {
            return;
        }

        confirmDialog({
            message: "Are you sure you want to delete this geometry?",
            header: "Confirm Delete",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => {
                const next = geometries.filter((item) => item.id !== id);
                if (!next.some((item) => item.isPrimary) && next.length > 0) {
                    next[0] = { ...next[0], isPrimary: true };
                }
                onGeometriesChange(next);
                onSelectedGeometryIdChange(next[0]?.id || null);
            },
        });
    };

    const handleGeometryCreated = (geometry: Geometry, geometryType: GeometryType) => {
        if (currentTool === "add-area") {
            if (geometry.type !== "Polygon") {
                return;
            }

            const preferredTargetId = geometries.find(
                (item) =>
                    item.id === selectedGeometryId &&
                    (item.geometryType === "POLYGON" || item.geometryType === "MULTIPOLYGON"),
            )?.id;

            const fallbackTargetId = geometries.find(
                (item) => item.geometryType === "POLYGON" || item.geometryType === "MULTIPOLYGON",
            )?.id;

            const targetId = preferredTargetId || fallbackTargetId;
            if (targetId) {
                const next = geometries.map((item) =>
                    item.id === targetId
                        ? mergePolygonIntoMulti(item, geometry)
                        : item,
                );
                onGeometriesChange(next);
                onSelectedGeometryIdChange(targetId);
                return;
            }

            const item: GeometryItem = {
                id: makeId(),
                geojson: {
                    type: "MultiPolygon",
                    coordinates: [geometry.coordinates],
                },
                geometryType: "MULTIPOLYGON",
                isPrimary: geometries.length === 0,
            };
            const next = [...geometries, item];
            onGeometriesChange(next);
            onSelectedGeometryIdChange(item.id);
            return;
        }

        const derivedType = fallbackGeometryType(geometry);
        if (!derivedType || (derivedType !== "POINT" && derivedType !== "POLYGON")) {
            return;
        }

        const item: GeometryItem = {
            id: makeId(),
            geojson: geometry,
            geometryType,
            isPrimary: geometries.length === 0,
        };

        const next = [...geometries, item];
        onGeometriesChange(next);
        onSelectedGeometryIdChange(item.id);
    };

    const handleGeometryUpdated = (
        id: string,
        geometry: Geometry,
        geometryType: GeometryType,
    ) => {
        onGeometriesChange(
            geometries.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        geojson: geometry,
                        geometryType,
                    }
                    : item,
            ),
        );
    };

    const handleSetPrimary = (id: string) => {
        onGeometriesChange(
            geometries.map((item) => ({
                ...item,
                isPrimary: item.id === id,
            })),
        );
    };

    return (
        <div className="flex w-full flex-col rounded-lg border border-slate-200 bg-white md:min-h-[460px] md:flex-row md:overflow-hidden">
            <ConfirmDialog />
            <div className="w-full border-b border-slate-200 p-4 md:w-80 md:border-b-0 md:border-r">
                <h2 className="text-base font-semibold text-slate-800">Spatial Information</h2>
                <p className="mt-1 text-xs text-slate-500">{instructionForTool(currentTool)}</p>

                <div className="mt-4">
                    <GeometryToolbar
                        currentTool={currentTool}
                        onToolChange={onCurrentToolChange}
                        onDeleteSelected={() => {
                            if (selectedGeometryId) {
                                handleDeleteById(selectedGeometryId);
                            }
                        }}
                        disableDelete={!selectedGeometryId}
                    />
                </div>

                <div className="mt-4">
                    <GeometryList
                        geometries={geometries}
                        selectedGeometryId={selectedGeometryId}
                        onSelectGeometryId={handleListSelect}
                        onSetPrimary={handleSetPrimary}
                        onDeleteGeometry={handleDeleteById}
                    />
                </div>

                {selectedGeometry ? (
                    <div className="mt-4 grid gap-2">
                        <label className="text-xs font-medium text-slate-600" htmlFor="selected-geometry-name">
                            Name (optional)
                        </label>
                        <InputText
                            id="selected-geometry-name"
                            value={selectedGeometry.name || ""}
                            onChange={(event) => {
                                onGeometriesChange(
                                    geometries.map((item) =>
                                        item.id === selectedGeometry.id
                                            ? { ...item, name: event.target.value }
                                            : item,
                                    ),
                                );
                            }}
                            placeholder="Primary location"
                        />
                    </div>
                ) : null}
            </div>

            <div className="w-full p-4 md:flex md:flex-1 md:min-h-0">
                <MapComponent
                    geometries={geometries}
                    selectedGeometryId={selectedGeometryId}
                    zoomToGeometryId={zoomToGeometryId}
                    currentTool={currentTool}
                    onSelectGeometryId={onSelectedGeometryIdChange}
                    onGeometryCreated={handleGeometryCreated}
                    onGeometryUpdated={handleGeometryUpdated}
                />
            </div>
        </div>
    );
}
