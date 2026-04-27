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
    return null;
}

