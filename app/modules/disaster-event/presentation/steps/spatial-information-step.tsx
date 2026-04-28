import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type SpatialInformationStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
};

export default function SpatialInformationStep(_: SpatialInformationStepProps) {
    return (
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Spatial Information step is temporarily disabled.
        </div>
    );
}
