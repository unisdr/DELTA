import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Link } from "react-router";

import type { HazardousEvent } from "~/modules/hazardous-event/domain/entities/hazardous-event";

interface HazardousEventDetailsPageProps {
    item: HazardousEvent;
    hazardNameById: Record<string, string>;
    clusterNameById: Record<string, string>;
    typeNameById: Record<string, string>;
}

function valueOrDash(value?: string | Date | null) {
    if (!value) {
        return "-";
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return value.trim() ? value : "-";
}

function hipNameOrDash(
    id: string | null | undefined,
    namesById: Record<string, string>,
) {
    if (!id) {
        return "-";
    }
    return namesById[id] || id;
}

export default function HazardousEventDetailsPage({
    item,
    hazardNameById,
    clusterNameById,
    typeNameById,
}: HazardousEventDetailsPageProps) {
    return (
        <div className="mx-auto max-w-5xl p-4">
            <Card>
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold text-slate-800">
                        Hazardous Event Details
                    </h1>
                    <Link to="/hazardous-event">
                        <Button label="Back to list" text size="small" />
                    </Link>
                </div>

                <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">ID</dt>
                        <dd className="mt-1 text-sm text-slate-800">{item.id}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Record Originator</dt>
                        <dd className="mt-1 text-sm text-slate-800">{valueOrDash(item.recordOriginator)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">National Specification</dt>
                        <dd className="mt-1 text-sm text-slate-800">{valueOrDash(item.nationalSpecification)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</dt>
                        <dd className="mt-1 text-sm text-slate-800">{valueOrDash(item.startDate)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</dt>
                        <dd className="mt-1 text-sm text-slate-800">{valueOrDash(item.endDate)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">HIP Hazard</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                            {hipNameOrDash(item.hipHazardId, hazardNameById)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">HIP Cluster</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                            {hipNameOrDash(item.hipClusterId, clusterNameById)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">HIP Type</dt>
                        <dd className="mt-1 text-sm text-slate-800">
                            {hipNameOrDash(item.hipTypeId, typeNameById)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Approval Status</dt>
                        <dd className="mt-1">
                            {item.approvalStatus ? (
                                <Tag value={item.approvalStatus} severity="info" />
                            ) : (
                                "-"
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Lifecycle Status</dt>
                        <dd className="mt-1">
                            {item.hazardousEventStatus ? (
                                <Tag value={item.hazardousEventStatus} severity="warning" />
                            ) : (
                                "-"
                            )}
                        </dd>
                    </div>
                    <div className="md:col-span-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</dt>
                        <dd className="mt-1 text-sm text-slate-800">{valueOrDash(item.description)}</dd>
                    </div>
                </dl>
            </Card>
        </div>
    );
}
