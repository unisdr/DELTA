import { useEffect, useRef } from "react";
import { useLoaderData, useRouteLoaderData } from "react-router";
import { Pagination } from "~/frontend/pagination/view";
import { HazardousEventFilters } from "~/frontend/events/hazardevent-filters";

import { hazardousEventsLoader } from "~/backend.server/handlers/events/hazardevent";
import { formatDateDisplay } from "~/utils/date";
import { route } from "~/frontend/events/hazardeventform";
import { ViewContext } from "../context";
import { LangLink } from "~/utils/link";
import { Tooltip } from "primereact/tooltip";
import { ListLegend } from "~/components/ListLegend";
import { approvalStatusKeyToLabel } from "../approval";
import { DataCollectionActionLinks } from "../components/data-collection/ActionLinks";

interface ListViewArgs {
	ctx: ViewContext;
	isPublic: boolean;
	basePath: string;
	linksNewTab?: boolean;
	actions?: (item: any) => React.ReactNode;
}

/**
 * Helper function to get the appropriate hazard name based on hierarchy
 * Shows specific hazard if available, otherwise cluster, otherwise type
 */
function getHazardDisplayName(item: any): string {
	if (item.hipHazard?.name) {
		return item.hipHazard.name;
	} else if (item.hipCluster?.name) {
		return item.hipCluster.name;
	} else if (item.hipType?.name) {
		return item.hipType.name || "";
	}
	return "";
}

export function ListView(args: ListViewArgs) {
	const ld = useLoaderData<Awaited<ReturnType<typeof hazardousEventsLoader>>>();
	const ctx = args.ctx;

	const rootData = useRouteLoaderData("root") as any; // Get user data from root loader

	// Get user data with role from root loader
	const user = {
		...rootData?.user,
		role: rootData?.userRole || rootData?.user?.role, // Use userRole from root data if available
	};

	const { hip, filters } = ld;
	const { items } = ld.data;

	const pagination = Pagination({
		ctx,
		...ld.data.pagination,
	});

	// Store the total count in a ref that persists across renders
	const totalCountRef = useRef(ld.data.pagination.totalItems);

	// Check if this is an unfiltered view
	const isUnfiltered =
		!filters.hipHazardId &&
		!filters.hipClusterId &&
		!filters.hipTypeId &&
		!filters.search;

	// Use effect to update the ref when we see an unfiltered view with a higher count
	useEffect(() => {
		if (isUnfiltered && ld.data.pagination.totalItems > totalCountRef.current) {
			totalCountRef.current = ld.data.pagination.totalItems;
		}
	}, [isUnfiltered, ld.data.pagination.totalItems]);

	// Refs for the status elements
	const statusRefs = useRef(new Map<number, HTMLElement>());

	return (
		<div>
			{/* Enhanced filters component with all required filter options */}
			<HazardousEventFilters
				ctx={ctx}
				hipHazardId={filters.hipHazardId}
				hipClusterId={filters.hipClusterId}
				hipTypeId={filters.hipTypeId}
				fromDate={filters.fromDate}
				toDate={filters.toDate}
				recordingOrganization={filters.recordingOrganization}
				hazardousEventStatus={filters.hazardousEventStatus}
				recordStatus={filters.recordStatus}
				viewMyRecords={filters.viewMyRecords}
				pendingMyAction={filters.pendingMyAction}
				search={filters.search}
				hip={hip}
				organizations={ld.organizations || []}
				clearFiltersUrl={ctx.url(args.basePath)}
			/>

			<section className="dts-page-section">
				{!args.isPublic && (
					<>
						<div className="dts-heading-4">
							{totalCountRef.current > 0 && (
								<div>
									<p>
										{ctx.t(
											{
												code: "hazardous_events.showing_filtered_of_total",
												desc: "Shows how many hazardous events are displayed. {filtered} is the number of matching events, {total} is the total number of events.",
												msg: "Showing {filtered} of {total} hazardous event(s)",
											},
											{
												filtered:
													items.length !== undefined
														? items.length
														: totalCountRef.current,
												total: totalCountRef.current,
											},
										)}
									</p>
								</div>
							)}
						</div>

						<ListLegend ctx={ctx} />
					</>
				)}

				{ld.data.pagination.totalItems ? (
					<>
						<Tooltip
							target=".custom-target-icon"
							pt={{
								root: { style: { marginTop: "-10px" } },
							}}
						/>
						<table
							data-testid="list-table"
							className="dts-table width-override-data-collection"
						>
							<thead>
								<tr>
									<th>
										{ctx.t({
											code: "hip.hazard_type",
											desc: "Label for hazard type",
											msg: "Hazard type",
										})}
									</th>
									{!args.isPublic && (
										<th>
											{ctx.t({
												code: "record.status_label",
												desc: "Label for record status column in table",
												msg: "Record status",
											})}
										</th>
									)}
									<th>
										{ctx.t({
											code: "hazardous_event.uuid",
											desc: "Label for the UUID of a hazardous event",
											msg: "Hazardous event UUID",
										})}
									</th>
									<th>
										{ctx.t({
											code: "record.created",
											desc: "Label for the creation date of a record",
											msg: "Created",
										})}
									</th>
									<th>
										{ctx.t({
											code: "record.updated",
											desc: "Label for the last updated date of a record",
											msg: "Updated",
										})}
									</th>
									{!args.isPublic && (
										<th className="dts-table__cell-centered">
											{ctx.t({
												code: "record.table.actions",
												desc: "Label for the actions column in record tables",
												msg: "Actions",
											})}
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{items.map((item, index) => (
									<tr key={index}>
										<td>{getHazardDisplayName(item)}</td>
										{!args.isPublic && (
											<td>
												<span
													ref={(el) => {
														if (el) {
															statusRefs.current.set(index, el);
														}
													}}
													className={`dts-status dts-status--${item.approvalStatus.toLowerCase()} custom-target-icon`}
													data-pr-tooltip={item.approvalStatus}
													data-pr-position="top"
												></span>
												{} {approvalStatusKeyToLabel(ctx, item.approvalStatus)}
											</td>
										)}
										<td>
											<LangLink
												lang={ctx.lang}
												to={`/hazardous-event/${item.id}`}
												target={args.linksNewTab ? "_blank" : undefined}
											>
												{item.id.slice(0, 5)}
											</LangLink>
										</td>
										<td>{formatDateDisplay(item.createdAt, "dd-MM-yyyy")}</td>
										<td>{formatDateDisplay(item.updatedAt, "dd-MM-yyyy")}</td>
										{!args.isPublic && (
											<td className="dts-table__actions">
												{args.actions ? (
													args.actions(item)
												) : (
													<DataCollectionActionLinks
														ctx={ctx}
														route={route}
														id={item.id}
														//hideEditButton={!canEdit(item, user)}
														user={user}
														approvalStatus={item.approvalStatus}
													/>
												)}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
						{pagination}
					</>
				) : (
					<>
						{ctx.t({
							code: "record.none_found",
							desc: "Message displayed when no records are found",
							msg: "No records found",
						})}
					</>
				)}
			</section>
		</div>
	);
}
