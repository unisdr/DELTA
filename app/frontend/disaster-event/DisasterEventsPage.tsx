import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ViewContext } from "../context";


type DisasterEventsPageProps = {
    data: any[];
    hipTypes?: Array<{
        id: string;
        name: string;
    }>;
    hipClusters?: Array<{
        id: string;
        typeId: string;
        name: string;
    }>;
    hipHazards?: Array<{
        id: string;
        clusterId: string;
        code: string;
        name: string;
    }>;
    pagination?: {
        totalItems: number;
        itemsOnThisPage: number;
        page: number;
        pageSize: number;
    };
    canDelete?: boolean;
    canEdit?: boolean;
    countryName?: string;
    filters?: {
        disasterEventName?: string;
        recordingOrganization?: string;
        recordStatus?: string;
        hazardType?: string;
        hazardCluster?: string;
        specificHazard?: string;
        viewMyRecords?: boolean;
        pendingMyAction?: boolean;
    };
};


export default function DisasterEventsPage({
    data,
    hipTypes,
    hipClusters,
    hipHazards,
    pagination,
    canDelete = false,
    canEdit = false,
    countryName,
    filters,
}: DisasterEventsPageProps) {
    const ctx = new ViewContext();
    const toast = useRef<Toast>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [disasterEventNameFilter, setDisasterEventNameFilter] = useState(
        filters?.disasterEventName ?? "",
    );
    const [recordingOrganizationFilter, setRecordingOrganizationFilter] = useState(
        filters?.recordingOrganization ?? "",
    );
    const [viewMyRecordsChecked, setViewMyRecordsChecked] = useState(
        filters?.viewMyRecords ?? false,
    );
    const [pendingMyActionChecked, setPendingMyActionChecked] = useState(
        filters?.pendingMyAction ?? false,
    );
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | null>(
        filters?.recordStatus ?? null,
    );
    const [hazardTypeFilter, setHazardTypeFilter] = useState<string | null>(
        filters?.hazardType ?? null,
    );
    const [hazardClusterFilter, setHazardClusterFilter] = useState<string | null>(
        filters?.hazardCluster ?? null,
    );
    const [specificHazardFilter, setSpecificHazardFilter] = useState<string | null>(
        filters?.specificHazard ?? null,
    );
    const [eventStartFrom, setEventStartFrom] = useState<Date | null>(null);
    const [eventStartTo, setEventStartTo] = useState<Date | null>(null);

    const hazardTypeOptions = useMemo(
        () =>
            (hipTypes || []).map((hipType) => ({
                label: hipType.name,
                value: hipType.id,
            })),
        [hipTypes],
    );

    const hazardClusterOptions = useMemo(
        () =>
            (hipClusters || [])
                .filter((hipCluster) =>
                    hazardTypeFilter ? hipCluster.typeId === hazardTypeFilter : true,
                )
                .map((hipCluster) => ({
                    label: hipCluster.name,
                    value: hipCluster.id,
                })),
        [hipClusters, hazardTypeFilter],
    );

    const specificHazardOptions = useMemo(
        () =>
            (hipHazards || [])
                .filter((hipHazard) =>
                    hazardClusterFilter
                        ? hipHazard.clusterId === hazardClusterFilter
                        : true,
                )
                .map((hipHazard) => ({
                    label: hipHazard.code
                        ? `${hipHazard.name} (${hipHazard.code})`
                        : hipHazard.name,
                    value: hipHazard.id,
                })),
        [hipHazards, hazardClusterFilter],
    );

    const statusOptions = [
        { label: ctx.t({ code: "approval_status.draft", msg: "Draft" }), value: "draft" },
        { label: ctx.t({ code: "approval_status.waiting_for_validation", msg: "Waiting for validation" }), value: "waiting-for-validation" },
        { label: ctx.t({ code: "approval_status.needs_revision", msg: "Needs revision" }), value: "needs-revision" },
        { label: ctx.t({ code: "approval_status.validated", msg: "Validated" }), value: "validated" },
        { label: ctx.t({ code: "approval_status.published", msg: "Published" }), value: "published" },
    ];

    useEffect(() => {
        setDisasterEventNameFilter(filters?.disasterEventName ?? "");
        setRecordingOrganizationFilter(filters?.recordingOrganization ?? "");
        setStatusFilter(filters?.recordStatus ?? null);
        setHazardTypeFilter(filters?.hazardType ?? null);
        setHazardClusterFilter(filters?.hazardCluster ?? null);
        setSpecificHazardFilter(filters?.specificHazard ?? null);
        setViewMyRecordsChecked(filters?.viewMyRecords ?? false);
        setPendingMyActionChecked(filters?.pendingMyAction ?? false);
    }, [
        filters?.disasterEventName,
        filters?.recordingOrganization,
        filters?.recordStatus,
        filters?.hazardType,
        filters?.hazardCluster,
        filters?.specificHazard,
        filters?.viewMyRecords,
        filters?.pendingMyAction,
    ]);

    const updateFilterParam = (paramName: string, value: string) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        if (value.trim()) {
            nextSearchParams.set(paramName, value);
        } else {
            nextSearchParams.delete(paramName);
        }
        nextSearchParams.delete("page");
        setSearchParams(nextSearchParams, { replace: true });
    };

    const getStatusCircleClassName = (status: unknown) => {
        const normalizedStatus =
            typeof status === "string"
                ? status.trim().toLowerCase().replaceAll(" ", "-")
                : "";

        switch (normalizedStatus) {
            case "waiting-for-validation":
                return "h-2.5 w-2.5 rounded-full bg-[#D87838]";
            case "needs-revision":
                return "h-2.5 w-2.5 rounded-full bg-[#AD66A1]";
            case "validated":
                return "h-2.5 w-2.5 rounded-full bg-[#106CB8]";
            case "published":
                return "h-2.5 w-2.5 rounded-full bg-[#6D9A75]";
            case "draft":
            default:
                return "h-2.5 w-2.5 rounded-full border border-[#E2E8F0] bg-white";
        }
    };

    const actionsBodyTemplate = (row: (typeof data)[number]) => (
        <div className="flex w-full items-center justify-end gap-1">
            <Link to={`/${ctx.lang}/disaster-event/${row.id}`}>
                <Button
                    type="button"
                    text
                    aria-label="View"
                >
                    <i className="pi pi-eye" aria-hidden="true" />
                </Button>
            </Link>
            {canEdit ? (
                <Link to={`/${ctx.lang}/disaster-event/edit/${row.id}`}>
                    <Button
                        type="button"
                        text
                        aria-label="Edit"
                    >
                        <i className="pi pi-pencil" aria-hidden="true" />
                    </Button>
                </Link>
            ) : null}
            {canDelete ? (
                <Link to={`/${ctx.lang}/disaster-event/delete/${row.id}`}>
                    <Button
                        type="button"
                        text
                        severity="danger"
                        aria-label="Delete"
                    >
                        <i className="pi pi-trash" aria-hidden="true" />
                    </Button>
                </Link>
            ) : null}
        </div>
    );
    const statusBodyTemplate = (row: (typeof data)[number]) => {
        return (
            <span className="inline-flex items-center" title={String(row.approvalStatus ?? "") || undefined}>
                <span
                    className={`${getStatusCircleClassName(row.approvalStatus)} shadow-[0_1px_2px_rgba(15,23,42,0.35)]`}
                    aria-hidden="true"
                />
            </span>
        );
    };
    function shortUuid(value: string) {
        if (!value) return "-";
        return value.slice(0, 6);
    }
    async function copyUuidToClipboard(value: string) {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            toast.current?.show({
                severity: "success",
                summary: ctx.t({ code: "copied", msg: "Copied" }),
                detail: ctx.t({
                    code: "uuid_copied_to_clipboard",
                    msg: "UUID {shortUuid}… copied to clipboard",
                }, { shortUuid: shortUuid(value) }),
                life: 2000,
            });
        } catch {
            toast.current?.show({
                severity: "error",
                summary: ctx.t({ code: "failed", msg: "Failed" }),
                detail: ctx.t({ code: "could_not_copy_to_clipboard", msg: "Could not copy to clipboard" }),
                life: 3000,
            });
        }
    }

    const dateBodyTemplate = (value: Date | string | number | null | undefined) => {
        if (value == null || value === "") {
            return "-";
        }

        const dateValue =
            value instanceof Date ? value : new Date(value);

        if (Number.isNaN(dateValue.getTime())) {
            return "-";
        }

        return dateValue.toLocaleDateString("en-CA");
    };

    const getDisasterEventName = (row: (typeof data)[number]) =>
        row.nameNational?.trim() || row.nameGlobalOrRegional?.trim() || "";

    return (
        <div
            id="disaster-events-page"
            className="mx-auto w-full max-w-8xl px-4 py-8 md:px-6 lg:px-16"
        >
            <Toast ref={toast}
                position={ctx.lang === "ar" ? "top-left" : "top-right"} />
            <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                            {ctx.t(
                                {
                                    code: "disaster_event.count_header",
                                    msg: "{total} disaster events in {instance_name}",
                                },
                                {
                                    total: pagination?.totalItems,
                                    instance_name: countryName,
                                },
                            )}
                        </p>
                        <p className="text-[#334155]">
                            {ctx.t({ code: "disaster_event_data_management", msg: "Disaster event data management" })}
                        </p>
                    </div>
                    <Link to={`/${ctx.lang}/disaster-event/edit/new`}>
                        <Button
                            label={ctx.t({
                                code: "event.add_new",
                                msg: "Add new event",
                            })}
                            icon="pi pi-plus"
                            raised
                        />
                    </Link>
                </div>

                <div
                    id="filtersCard"
                    className="mb-6 min-h-[4rem] rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-full sm:min-w-[22rem] sm:flex-[1.6]">
                            <label
                                htmlFor="disaster-event-name-filter"
                                className="mb-2 block font-medium text-slate-900"
                            >
                                {ctx.t({
                                    code: "disaster_event_name",
                                    msg: "Disaster event name",
                                })}
                            </label>
                            <div className="relative">
                                <InputText
                                    id="disaster-event-name-filter"
                                    type="text"
                                    placeholder={ctx.t({ code: "search_by_event_name", msg: "Search by event name..." })}
                                    className="w-full ltr:pr-10 rtl:pl-10"
                                    value={disasterEventNameFilter}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setDisasterEventNameFilter(nextValue);
                                        updateFilterParam("disasterEventName", nextValue);
                                    }}
                                />
                                <i
                                    className="pi pi-search pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-500 ltr:right-3 rtl:left-3 rtl:right-auto"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:min-w-[12rem] sm:flex-[0.9]">
                            <label
                                htmlFor="recording-organization-filter"
                                className="mb-2 block font-medium text-slate-900"
                            >
                                {
                                    ctx.t({
                                        code: "disaster_event.recording_organization",
                                        msg: "Recording organization",
                                    })
                                }
                            </label>
                            <div className="relative">
                                <InputText
                                    id="recording-organization-filter"
                                    type="text"
                                    placeholder={ctx.t({ code: "disaster_event.search_organization_placeholder", msg: "Search organization" })}
                                    className="w-full ltr:pr-10 rtl:pl-10"
                                    value={recordingOrganizationFilter}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setRecordingOrganizationFilter(nextValue);
                                        updateFilterParam("recordingOrganization", nextValue);
                                    }}
                                />
                                <i
                                    className="pi pi-search pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-500 ltr:right-3 rtl:left-3 rtl:right-auto"
                                    aria-hidden="true"
                                />
                            </div>
                        </div>

                        <Button
                            type="button"
                            outlined
                            severity="secondary"
                            onClick={() => setIsFiltersExpanded((prev) => !prev)}
                            aria-expanded={isFiltersExpanded}
                            aria-controls="disaster-event-advanced-filters"
                        >
                            <span className="flex items-center gap-2">
                                <i className="pi pi-filter" aria-hidden="true" />
                                <span>
                                    {ctx.t({
                                        code: "common.filters",
                                        msg: "Filters",
                                    })}
                                </span>
                                <i
                                    className={`pi ${isFiltersExpanded ? "pi-chevron-up" : "pi-chevron-down"}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </Button>
                        {/* </div> */}

                    </div>

                    <div className="mt-6 border-t border-slate-200" aria-hidden="true" />

                    {isFiltersExpanded && (
                        <>
                            <div className="mt-4 flex flex-wrap items-end gap-4 rounded">
                                <div className="w-full sm:min-w-[14rem] sm:flex-1">
                                    <label
                                        htmlFor="hazard-type-filter"
                                        className="mb-2 block font-medium text-slate-900"
                                    >
                                        {ctx.t({
                                            code: "hip.hazard_type",
                                            msg: "Hazard type",
                                        })}
                                    </label>
                                    <Dropdown
                                        id="hazard-type-filter"
                                        value={hazardTypeFilter}
                                        options={hazardTypeOptions}
                                        onChange={(e) => {
                                            const nextValue =
                                                typeof e.value === "string"
                                                    ? e.value
                                                    : "";
                                            setHazardTypeFilter(nextValue || null);
                                            setHazardClusterFilter(null);
                                            setSpecificHazardFilter(null);

                                            const nextSearchParams =
                                                new URLSearchParams(searchParams);
                                            if (nextValue.trim()) {
                                                nextSearchParams.set("hazardType", nextValue);
                                            } else {
                                                nextSearchParams.delete("hazardType");
                                            }
                                            nextSearchParams.delete("hazardCluster");
                                            nextSearchParams.delete("specificHazard");
                                            nextSearchParams.delete("page");
                                            setSearchParams(nextSearchParams, {
                                                replace: true,
                                            });
                                        }}
                                        placeholder={ctx.t({
                                            code: "all_types",
                                            msg: "All types",
                                        })}
                                        className="w-full"
                                        filter
                                        filterBy="label"
                                        showClear
                                    />
                                </div>

                                <div className="w-full sm:min-w-[14rem] sm:flex-1">
                                    <label
                                        htmlFor="hazard-cluster-filter"
                                        className="mb-2 block font-medium text-slate-900"
                                    >
                                        {ctx.t({
                                            code: "hip.hazard_cluster",
                                            msg: "Hazard cluster",
                                        })}
                                    </label>
                                    <Dropdown
                                        id="hazard-cluster-filter"
                                        value={hazardClusterFilter}
                                        options={hazardClusterOptions}
                                        onChange={(e) => {
                                            const nextValue =
                                                typeof e.value === "string"
                                                    ? e.value
                                                    : "";
                                            const selectedCluster = (hipClusters || []).find(
                                                (hipCluster) => hipCluster.id === nextValue,
                                            );
                                            const associatedHazardType =
                                                selectedCluster?.typeId || null;

                                            if (associatedHazardType) {
                                                setHazardTypeFilter(associatedHazardType);
                                            }
                                            setHazardClusterFilter(nextValue || null);
                                            setSpecificHazardFilter(null);

                                            const nextSearchParams =
                                                new URLSearchParams(searchParams);
                                            if (associatedHazardType) {
                                                nextSearchParams.set(
                                                    "hazardType",
                                                    associatedHazardType,
                                                );
                                            }
                                            if (nextValue.trim()) {
                                                nextSearchParams.set(
                                                    "hazardCluster",
                                                    nextValue,
                                                );
                                            } else {
                                                nextSearchParams.delete("hazardCluster");
                                            }
                                            nextSearchParams.delete("specificHazard");
                                            nextSearchParams.delete("page");
                                            setSearchParams(nextSearchParams, {
                                                replace: true,
                                            });
                                        }}
                                        placeholder={ctx.t({
                                            code: "hip.all_clusters",
                                            msg: "All clusters",
                                        })}
                                        className="w-full"
                                        filter
                                        filterBy="label"
                                        showClear
                                    />
                                </div>

                                <div className="w-full sm:min-w-[14rem] sm:flex-1">
                                    <label
                                        htmlFor="specific-hazard-filter"
                                        className="mb-2 block font-medium text-slate-900"
                                    >
                                        {ctx.t({
                                            code: "hip.specific_hazard",
                                            msg: "Specific hazard",
                                        })}
                                    </label>
                                    <Dropdown
                                        id="specific-hazard-filter"
                                        value={specificHazardFilter}
                                        options={specificHazardOptions}
                                        onChange={(e) => {
                                            const nextValue =
                                                typeof e.value === "string"
                                                    ? e.value
                                                    : "";
                                            setSpecificHazardFilter(nextValue || null);

                                            const selectedHazard = (hipHazards || []).find(
                                                (hipHazard) => hipHazard.id === nextValue,
                                            );
                                            const associatedHazardCluster =
                                                selectedHazard?.clusterId || null;
                                            const associatedHazardType = associatedHazardCluster
                                                ? (hipClusters || []).find(
                                                    (hipCluster) =>
                                                        hipCluster.id === associatedHazardCluster,
                                                )?.typeId || null
                                                : null;

                                            if (associatedHazardCluster) {
                                                setHazardClusterFilter(associatedHazardCluster);
                                            }
                                            if (associatedHazardType) {
                                                setHazardTypeFilter(associatedHazardType);
                                            }

                                            const nextSearchParams =
                                                new URLSearchParams(searchParams);
                                            if (associatedHazardType) {
                                                nextSearchParams.set(
                                                    "hazardType",
                                                    associatedHazardType,
                                                );
                                            }
                                            if (associatedHazardCluster) {
                                                nextSearchParams.set(
                                                    "hazardCluster",
                                                    associatedHazardCluster,
                                                );
                                            }
                                            if (nextValue.trim()) {
                                                nextSearchParams.set(
                                                    "specificHazard",
                                                    nextValue,
                                                );
                                            } else {
                                                nextSearchParams.delete("specificHazard");
                                            }
                                            nextSearchParams.delete("page");
                                            setSearchParams(nextSearchParams, {
                                                replace: true,
                                            });
                                        }}
                                        placeholder={ctx.t({ code: "enter_hazard_name_or_hips_code", msg: "Enter hazard name or HIPS code" })}
                                        className="w-full"
                                        filter
                                        filterBy="label"
                                        virtualScrollerOptions={{ itemSize: 38 }}
                                        showClear
                                    />
                                </div>
                            </div>

                            <div
                                id="disaster-event-advanced-filters"
                                className="mt-4 flex flex-wrap items-end gap-4"
                            >
                                <div className="w-full sm:min-w-[14rem] sm:flex-1">
                                    <label
                                        htmlFor="record-status-filter"
                                        className="mb-2 block font-medium text-slate-900"
                                    >
                                        {ctx.t({
                                            code: "record.status",
                                            msg: "Record status",
                                        })}
                                    </label>
                                    <Dropdown
                                        id="record-status-filter"
                                        value={statusFilter}
                                        options={statusOptions}
                                        onChange={(e) => {
                                            const nextValue =
                                                typeof e.value === "string"
                                                    ? e.value
                                                    : "";
                                            setStatusFilter(nextValue || null);
                                            updateFilterParam("recordStatus", nextValue);
                                        }}
                                        placeholder={ctx.t({ code: "all_statuses", msg: "All statuses" })}
                                        className="w-full"
                                        showClear
                                    />
                                </div>

                                <div className="w-full sm:min-w-[14rem] sm:flex-1">
                                    <label
                                        htmlFor="event-start-from-filter"
                                        className="mb-2 block font-medium text-slate-900"
                                    >
                                        Event start from
                                    </label>
                                    <Calendar
                                        id="event-start-from-filter"
                                        value={eventStartFrom}
                                        onChange={(e) => setEventStartFrom(e.value as Date | null)}
                                        dateFormat="yy-mm-dd"
                                        className="w-full"
                                        showIcon
                                    />
                                </div>

                                <div className="w-full sm:min-w-[14rem] sm:flex-1">
                                    <label
                                        htmlFor="event-start-to-filter"
                                        className="mb-2 block font-medium text-slate-900"
                                    >
                                        Event start to
                                    </label>
                                    <Calendar
                                        id="event-start-to-filter"
                                        value={eventStartTo}
                                        onChange={(e) => setEventStartTo(e.value as Date | null)}
                                        dateFormat="yy-mm-dd"
                                        className="w-full"
                                        showIcon
                                    />
                                </div>
                            </div>
                            <div className="mt-4 mb-6 border-t border-slate-200" aria-hidden="true" />
                        </>
                    )}

                    {canEdit ? (
                        <div className="mt-4 flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    inputId="view-my-records-filter"
                                    checked={viewMyRecordsChecked}
                                    onChange={(e) => {
                                        const isChecked = Boolean(e.checked);
                                        setViewMyRecordsChecked(isChecked);
                                        updateFilterParam(
                                            "viewMyRecords",
                                            isChecked ? "true" : "",
                                        );
                                    }}
                                />
                                <label
                                    htmlFor="view-my-records-filter"
                                    className="font-medium text-slate-900"
                                >
                                    {ctx.t({
                                        code: "list.filter.view_my_records",
                                        msg: "View my records",
                                    })}
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    inputId="pending-my-action-filter"
                                    checked={pendingMyActionChecked}
                                    onChange={(e) => {
                                        const isChecked = Boolean(e.checked);
                                        setPendingMyActionChecked(isChecked);
                                        updateFilterParam(
                                            "pendingMyAction",
                                            isChecked ? "true" : "",
                                        );
                                    }}
                                />
                                <label
                                    htmlFor="pending-my-action-filter"
                                    className="font-medium text-slate-900"
                                >
                                    {ctx.t({
                                        code: "list.filter.pending_my_action",
                                        msg: "Pending my action",
                                    })}
                                </label>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div
                    id="statusLegend"
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-700"
                >
                    <span className="font-semibold text-slate-900">{ctx.t({ code: "common.status_legend", msg: "Status legend" })}</span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("draft")} />
                        <span>{ctx.t({ code: "approval_status.draft", msg: "Draft" })}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("waiting-for-validation")} />
                        <span>{ctx.t({ code: "approval_status.waiting_for_validation", msg: "Waiting for validation" })}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("needs-revision")} />
                        <span>{ctx.t({ code: "approval_status.needs_revision", msg: "Needs revision" })}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("validated")} />
                        <span>{ctx.t({ code: "approval_status.validated", msg: "Validated" })}</span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span className={getStatusCircleClassName("published")} />
                        <span>{ctx.t({ code: "approval_status.published", msg: "Published" })}</span>
                    </span>
                </div>

                <div className="my-6 border-t border-slate-200" aria-hidden="true" />

                <div className="w-full overflow-x-auto rounded-lg border border-slate-200 [&_.p-datatable]:w-full [&_.p-datatable-wrapper]:w-full [&_.p-datatable-table]:w-full [&_.p-datatable-table]:min-w-[72rem] [&_.p-datatable-table]:table-auto">
                    <DataTable
                        value={data}
                        dataKey="id"
                        emptyMessage={ctx.t({ code: "no_disaster_events_found", msg: "No disaster events found" })}
                        sortMode="multiple"
                        removableSort
                        size="small"
                        className="w-full"
                        tableClassName="!table w-full min-w-[72rem] table-auto border-collapse text-sm md:text-base"
                    >
                        <Column
                            field="approvalStatus"
                            header={ctx.t({ code: "common.status", msg: "Status" })}
                            body={statusBodyTemplate}
                            sortable
                            headerClassName="min-w-[9rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[9rem] px-2 py-3 border-b border-gray-200"
                            bodyStyle={{ textAlign: 'center' }}
                            pt={{
                                headerContent: { style: { justifyContent: 'center' } },
                            }}
                        />
                        <Column
                            field="nameNational"
                            header={ctx.t({ code: "disaster_event.name", msg: "Disaster event name" })}
                            sortable
                            body={(row) => getDisasterEventName(row)}
                            headerClassName="min-w-[14rem] bg-gray-100 px-2 py-3 font-medium border-b border-gray-200"
                            bodyClassName="min-w-[14rem] px-2 py-3 border-b border-gray-200 !text-start"
                        />
                        <Column
                            field="recordingInstitution"
                            header={ctx.t({ code: "disaster_event.recording_organization", msg: "Recording organization" })}
                            sortable
                            headerClassName="min-w-[14rem] bg-gray-100 px-2 py-3 font-medium border-b border-gray-200"
                            bodyClassName="min-w-[14rem] px-2 py-3 border-b border-gray-200 !text-start"
                        />
                        <Column
                            field="id"
                            header={ctx.t({ code: "common.uuid", msg: "UUID" })}
                            sortable
                            headerClassName="min-w-[9rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[9rem] px-2 py-3 border-b border-gray-200"
                            body={(row) => (
                                <div className="flex items-center gap-1">
                                    <span>{shortUuid(row.id)}</span>
                                    <Button
                                        type="button"
                                        icon="pi pi-copy"
                                        text
                                        size="small"
                                        title="Copy UUID"
                                        aria-label="Copy UUID"
                                        onClick={() => {
                                            void copyUuidToClipboard(row.id);
                                        }}
                                    />
                                </div>
                            )}
                        />
                        <Column
                            field="startDate"
                            header="Event start date"
                            body={(row) => dateBodyTemplate(row.startDate)}
                            sortable
                            headerClassName="min-w-[10rem] bg-gray-100 px-2 py-3 text-left font-medium border-b border-gray-200"
                            bodyClassName="min-w-[10rem] px-2 py-3 border-b border-gray-200 !text-start"
                        />
                        <Column
                            field="linkedRecordsCount"
                            header={ctx.t({ code: "linked_records", msg: "Linked records" })}
                            sortable
                            body={(row) => (
                                <Link
                                    to={`/${ctx.lang}/disaster-record?disasterEventUUID=${encodeURIComponent(row.id)}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {row.linkedRecordsCount ?? 0}
                                </Link>
                            )}
                            bodyStyle={{ textAlign: 'center' }}
                            pt={{
                                headerContent: { style: { justifyContent: 'center' } },
                            }}
                        />

                        <Column
                            header=""
                            body={actionsBodyTemplate}
                            headerClassName="min-w-[8rem] bg-gray-100 px-2 py-3 border-b border-gray-200"
                            bodyClassName="min-w-[8rem] px-2 py-3 border-b border-gray-200"
                        />
                    </DataTable>
                </div>

            </div>
        </div>
    );
}