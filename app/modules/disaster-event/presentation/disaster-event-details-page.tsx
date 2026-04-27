import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Link } from "react-router";

import type { DisasterEvent } from "~/modules/disaster-event/domain/entities/disaster-event";

type DisasterEventDetailsPageProps = {
    item: DisasterEvent;
};

function valueOrDash(value?: string | null) {
    return value && value.trim() ? value : "-";
}

function dateValueOrDash(value?: Date | null) {
    if (!value) {
        return "-";
    }

    return value.toLocaleDateString("en-CA");
}

function statusSeverity(status: DisasterEvent["approvalStatus"]) {
    if (status === "published" || status === "validated") {
        return "success";
    }
    if (status === "needs-revision") {
        return "danger";
    }
    if (status === "waiting-for-validation") {
        return "warning";
    }
    return "info";
}

export default function DisasterEventDetailsPage({ item }: DisasterEventDetailsPageProps) {
    return (
        <div className="mx-auto max-w-7xl p-4">
            <Card className="border border-slate-200 shadow-sm">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">Disaster Event Details</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Review event metadata, geography, related links, and operational records.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/disaster-event">
                            <Button
                                label="Back"
                                text
                                size="small"
                                icon="pi pi-arrow-left"
                            />
                        </Link>
                        <Link to={`/disaster-event/${item.id}/edit`}>
                            <Button
                                label="Edit"
                                icon="pi pi-pencil"
                            />
                        </Link>
                    </div>
                </div>

                <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Event ID</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{item.id}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">National ID</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{valueOrDash(item.nationalDisasterId)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Recording Institution</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{valueOrDash(item.recordingInstitution)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Approval Status</p>
                        <div className="mt-1">
                            <Tag
                                value={item.approvalStatus}
                                severity={statusSeverity(item.approvalStatus)}
                            />
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <Card className="h-full border border-slate-200">
                        <h3 className="mb-3 text-lg font-semibold text-slate-800">Core Event</h3>
                        <dl className="grid gap-3 text-sm">
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-500">National Name</dt>
                                <dd className="mt-1 text-slate-800">{valueOrDash(item.nameNational)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-500">Global/Regional Name</dt>
                                <dd className="mt-1 text-slate-800">{valueOrDash(item.nameGlobalOrRegional)}</dd>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">Start Date</dt>
                                    <dd className="mt-1 text-slate-800">{dateValueOrDash(item.startDate)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">End Date</dt>
                                    <dd className="mt-1 text-slate-800">{dateValueOrDash(item.endDate)}</dd>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">HIP Type</dt>
                                    <dd className="mt-1 text-slate-800">{valueOrDash(item.hipTypeId)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">HIP Cluster</dt>
                                    <dd className="mt-1 text-slate-800">{valueOrDash(item.hipClusterId)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wide text-slate-500">HIP Hazard</dt>
                                    <dd className="mt-1 text-slate-800">{valueOrDash(item.hipHazardId)}</dd>
                                </div>
                            </div>
                        </dl>
                    </Card>

                    <Card className="h-full border border-slate-200">
                        <h3 className="mb-3 text-lg font-semibold text-slate-800">Geography</h3>
                        <dl className="grid gap-3 text-sm">
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-500">Source</dt>
                                <dd className="mt-1 text-slate-800">{valueOrDash(item.geography?.source)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-500">Division</dt>
                                <dd className="mt-1 text-slate-800">{valueOrDash(item.geography?.divisionId)}</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-500">Geometry</dt>
                                <dd className="mt-1 text-slate-800">
                                    {item.geography?.geomGeoJson ? "Defined" : "Not provided"}
                                </dd>
                            </div>
                        </dl>
                    </Card>
                </section>

                <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Card className="border border-slate-200">
                        <h3 className="mb-3 text-base font-semibold text-slate-800">Attachments</h3>
                        {item.attachments.length > 0 ? (
                            <ul className="space-y-2 text-sm text-slate-700">
                                {item.attachments.map((attachment, index) => (
                                    <li key={`${attachment.fileKey}-${index}`} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                                        <p className="font-medium text-slate-800">{valueOrDash(attachment.title || attachment.fileName)}</p>
                                        <p className="text-xs text-slate-500">
                                            {valueOrDash(attachment.fileType)} • {attachment.fileSize || 0} bytes
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">No attachments recorded.</p>
                        )}
                    </Card>

                    <Card className="border border-slate-200">
                        <h3 className="mb-3 text-base font-semibold text-slate-800">Causality Links</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Disaster links</dt>
                                <dd className="font-medium text-slate-800">{item.causedByDisasters.length}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Hazardous links</dt>
                                <dd className="font-medium text-slate-800">{item.hazardousCausalities.length}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card className="border border-slate-200">
                        <h3 className="mb-3 text-base font-semibold text-slate-800">Operational Records</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Responses</dt>
                                <dd className="font-medium text-slate-800">{item.responses.length}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Assessments</dt>
                                <dd className="font-medium text-slate-800">{item.assessments.length}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-slate-500">Declarations</dt>
                                <dd className="font-medium text-slate-800">{item.declarations.length}</dd>
                            </div>
                        </dl>
                    </Card>
                </section>
            </Card>
        </div>
    );
}
