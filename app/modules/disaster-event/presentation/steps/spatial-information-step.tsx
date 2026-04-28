import { Dropdown } from "primereact/dropdown";

import OpenLayersGeographyEditor from "~/modules/disaster-event/presentation/openlayers-geography-editor";
import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type GeographyStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    divisions: Option[];
};

export default function GeographyStep({ state, onChange, divisions }: GeographyStepProps) {
    return (
        <div className="grid gap-3 mt-2">
            <label className="flex flex-col gap-1">
                <span>Geography Source</span>
                <Dropdown
                    value={state.geography.source}
                    onChange={(e) =>
                        onChange({
                            ...state,
                            geography: {
                                ...state.geography,
                                source: e.value,
                            },
                        })
                    }
                    options={[
                        { label: "Manual", value: "manual" },
                        { label: "Derived From Division", value: "derived_from_division" },
                    ]}
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>Division</span>
                <Dropdown
                    value={state.geography.divisionId || null}
                    onChange={(e) =>
                        onChange({
                            ...state,
                            geography: {
                                ...state.geography,
                                divisionId: e.value || "",
                            },
                        })
                    }
                    options={divisions}
                    filter
                    placeholder="Select division"
                />
            </label>

            <OpenLayersGeographyEditor
                valueGeoJson={state.geography.geomGeoJson}
                onChangeGeoJson={(geoJson) =>
                    onChange({
                        ...state,
                        geography: {
                            ...state.geography,
                            geomGeoJson: geoJson,
                        },
                    })
                }
            />
        </div>
    );
}
