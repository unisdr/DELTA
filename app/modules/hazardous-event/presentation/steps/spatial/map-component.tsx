import { useEffect, useRef } from "react";
import type { Geometry } from "geojson";
import type { Extent } from "ol/extent";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type OlGeometry from "ol/geom/Geometry";
import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import Select from "ol/interaction/Select";
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import { OSM } from "ol/source";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import type { GeometryItem, GeometryType, SpatialTool } from "./types";

import "ol/ol.css";

type MapComponentProps = {
    geometries: GeometryItem[];
    selectedGeometryId: string | null;
    currentTool: SpatialTool;
    onSelectGeometryId: (id: string | null) => void;
    onGeometryCreated: (geometry: Geometry, geometryType: GeometryType) => void;
    onGeometryUpdated: (
        id: string,
        geometry: Geometry,
        geometryType: GeometryType,
    ) => void;
};

const geoJsonFormat = new GeoJSON();

function inferGeometryType(geometry: Geometry): GeometryType | null {
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

function isPolygonLike(type: GeometryType): boolean {
    return type === "POLYGON" || type === "MULTIPOLYGON";
}

function createStyle(isPrimary: boolean, isSelected: boolean): Style {
    if (isPrimary) {
        return new Style({
            stroke: new Stroke({ color: "#dc2626", width: isSelected ? 4 : 3 }),
            fill: new Fill({ color: "rgba(220, 38, 38, 0.2)" }),
            image: new CircleStyle({
                radius: isSelected ? 8 : 6,
                fill: new Fill({ color: "#dc2626" }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
            }),
        });
    }

    return new Style({
        stroke: new Stroke({ color: isSelected ? "#0f766e" : "#1d4ed8", width: isSelected ? 4 : 2 }),
        fill: new Fill({ color: isSelected ? "rgba(15, 118, 110, 0.25)" : "rgba(29, 78, 216, 0.18)" }),
        image: new CircleStyle({
            radius: isSelected ? 8 : 6,
            fill: new Fill({ color: isSelected ? "#0f766e" : "#1d4ed8" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
        }),
    });
}

function fitMapToFeatures(map: Map, source: VectorSource, maxZoom = 14): void {
    const extent = source.getExtent();
    if (!extent || extent.some((value) => !Number.isFinite(value))) {
        return;
    }

    const [minX, minY, maxX, maxY] = extent;
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
        return;
    }

    map.getView().fit(extent as Extent, {
        padding: [24, 24, 24, 24],
        maxZoom,
        duration: 220,
    });
}

export default function MapComponent({
    geometries,
    selectedGeometryId,
    currentTool,
    onSelectGeometryId,
    onGeometryCreated,
    onGeometryUpdated,
}: MapComponentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const sourceRef = useRef<VectorSource<Feature<OlGeometry>> | null>(null);
    const drawRef = useRef<Draw | null>(null);
    const modifyRef = useRef<Modify | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const source = new VectorSource<Feature<OlGeometry>>();
        sourceRef.current = source;

        const vectorLayer = new VectorLayer({
            source,
            style: (feature) => {
                const isPrimary = Boolean(feature.get("isPrimary"));
                const isSelected = Boolean(feature.get("isSelected"));
                return createStyle(isPrimary, isSelected);
            },
        });

        const map = new Map({
            target: containerRef.current,
            layers: [new TileLayer({ source: new OSM() }), vectorLayer],
            view: new View({
                center: fromLonLat([0, 10]),
                zoom: 2,
            }),
        });

        const select = new Select({
            layers: [vectorLayer],
            hitTolerance: 6,
        });
        select.on("select", (event) => {
            const selected = event.selected?.[0];
            const selectedId = selected?.get("geomId");
            onSelectGeometryId(typeof selectedId === "string" ? selectedId : null);
        });
        map.addInteraction(select);

        const modify = new Modify({ source });
        modify.setActive(false);
        modify.on("modifyend", (event) => {
            event.features.forEach((feature) => {
                const id = feature.get("geomId");
                if (typeof id !== "string") {
                    return;
                }
                const geometry = feature.getGeometry();
                if (!geometry) {
                    return;
                }
                const geojsonGeometry = geoJsonFormat.writeGeometryObject(geometry, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                }) as Geometry;
                const geometryType = inferGeometryType(geojsonGeometry);
                if (!geometryType) {
                    return;
                }
                onGeometryUpdated(id, geojsonGeometry, geometryType);
            });
        });
        map.addInteraction(modify);
        modifyRef.current = modify;

        mapRef.current = map;

        return () => {
            if (drawRef.current) {
                map.removeInteraction(drawRef.current);
                drawRef.current = null;
            }
            map.setTarget(undefined);
            mapRef.current = null;
            sourceRef.current = null;
            modifyRef.current = null;
        };
    }, [onGeometryCreated, onGeometryUpdated, onSelectGeometryId]);

    useEffect(() => {
        const map = mapRef.current;
        const source = sourceRef.current;
        if (!map || !source) {
            return;
        }

        source.clear();

        for (const item of geometries) {
            if (!item.geojson) {
                continue;
            }

            const features = geoJsonFormat.readFeatures(
                { type: "Feature", geometry: item.geojson, properties: {} },
                {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                },
            );
            const feature = features[0];
            if (!feature) {
                continue;
            }

            feature.set("geomId", item.id);
            feature.set("isPrimary", item.isPrimary);
            feature.set("isSelected", item.id === selectedGeometryId);
            source.addFeature(feature);
        }

        if (source.getFeatures().length > 0) {
            fitMapToFeatures(map, source);
        }
    }, [geometries, selectedGeometryId]);

    useEffect(() => {
        const map = mapRef.current;
        const source = sourceRef.current;
        if (!map || !source) {
            return;
        }

        if (modifyRef.current) {
            modifyRef.current.setActive(currentTool === "edit");
        }

        if (drawRef.current) {
            map.removeInteraction(drawRef.current);
            drawRef.current = null;
        }

        const drawType =
            currentTool === "point"
                ? "Point"
                : currentTool === "polygon" || currentTool === "add-area"
                    ? "Polygon"
                    : null;

        if (!drawType) {
            return;
        }

        const draw = new Draw({
            source,
            type: drawType,
        });
        draw.on("drawend", (event) => {
            const geometry = event.feature.getGeometry();
            if (!geometry) {
                return;
            }

            const geojsonGeometry = geoJsonFormat.writeGeometryObject(geometry, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857",
            }) as Geometry;

            const geometryType = inferGeometryType(geojsonGeometry);
            if (!geometryType) {
                source.removeFeature(event.feature);
                return;
            }

            if (currentTool === "add-area" && !isPolygonLike(geometryType)) {
                source.removeFeature(event.feature);
                return;
            }

            onGeometryCreated(geojsonGeometry, geometryType);
            source.removeFeature(event.feature);
        });
        map.addInteraction(draw);
        drawRef.current = draw;

        return () => {
            if (drawRef.current) {
                map.removeInteraction(drawRef.current);
                drawRef.current = null;
            }
        };
    }, [currentTool, onGeometryCreated]);

    return (
        <div
            ref={containerRef}
            className="h-[420px] w-full rounded-lg border border-slate-200"
        />
    );
}
