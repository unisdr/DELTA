import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";

import type {
    CoreEventStepState,
    DisasterEventStepState,
} from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type CoreEventStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    hipTypes: Option[];
    hipClusters: Option[];
    hipHazards: Option[];
};

function patchCore(
    state: DisasterEventStepState,
    onChange: (next: DisasterEventStepState) => void,
    patch: Partial<CoreEventStepState>,
) {
    onChange({
        ...state,
        coreEvent: {
            ...state.coreEvent,
            ...patch,
        },
    });
}

export default function CoreEventStep({
    state,
    onChange,
    hipTypes,
    hipClusters,
    hipHazards,
}: CoreEventStepProps) {
    return (
        <div className="grid gap-3 mt-2">
            <label className="flex flex-col gap-1">
                <span>National Disaster ID</span>
                <InputText
                    value={state.coreEvent.nationalDisasterId}
                    onChange={(e) =>
                        patchCore(state, onChange, { nationalDisasterId: e.target.value })
                    }
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>National Name</span>
                <InputText
                    value={state.coreEvent.nameNational}
                    onChange={(e) =>
                        patchCore(state, onChange, { nameNational: e.target.value })
                    }
                />
            </label>

            <label className="flex flex-col gap-1">
                <span>Recording Institution</span>
                <InputText
                    value={state.coreEvent.recordingInstitution}
                    onChange={(e) =>
                        patchCore(state, onChange, { recordingInstitution: e.target.value })
                    }
                />
            </label>

            <div className="grid md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                    <span>Start Date</span>
                    <InputText
                        type="date"
                        value={state.coreEvent.startDate}
                        onChange={(e) =>
                            patchCore(state, onChange, { startDate: e.target.value })
                        }
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span>End Date</span>
                    <InputText
                        type="date"
                        value={state.coreEvent.endDate}
                        onChange={(e) =>
                            patchCore(state, onChange, { endDate: e.target.value })
                        }
                    />
                </label>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                    <span>HIP Type</span>
                    <Dropdown
                        options={hipTypes}
                        value={state.coreEvent.hipTypeId || null}
                        onChange={(e) => patchCore(state, onChange, { hipTypeId: e.value || "" })}
                        placeholder="Select type"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span>HIP Cluster</span>
                    <Dropdown
                        options={hipClusters}
                        value={state.coreEvent.hipClusterId || null}
                        onChange={(e) =>
                            patchCore(state, onChange, { hipClusterId: e.value || "" })
                        }
                        placeholder="Select cluster"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span>HIP Hazard</span>
                    <Dropdown
                        options={hipHazards}
                        value={state.coreEvent.hipHazardId || null}
                        onChange={(e) =>
                            patchCore(state, onChange, { hipHazardId: e.value || "" })
                        }
                        placeholder="Select hazard"
                    />
                </label>
            </div>
        </div>
    );
}
