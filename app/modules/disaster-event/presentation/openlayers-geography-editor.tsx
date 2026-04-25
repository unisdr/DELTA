import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import Draw from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import { OSM } from "ol/source";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import type { Extent } from "ol/extent";

import "ol/ol.css";

type OpenLayersGeographyEditorProps = {
    valueGeoJson: string;
    onChangeGeoJson: (geoJson: string) => void;
};

export default function OpenLayersGeographyEditor({
    valueGeoJson,
    onChangeGeoJson,
}: OpenLayersGeographyEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<VectorSource | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const source = new VectorSource();
        sourceRef.current = source;

        const vectorLayer = new VectorLayer({
            source,
            style: new Style({
                stroke: new Stroke({ color: "#0f766e", width: 2 }),
                fill: new Fill({ color: "rgba(15, 118, 110, 0.2)" }),
            }),
        });

        const map = new Map({
            target: containerRef.current,
            layers: [new TileLayer({ source: new OSM() }), vectorLayer],
            view: new View({
                center: fromLonLat([0, 10]),
                zoom: 2,
            }),
        });

        const draw = new Draw({ source, type: "Polygon" });
        const modify = new Modify({ source });
        map.addInteraction(draw);
        map.addInteraction(modify);

        const emitGeoJson = () => {
            const features = source.getFeatures();
            if (features.length === 0) {
                onChangeGeoJson("");
                return;
            }
            const geoJson = new GeoJSON().writeFeatures(features, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857",
            });
            onChangeGeoJson(geoJson);
        };

        draw.on("drawend", emitGeoJson);
        modify.on("modifyend", emitGeoJson);
        source.on("removefeature", emitGeoJson);

        if (valueGeoJson) {
            try {
                const existingFeatures = new GeoJSON().readFeatures(valueGeoJson, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                });
                source.addFeatures(existingFeatures);
                if (existingFeatures.length > 0) {
                    const geometry = existingFeatures[0]?.getGeometry();
                    if (geometry) {
                        const extent = geometry.getExtent() as Extent;
                        map.getView().fit(extent, {
                            padding: [20, 20, 20, 20],
                            maxZoom: 9,
                        });
                    }
                }
            } catch {
                // Keep editor usable if existing geojson is malformed.
            }
        }

        return () => {
            map.setTarget(undefined);
            sourceRef.current = null;
        };
    }, [onChangeGeoJson, valueGeoJson]);

    return (
        <div>
            <div
                ref={containerRef}
                style={{
                    height: "360px",
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                }}
            />
            <p className="text-sm text-gray-600 mt-2">
                Draw or adjust a polygon directly on the map. Only OpenLayers is used here.
            </p>
        </div>
    );
}
