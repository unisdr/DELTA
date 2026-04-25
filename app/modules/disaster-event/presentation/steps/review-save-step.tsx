import type { DisasterEventStepState } from "~/modules/disaster-event/presentation/step-state";

type ReviewSaveStepProps = {
    state: DisasterEventStepState;
};

export default function ReviewSaveStep({ state }: ReviewSaveStepProps) {
    return (
        <div className="grid gap-3 mt-2">
            <p className="text-sm text-gray-700">
                Review the composed payload before saving. The form serializes step state into
                a normalized action payload.
            </p>
            <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto max-h-80">
                {JSON.stringify(state, null, 2)}
            </pre>
        </div>
    );
}
