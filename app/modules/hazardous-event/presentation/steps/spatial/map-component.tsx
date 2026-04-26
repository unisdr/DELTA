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
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import type { GeometryItem, GeometryType, SpatialTool } from "./types";

import "ol/ol.css";

type MapComponentProps = {
    geometries: GeometryItem[];
    selectedGeometryId: string | null;
    zoomToGeometryId?: string | null;
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

function getFallbackLabel(feature: Feature<OlGeometry>): string {
    const type = feature.get("geometryType") as GeometryType | undefined;
    const index = (feature.get("geomIndex") as number | undefined) ?? 0;
    return `${type ?? "GEOMETRY"} ${index + 1}`;
}

function getLabelForFeature(feature: Feature<OlGeometry>): string {
    const name = feature.get("name") as string | null | undefined;
    const label = name?.trim() ? name.trim() : getFallbackLabel(feature);
    return label.length > 30 ? `${label.slice(0, 27)}…` : label;
}

function makeFeatureStyle(
    feature: Feature<OlGeometry>,
    hoveredRef: { current: Feature<OlGeometry> | null },
): Style {
    const isPrimary = Boolean(feature.get("isPrimary"));
    const isSelected = Boolean(feature.get("isSelected"));
    const isHovered = feature === hoveredRef.current;
    const shouldLabel = isSelected || isHovered;

    const textStyle = shouldLabel
        ? new Text({
            text: getLabelForFeature(feature),
            offsetY: -16,
            font: "bold 12px sans-serif",
            fill: new Fill({ color: "#1e293b" }),
            backgroundFill: new Fill({ color: "rgba(255,255,255,0.88)" }),
            padding: [2, 5, 2, 5],
            placement: "point",
        })
        : undefined;

    if (isPrimary) {
        const sw = isSelected ? 4 : isHovered ? 3.5 : 3;
        return new Style({
            stroke: new Stroke({ color: "#dc2626", width: sw }),
            fill: new Fill({ color: isSelected ? "rgba(220,38,38,0.3)" : "rgba(220,38,38,0.18)" }),
            image: new CircleStyle({
                radius: isSelected ? 9 : isHovered ? 8 : 6,
                fill: new Fill({ color: "#dc2626" }),
                stroke: new Stroke({ color: "#ffffff", width: 2 }),
            }),
            text: textStyle,
        });
    }

    const color = isSelected ? "#0f766e" : "#1d4ed8";
    const sw = isSelected ? 4 : isHovered ? 3 : 2;
    const fillAlpha = isSelected ? 0.28 : isHovered ? 0.22 : 0.15;
    const fillRgb = isSelected ? "15,118,110" : "29,78,216";

    return new Style({
        stroke: new Stroke({ color, width: sw }),
        fill: new Fill({ color: `rgba(${fillRgb},${fillAlpha})` }),
        image: new CircleStyle({
            radius: isSelected ? 9 : isHovered ? 8 : 6,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
        }),
        text: textStyle,
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
    zoomToGeometryId,
    currentTool,
    onSelectGeometryId,
    onGeometryCreated,
    onGeometryUpdated,
}: MapComponentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const sourceRef = useRef<VectorSource<Feature<OlGeometry>> | null>(null);
    const vectorLayerRef = useRef<VectorLayer | null>(null);
    const drawRef = useRef<Draw | null>(null);
    const modifyRef = useRef<Modify | null>(null);
    const hoveredFeatureRef = useRef<Feature<OlGeometry> | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        const targetElement = containerRef.current;

        const source = new VectorSource<Feature<OlGeometry>>();
        sourceRef.current = source;

        const vectorLayer = new VectorLayer({
            source,
            style: (feature) =>
                makeFeatureStyle(feature as Feature<OlGeometry>, hoveredFeatureRef),
        });
        vectorLayerRef.current = vectorLayer;

        const map = new Map({
            target: targetElement,
            layers: [new TileLayer({ source: new OSM() }), vectorLayer],
            view: new View({
                center: fromLonLat([0, 10]),
                zoom: 2,
            }),
        });

        const handleResize = () => {
            map.updateSize();
        };
        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => {
                    handleResize();
                })
                : null;
        resizeObserver?.observe(targetElement);
        window.addEventListener("resize", handleResize);
        requestAnimationFrame(handleResize);

        map.on("pointermove", (event) => {
            const hit =
                (map.forEachFeatureAtPixel(
                    event.pixel,
                    (feature) => feature as Feature<OlGeometry>,
                    { hitTolerance: 6 },
                ) ?? null);
            if (hit !== hoveredFeatureRef.current) {
                hoveredFeatureRef.current = hit;
                vectorLayer.changed();
            }
            map.getTargetElement().style.cursor = hit ? "pointer" : "";
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
            window.removeEventListener("resize", handleResize);
            resizeObserver?.disconnect();
            map.setTarget(undefined);
            mapRef.current = null;
            sourceRef.current = null;
            vectorLayerRef.current = null;
            modifyRef.current = null;
            hoveredFeatureRef.current = null;
        };
    }, [onGeometryCreated, onGeometryUpdated, onSelectGeometryId]);

    useEffect(() => {
        const map = mapRef.current;
        const source = sourceRef.current;
        if (!map || !source) {
            return;
        }

        source.clear();

        geometries.forEach((item, index) => {
            if (!item.geojson) {
                return;
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
                return;
            }

            feature.set("geomId", item.id);
            feature.set("isPrimary", item.isPrimary);
            feature.set("isSelected", item.id === selectedGeometryId);
            feature.set("name", item.name ?? null);
            feature.set("geometryType", item.geometryType);
            feature.set("geomIndex", index);
            source.addFeature(feature);
        });

        if (source.getFeatures().length > 0) {
            fitMapToFeatures(map, source);
        }
    }, [geometries, selectedGeometryId]);

    useEffect(() => {
        const map = mapRef.current;
        const source = sourceRef.current;
        if (!map || !source || !zoomToGeometryId) {
            return;
        }
        const feature = source.getFeatures().find((f) => f.get("geomId") === zoomToGeometryId);
        if (!feature) {
            return;
        }
        const geom = feature.getGeometry();
        if (!geom) {
            return;
        }
        const extent = geom.getExtent();
        if (!extent || extent.some((v) => !Number.isFinite(v))) {
            return;
        }
        map.getView().fit(extent as Extent, {
            padding: [60, 60, 60, 60],
            maxZoom: 14,
            duration: 300,
        });
    }, [zoomToGeometryId]);

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
            className="h-[320px] w-full rounded-lg border border-slate-200 sm:h-[420px]"
        />
    );
}
