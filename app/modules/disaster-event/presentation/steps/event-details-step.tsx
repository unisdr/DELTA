import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";

import type {
    CoreEventStepState,
    DisasterEventStepState,
    StartDatePrecision,
} from "~/modules/disaster-event/presentation/step-state";

type Option = { label: string; value: string };

type CoreEventStepProps = {
    state: DisasterEventStepState;
    onChange: (next: DisasterEventStepState) => void;
    hipTypes: Option[];
    hipClusters: Option[];
    hipHazards: Option[];
};

const startDatePrecisionOptions = [
    { label: "Full Date (DD/MM/YYYY)", value: "fullDate" as const },
    { label: "Month and Year (MM/YYYY)", value: "monthYear" as const },
    { label: "Year only (YYYY)", value: "yearOnly" as const },
];

function parseStartDateToDate(
    value: string,
    precision: StartDatePrecision,
): Date | null {
    if (!value) {
        return null;
    }

    if (precision === "yearOnly") {
        if (!/^\d{4}$/.test(value)) {
            return null;
        }
        return new Date(Number(value), 0, 1);
    }

    if (precision === "monthYear") {
        if (!/^\d{4}-\d{2}$/.test(value)) {
            return null;
        }
        const [year, month] = value.split("-").map(Number);
        return new Date(year, month - 1, 1);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDateForPrecision(
    date: Date | null,
    precision: StartDatePrecision,
): string {
    if (!date) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    if (precision === "yearOnly") {
        return String(year);
    }

    if (precision === "monthYear") {
        return `${year}-${month}`;
    }

    return `${year}-${month}-${day}`;
}

function normalizeStartDateForPrecision(
    value: string,
    precision: StartDatePrecision,
): string {
    if (!value) {
        return "";
    }

    if (precision === "yearOnly") {
        if (/^\d{4}$/.test(value)) {
            return value;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}$/.test(value)) {
            return value.slice(0, 4);
        }
        const year = value.match(/(\d{4})/);
        return year ? year[1] : "";
    }

    if (precision === "monthYear") {
        if (/^\d{4}-\d{2}$/.test(value)) {
            return value;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value.slice(0, 7);
        }
        if (/^\d{4}$/.test(value)) {
            return `${value}-01`;
        }
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
        return `${value}-01`;
    }
    if (/^\d{4}$/.test(value)) {
        return `${value}-01-01`;
    }
    return "";
}

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
            <div className="mb-1">
                <h3 className="text-lg font-semibold text-slate-800">Event basics</h3>
                <p className="text-sm text-slate-600">General information about the disaster event.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                    <span>
                        Disaster name - national
                        <span className="ml-1 text-red-600" aria-hidden="true">*</span>
                    </span>
                    <InputText
                        value={state.coreEvent.nameNational}
                        required
                        placeholder="For example, Hurricane Mitch"
                        onChange={(e) =>
                            patchCore(state, onChange, { nameNational: e.target.value })
                        }
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span>Disaster name - Other ( Global or Regional)</span>
                    <InputText
                        value={state.coreEvent.nameGlobalOrRegional}
                        placeholder="Add event name"
                        onChange={(e) =>
                            patchCore(state, onChange, { nameGlobalOrRegional: e.target.value })
                        }
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span>National event ID</span>
                    <InputText
                        value={state.coreEvent.nationalDisasterId}
                        onChange={(e) =>
                            patchCore(state, onChange, { nationalDisasterId: e.target.value })
                        }
                    />
                </label>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                    <span>GLIDE number</span>
                    <InputText
                        value={state.coreEvent.glide}
                        placeholder="Add GLIDE number"
                        onChange={(e) =>
                            patchCore(state, onChange, { glide: e.target.value })
                        }
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span>Recording organization</span>
                    <InputText
                        value={state.coreEvent.recordingInstitution}
                        placeholder="Ministry of Interior"
                        onChange={(e) =>
                            patchCore(state, onChange, { recordingInstitution: e.target.value })
                        }
                    />
                </label>
            </div>

            <hr className="my-1 border-slate-200" />

            <div className="mb-1">
                <h3 className="text-lg font-semibold text-slate-800">Hazard and timing</h3>
                <p className="text-sm text-slate-600 mb-2">
                    Detailed information regarding the observed hazards and timing.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                    <span>Hazard type (observed)</span>
                    <Dropdown
                        options={hipTypes}
                        value={state.coreEvent.hipTypeId || null}
                        onChange={(e) => patchCore(state, onChange, { hipTypeId: e.value || "" })}
                        placeholder="Select type"
                        filter
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span>Hazard cluster (observed)</span>
                    <Dropdown
                        options={hipClusters}
                        value={state.coreEvent.hipClusterId || null}
                        onChange={(e) =>
                            patchCore(state, onChange, { hipClusterId: e.value || "" })
                        }
                        placeholder="Select cluster"
                        filter
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span>Specific hazard (observed)</span>
                    <Dropdown
                        options={hipHazards}
                        value={state.coreEvent.hipHazardId || null}
                        onChange={(e) =>
                            patchCore(state, onChange, { hipHazardId: e.value || "" })
                        }
                        placeholder="Select hazard"
                        filter
                    />
                </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1">
                    <label htmlFor="startDatePrecision" className="text-sm font-medium text-slate-700">
                        Start Date Format
                    </label>
                    <Dropdown
                        id="startDatePrecision"
                        options={startDatePrecisionOptions}
                        optionLabel="label"
                        optionValue="value"
                        value={state.coreEvent.startDatePrecision}
                        className="w-full"
                        onChange={(e) => {
                            const nextPrecision = e.value as StartDatePrecision;
                            patchCore(state, onChange, {
                                startDatePrecision: nextPrecision,
                                startDate: normalizeStartDateForPrecision(state.coreEvent.startDate, nextPrecision),
                            });
                        }}
                    />
                </div>
                <div className="grid gap-1">
                    <label htmlFor="endDatePrecision" className="text-sm font-medium text-slate-700">
                        End Date Format
                    </label>
                    <Dropdown
                        id="endDatePrecision"
                        options={startDatePrecisionOptions}
                        optionLabel="label"
                        optionValue="value"
                        value={state.coreEvent.endDatePrecision}
                        className="w-full"
                        onChange={(e) => {
                            const nextPrecision = e.value as StartDatePrecision;
                            patchCore(state, onChange, {
                                endDatePrecision: nextPrecision,
                                endDate: normalizeStartDateForPrecision(state.coreEvent.endDate, nextPrecision),
                            });
                        }}
                    />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                    <span>Start Date</span>
                    <Calendar
                        showIcon
                        showButtonBar
                        value={parseStartDateToDate(state.coreEvent.startDate, state.coreEvent.startDatePrecision)}
                        view={
                            state.coreEvent.startDatePrecision === "yearOnly"
                                ? "year"
                                : state.coreEvent.startDatePrecision === "monthYear"
                                    ? "month"
                                    : "date"
                        }
                        dateFormat={
                            state.coreEvent.startDatePrecision === "fullDate"
                                ? "dd/mm/yy"
                                : state.coreEvent.startDatePrecision === "monthYear"
                                    ? "mm/yy"
                                    : "yy"
                        }
                        onChange={(e) =>
                            patchCore(state, onChange, {
                                startDate: formatDateForPrecision(
                                    (e.value as Date | null) ?? null,
                                    state.coreEvent.startDatePrecision,
                                ),
                            })
                        }
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span>End Date</span>
                    <Calendar
                        showIcon
                        showButtonBar
                        value={parseStartDateToDate(state.coreEvent.endDate, state.coreEvent.endDatePrecision)}
                        view={
                            state.coreEvent.endDatePrecision === "yearOnly"
                                ? "year"
                                : state.coreEvent.endDatePrecision === "monthYear"
                                    ? "month"
                                    : "date"
                        }
                        dateFormat={
                            state.coreEvent.endDatePrecision === "fullDate"
                                ? "dd/mm/yy"
                                : state.coreEvent.endDatePrecision === "monthYear"
                                    ? "mm/yy"
                                    : "yy"
                        }
                        onChange={(e) =>
                            patchCore(state, onChange, {
                                endDate: formatDateForPrecision(
                                    (e.value as Date | null) ?? null,
                                    state.coreEvent.endDatePrecision,
                                ),
                            })
                        }
                    />
                </label>
            </div>

        </div>
    );
}
