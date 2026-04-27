import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type RADStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    responseTypes: Option[];
    assessmentTypes: Option[];
};

export default function ResponsesAssessmentsDeclarationsStep({
    state: _state,
    onChange: _onChange,
    responseTypes: _responseTypes,
    assessmentTypes: _assessmentTypes,
}: RADStepProps) {
    return (
        <div className="grid gap-4 pb-2">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Additional details</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Document responses, assessments, and official declarations related to this disaster event.
                </p>
            </div>
        </div>
    );
}

