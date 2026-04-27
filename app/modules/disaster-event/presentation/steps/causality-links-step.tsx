import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type CausalityLinksStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    disasterOptions: Option[];
    hazardousOptions: Option[];
};

export default function CausalityLinksStep({
    state: _state,
    onChange: _onChange,
    disasterOptions: _disasterOptions,
    hazardousOptions: _hazardousOptions,
}: CausalityLinksStepProps) {
    return (
        <div className="grid gap-4 mt-2">
            <div className="mb-2">
                <h3 className="text-lg font-semibold text-slate-800">Linked events</h3>
                <p className="text-sm text-slate-600">
                    Define relationships between this event and other system records.
                </p>
            </div>

            <div className="mb-2">
                <h4 className="font-semibold text-slate-800">Linked hazardous events</h4>
                <p className="text-sm text-slate-600">
                    Link this disaster event to related hazardous events.
                </p>
            </div>

            <div className="mb-2">
                <h4 className="font-semibold text-slate-800">Linked disaster events</h4>
                <p className="text-sm text-slate-600">
                    Link this disaster event to its cause or its consequences.
                </p>
            </div>
        </div>
    );
}
